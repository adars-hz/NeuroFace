import base64
import cv2
import numpy as np
import json
from datetime import datetime, timezone, timedelta, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.user import User, Student
from app.models.academic import Class, Subject, TeacherSubjectClassAssignment, AttendanceSlot
from app.models.attendance import (
    AttendanceSession, AttendanceRecord, FaceEmbedding,
    AttendanceSessionStatus, AttendanceStatus, VerificationMethod
)
from app.models.leave import LeaveApplication, LeaveStatus
from app.schemas.attendance import (
    StartSessionRequest, SessionOut, FrameProcessRequest,
    FrameProcessResponse, DetectedFaceResult, LiveSessionStats,
    ConsecutivePeriodSubmission, RosterBaselineResponse,
    StudentRosterItem, PriorSessionSummary, ConsecutivePeriodResult
)
from app.api.deps import get_current_teacher
from app.core.audit import log_audit_event
from app.ai.detector import face_detector
from app.ai.imaging import decode_base64_image
from app.ai.recognizer import face_recognizer
from app.ai.quality import evaluate_face_quality
from app.ai.anti_spoof import evaluate_face_authenticity
from app.ai.tracker import frame_tracker

router = APIRouter()


def as_utc(value: Optional[datetime]) -> Optional[datetime]:
    """Return a timezone-aware datetime (SQLite stores them without a zone)."""
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def mark_missing_students_absent(db: Session, session: AttendanceSession, marked_by: str) -> int:
    """Mark every enrolled student who has no record yet as ABSENT.

    Returns how many students were newly marked. Used both when a session
    ends and when a session quietly expires.
    """
    enrolled = db.query(Student).filter(Student.class_id == session.assignment.class_id).all()
    already_marked = {record.student_id for record in session.records}

    added = 0
    for student in enrolled:
        if student.id not in already_marked:
            db.add(AttendanceRecord(
                session_id=session.id,
                student_id=student.id,
                status=AttendanceStatus.ABSENT,
                verification_method=VerificationMethod.FACE_RECOGNITION,
                marked_by=marked_by
            ))
            added += 1
    return added


def auto_expire_stale_sessions(db: Session) -> None:
    """Close sessions whose end time has passed and mark absent students."""
    now_utc = datetime.now(timezone.utc)

    active_sessions = db.query(AttendanceSession).filter(
        AttendanceSession.status == AttendanceSessionStatus.ACTIVE
    ).all()

    changed = False
    for session in active_sessions:
        end_time = as_utc(session.end_time)
        if end_time is not None and end_time < now_utc:
            session.status = AttendanceSessionStatus.EXPIRED
            mark_missing_students_absent(db, session, "Auto Expire")
            changed = True

    if changed:
        db.commit()


def decode_image(image_base64: str) -> np.ndarray:
    """Turn a base64 (optionally data-URL) encoded picture into a BGR array."""
    return decode_base64_image(image_base64)


@router.post("/sessions/start", response_model=SessionOut)
def start_attendance_session(
    req: StartSessionRequest,
    db: Session = Depends(get_db),
    current_teacher_user: User = Depends(get_current_teacher)
):
    """Start an attendance session for a subject and class the teacher teaches."""
    auto_expire_stale_sessions(db)
    teacher = current_teacher_user.teacher_profile

    # 1. The teacher must actually be assigned to this subject and class.
    assignment = db.query(TeacherSubjectClassAssignment).filter(
        TeacherSubjectClassAssignment.id == req.assignment_id,
        TeacherSubjectClassAssignment.teacher_id == teacher.id
    ).first()
    if not assignment:
        raise HTTPException(
            status_code=403,
            detail="Unauthorized: You are not assigned to this subject and class."
        )

    # 2. A class can only have one live session at a time.
    overlap = db.query(AttendanceSession)\
        .join(TeacherSubjectClassAssignment, AttendanceSession.assignment_id == TeacherSubjectClassAssignment.id)\
        .filter(
            TeacherSubjectClassAssignment.class_id == assignment.class_id,
            AttendanceSession.status == AttendanceSessionStatus.ACTIVE
        ).first()
    if overlap:
        raise HTTPException(
            status_code=400,
            detail={
                "message": f"Class '{assignment.class_assigned.name}' already has an active attendance session ({overlap.assignment.subject.name}).",
                "active_session_id": overlap.id
            }
        )

    # 3. Create the session.
    start_time = datetime.now(timezone.utc)

    # Prevent starting a session in the future relative to current time.
    # Since we use date.today() and current time, this is generally safe,
    # but we ensure the session date isn't in the future.
    session_date = date.today()
    if session_date > date.today():
        raise HTTPException(status_code=400, detail="Cannot start a session for a future date.")

    session = AttendanceSession(
        assignment_id=assignment.id,
        teacher_id=teacher.id,
        slot_id=req.slot_id,
        session_date=session_date,
        start_time=start_time,
        end_time=start_time + timedelta(minutes=req.duration_minutes),
        status=AttendanceSessionStatus.ACTIVE
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    log_audit_event(
        db,
        action="START_ATTENDANCE_SESSION",
        entity_type="AttendanceSession",
        user_id=current_teacher_user.id,
        entity_id=session.id,
        details={
            "subject": assignment.subject.name,
            "class": assignment.class_assigned.name,
            "duration_minutes": req.duration_minutes
        }
    )

    total_enrolled = db.query(Student).filter(Student.class_id == assignment.class_id).count()

    return SessionOut(
        id=session.id,
        assignment_id=session.assignment_id,
        teacher_id=session.teacher_id,
        teacher_name=teacher.full_name,
        subject_id=assignment.subject_id,
        subject_name=assignment.subject.name,
        subject_code=assignment.subject.code,
        class_id=assignment.class_id,
        class_name=assignment.class_assigned.name,
        slot_id=session.slot_id,
        slot_name=session.slot.name if session.slot else "On-Demand Session",
        session_date=session.session_date,
        start_time=session.start_time,
        end_time=session.end_time,
        status=session.status,
        total_enrolled=total_enrolled,
        present_count=0
    )


@router.get("/sessions/{id}/live-stats", response_model=LiveSessionStats)
def get_live_session_stats(
    id: int,
    db: Session = Depends(get_db),
    current_teacher_user: User = Depends(get_current_teacher)
):
    """Return live statistics for an attendance session."""
    session = db.query(AttendanceSession).filter(AttendanceSession.id == id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    now = datetime.now(timezone.utc)
    session_end = as_utc(session.end_time)

    # A session whose time is up is closed on the spot.
    if session.status == AttendanceSessionStatus.ACTIVE and session_end < now:
        session.status = AttendanceSessionStatus.EXPIRED
        db.commit()

    total_enrolled = db.query(Student).filter(Student.class_id == session.assignment.class_id).count()
    present_count = db.query(AttendanceRecord).filter(
        AttendanceRecord.session_id == session.id,
        AttendanceRecord.status == AttendanceStatus.PRESENT
    ).count()
    absent_count = max(0, total_enrolled - present_count)

    time_remaining = 0
    if session.status == AttendanceSessionStatus.ACTIVE:
        time_remaining = max(0, int((session_end - now).total_seconds()))

    return LiveSessionStats(
        session_id=session.id,
        status=session.status,
        subject_name=session.assignment.subject.name,
        subject_code=session.assignment.subject.code,
        class_name=session.assignment.class_assigned.name,
        teacher_name=session.teacher.full_name,
        start_time=session.start_time,
        end_time=session.end_time,
        time_remaining_seconds=time_remaining,
        total_enrolled=total_enrolled,
        present_count=present_count,
        absent_count=absent_count,
        unknown_detections=0
    )


@router.post("/sessions/{id}/process-frame", response_model=FrameProcessResponse)
def process_camera_frame(
    id: int,
    req: FrameProcessRequest,
    db: Session = Depends(get_db),
    current_teacher_user: User = Depends(get_current_teacher)
):
    """Look at one classroom camera frame and mark the students we recognise.

    The steps are:
      1. Decode the picture and find every face in it (MTCNN).
      2. Skip faces that are too small, blurry or badly lit.
      3. Turn each good face into a 512-D embedding (ArcFace).
      4. Match it against the students of this class.
      5. Wait for a second confirming frame before recording attendance.
    """
    session = db.query(AttendanceSession).filter(AttendanceSession.id == id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Attendance session not found")
    if session.status != AttendanceSessionStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="This attendance session is no longer active.")

    try:
        frame = decode_image(req.image_base64)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid image data: {str(exc)}")

    # Collect the faces we know: students of this class who registered a face.
    enrolled_students = db.query(Student).filter(
        Student.class_id == session.assignment.class_id,
        Student.face_registered == True
    ).all()

    registered_pool = []
    student_lookup = {}
    for student in enrolled_students:
        student_lookup[student.id] = student
        for embedding in student.embeddings:
            try:
                vector = np.array(json.loads(embedding.embedding_vector), dtype=np.float32)
                registered_pool.append({"student_id": student.id, "embedding": vector})
            except Exception:
                continue

    # Students already marked present in this session.
    already_marked_ids = set(
        row[0] for row in db.query(AttendanceRecord.student_id).filter(
            AttendanceRecord.session_id == session.id,
            AttendanceRecord.status == AttendanceStatus.PRESENT
        ).all()
    )

    detected_faces = face_detector.detect_faces(frame)

    face_results: List[DetectedFaceResult] = []
    newly_marked_count = 0
    recognized_count = 0
    unknown_count = 0
    has_spoof_in_frame = False

    # Pass 1: Check authenticity across all detected faces to catch any spoofing attempts in the scene
    evaluated_faces = []
    for detected in detected_faces:
        box = detected["box"]
        crop = detected["crop"]

        # 1. Anti-Spoofing & Non-Face Object Filter
        is_authentic, auth_status, auth_reason = evaluate_face_authenticity(
            full_frame=frame,
            box=box,
            crop_bgr=crop,
            landmarks=detected.get("landmarks"),
            detection_score=detected["score"]
        )

        if not is_authentic and auth_status == "SPOOF_DETECTED":
            has_spoof_in_frame = True

        evaluated_faces.append({
            "detected": detected,
            "is_authentic": is_authentic,
            "auth_status": auth_status,
            "auth_reason": auth_reason
        })

    # Pass 2: Process faces
    for item in evaluated_faces:
        detected = item["detected"]
        box = detected["box"]
        aligned = detected["aligned"]
        crop = detected["crop"]
        is_authentic = item["is_authentic"]
        auth_status = item["auth_status"]

        if not is_authentic:
            if auth_status == "NON_FACE_OBJECT":
                # User asked: "if the camera finds any other objects don't detect"
                # Silently ignore random objects (do not draw or recognize)
                continue
            elif auth_status == "SPOOF_DETECTED":
                # User asked: "it also detecting face from phone ... don't detect"
                # Reject phone/screen display presentations
                face_results.append(DetectedFaceResult(
                    box=box,
                    confidence=round(detected["score"], 3),
                    status="SPOOF_DETECTED",
                    message="PHONE / IMAGE DETECTED - REJECTED"
                ))
                continue
            else:
                face_results.append(DetectedFaceResult(
                    box=box,
                    confidence=round(detected["score"], 3),
                    status="LOW_QUALITY"
                ))
                continue

        # If session is locked out, authentic faces continue to recognition and are held in CONFIRMING state without false spoof rejection

        # 2. Quality check (allows genuine faces in variable ambient lighting to proceed)
        is_quality_ok, quality_msg = evaluate_face_quality(crop)
        if not is_quality_ok and detected["score"] < 0.65:
            face_results.append(DetectedFaceResult(
                box=box,
                confidence=round(detected["score"], 3),
                status="LOW_QUALITY",
                message=quality_msg
            ))
            continue

        # 3 + 4. Embed the face and match it against the registered students.
        query_embedding = face_recognizer.extract_embedding(aligned)
        matched_id, confidence, match_status = face_recognizer.match_face(query_embedding, registered_pool)

        if match_status != "MATCHED" or matched_id not in student_lookup:
            unknown_count += 1
            face_results.append(DetectedFaceResult(
                box=box,
                confidence=round(confidence, 4),
                status="UNKNOWN"
            ))
            continue

        student = student_lookup[matched_id]
        recognized_count += 1

        if matched_id in already_marked_ids:
            status_label = "ALREADY_MARKED"
            face_message = None
        else:
            # 5. The student must be seen in consecutive clean frames with verified 3D micro-movement.
            confirmed, is_live_temporal, temporal_reason = frame_tracker.record_hit(
                session.id,
                matched_id,
                landmarks=detected.get("landmarks"),
                aligned_crop=aligned
            )

            if not is_live_temporal:
                # Static photo or mobile device image detected temporally!
                # Reject and do NOT mark attendance!
                face_results.append(DetectedFaceResult(
                    box=box,
                    confidence=round(confidence, 4),
                    status="SPOOF_DETECTED",
                    message="PHONE / IMAGE DETECTED - REJECTED"
                ))
                continue
            elif not confirmed:
                status_label = "CONFIRMING"
                face_message = temporal_reason
            else:
                existing_record = db.query(AttendanceRecord).filter(
                    AttendanceRecord.session_id == session.id,
                    AttendanceRecord.student_id == matched_id
                ).first()

                if existing_record:
                    status_label = "ALREADY_MARKED"
                    face_message = None
                else:
                    db.add(AttendanceRecord(
                        session_id=session.id,
                        student_id=matched_id,
                        status=AttendanceStatus.PRESENT,
                        confidence_score=round(confidence, 4),
                        verification_method=VerificationMethod.FACE_RECOGNITION,
                        marked_by="NeuroFace AI Camera"
                    ))
                    db.commit()
                    already_marked_ids.add(matched_id)
                    newly_marked_count += 1
                    status_label = "MATCHED"
                    face_message = None

        face_results.append(DetectedFaceResult(
            box=box,
            student_id=student.id,
            student_name=student.full_name,
            register_number=student.register_number,
            confidence=round(confidence, 4),
            status=status_label,
            message=face_message
        ))

    return FrameProcessResponse(
        session_id=session.id,
        total_detected=len(detected_faces),
        recognized_count=recognized_count,
        unknown_count=unknown_count,
        newly_marked_count=newly_marked_count,
        total_present=len(already_marked_ids),
        faces=face_results
    )


@router.delete("/sessions/{id}/records/{record_id}")
def reset_attendance_record(
    id: int,
    record_id: int,
    db: Session = Depends(get_db),
    current_teacher_user: User = Depends(get_current_teacher)
):
    """Teacher manually revokes/resets an attendance record (e.g. accidental or false positive hit)."""
    session = db.query(AttendanceSession).filter(AttendanceSession.id == id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Attendance session not found")

    teacher = current_teacher_user.teacher_profile
    if session.teacher_id != teacher.id and not teacher.is_hod and current_teacher_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Unauthorized to modify records for this session")

    record = db.query(AttendanceRecord).filter(
        AttendanceRecord.id == record_id,
        AttendanceRecord.session_id == id
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="Attendance record not found in this session")

    student_id = record.student_id
    student_name = record.student.full_name if record.student else f"Student #{student_id}"

    # Clear from temporal confirmation buffer so it won't instantly re-confirm
    frame_tracker.clear_student(session.id, student_id)

    db.delete(record)
    db.commit()

    log_audit_event(
        db,
        action="REVOKE_ATTENDANCE_RECORD",
        entity_type="AttendanceRecord",
        user_id=current_teacher_user.id,
        entity_id=record_id,
        details={
            "session_id": id,
            "student_id": student_id,
            "student_name": student_name,
            "reason": "Teacher manual reset"
        }
    )

    return {
        "message": f"Attendance record for {student_name} has been reset/revoked.",
        "record_id": record_id,
        "student_id": student_id
    }


@router.post("/sessions/{id}/complete")
def complete_attendance_session(
    id: int,
    db: Session = Depends(get_db),
    current_teacher_user: User = Depends(get_current_teacher)
):
    """Finish a session and mark everyone who was not seen as ABSENT."""
    session = db.query(AttendanceSession).filter(AttendanceSession.id == id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.status = AttendanceSessionStatus.COMPLETED
    session.end_time = datetime.now(timezone.utc)

    total_enrolled = db.query(Student).filter(Student.class_id == session.assignment.class_id).count()
    present_count = len({record.student_id for record in session.records})
    mark_missing_students_absent(db, session, "Auto Finalize")
    db.commit()
    frame_tracker.clear_session(session.id)

    log_audit_event(
        db,
        action="COMPLETE_ATTENDANCE_SESSION",
        entity_type="AttendanceSession",
        user_id=current_teacher_user.id,
        entity_id=session.id,
        details={"present_count": present_count, "total_enrolled": total_enrolled}
    )

    return {"message": "Attendance session completed successfully"}


# ----------------- SMART CONSECUTIVE PERIOD ATTENDANCE (NO CAMERA NEEDED) -----------------

@router.get("/roster-baseline", response_model=RosterBaselineResponse)
def get_roster_baseline(
    assignment_id: int,
    session_date: Optional[date] = None,
    clone_session_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_teacher_user: User = Depends(get_current_teacher)
):
    """
    Get student roster for a class with smart baseline:
    - Pre-populates all enrolled students
    - Checks approved leaves for the given date (defaults to today)
    - If clone_session_id is provided, inherits the exact attendance status from that prior session
    - Returns prior sessions of today for this class so teacher can easily clone
    """
    teacher = current_teacher_user.teacher_profile
    assignment = db.query(TeacherSubjectClassAssignment).filter(
        TeacherSubjectClassAssignment.id == assignment_id
    ).first()

    if not assignment:
        raise HTTPException(status_code=404, detail="Course assignment not found.")

    if assignment.teacher_id != teacher.id and not teacher.is_hod and current_teacher_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Unauthorized: You are not assigned to this course.")

    target_date = session_date or date.today()

    # 1. Fetch all students in this class
    students = db.query(Student).filter(Student.class_id == assignment.class_id).order_by(Student.register_number).all()

    # 2. Check approved leaves for target_date
    approved_leaves = db.query(LeaveApplication).filter(
        LeaveApplication.status == LeaveStatus.APPROVED,
        LeaveApplication.start_date <= target_date,
        LeaveApplication.end_date >= target_date
    ).all()
    leave_map = {}
    for leave in approved_leaves:
        if leave.subject_id is None or leave.subject_id == assignment.subject_id:
            leave_map[leave.student_id] = leave.reason

    # 3. If clone_session_id is provided, fetch existing records from that session
    cloned_status_map = {}
    if clone_session_id:
        clone_records = db.query(AttendanceRecord).filter(
            AttendanceRecord.session_id == clone_session_id
        ).all()
        for r in clone_records:
            cloned_status_map[r.student_id] = r.status

    # 4. Build roster items
    roster = []
    for s in students:
        is_on_leave = s.id in leave_map
        leave_reason = leave_map.get(s.id)

        if clone_session_id and s.id in cloned_status_map:
            st = cloned_status_map[s.id]
        elif is_on_leave:
            st = AttendanceStatus.ABSENT
        else:
            st = AttendanceStatus.PRESENT

        roster.append(StudentRosterItem(
            student_id=s.id,
            full_name=s.full_name,
            register_number=s.register_number,
            face_registered=s.face_registered,
            status=st,
            on_leave=is_on_leave,
            leave_reason=leave_reason
        ))

    # 5. Fetch prior sessions completed on target_date for this class
    prior_sessions = db.query(AttendanceSession).join(
        TeacherSubjectClassAssignment,
        AttendanceSession.assignment_id == TeacherSubjectClassAssignment.id
    ).filter(
        TeacherSubjectClassAssignment.class_id == assignment.class_id,
        AttendanceSession.session_date == target_date
    ).order_by(AttendanceSession.start_time.asc()).all()

    prior_summaries = []
    for ps in prior_sessions:
        p_count = db.query(AttendanceRecord).filter(
            AttendanceRecord.session_id == ps.id,
            AttendanceRecord.status == AttendanceStatus.PRESENT
        ).count()
        a_count = db.query(AttendanceRecord).filter(
            AttendanceRecord.session_id == ps.id,
            AttendanceRecord.status == AttendanceStatus.ABSENT
        ).count()
        prior_summaries.append(PriorSessionSummary(
            id=ps.id,
            slot_id=ps.slot_id,
            slot_name=ps.slot.name if ps.slot else "On-Demand",
            subject_name=ps.assignment.subject.name if ps.assignment and ps.assignment.subject else "Class Session",
            start_time=ps.start_time,
            present_count=p_count,
            absent_count=a_count
        ))

    return RosterBaselineResponse(
        assignment_id=assignment.id,
        subject_name=assignment.subject.name,
        class_name=assignment.class_assigned.name,
        date=target_date,
        students=roster,
        prior_sessions_today=prior_summaries
    )


@router.post("/consecutive-periods", response_model=ConsecutivePeriodResult)
def submit_consecutive_periods_attendance(
    req: ConsecutivePeriodSubmission,
    db: Session = Depends(get_db),
    current_teacher_user: User = Depends(get_current_teacher)
):
    """
    Teacher records attendance for 1 or more consecutive timetable periods/slots in one go!
    Solves the 'no classroom camera' and 'hourly time consumption' pain point.
    """
    teacher = current_teacher_user.teacher_profile
    assignment = db.query(TeacherSubjectClassAssignment).filter(
        TeacherSubjectClassAssignment.id == req.assignment_id
    ).first()

    if not assignment:
        raise HTTPException(status_code=404, detail="Course assignment not found.")

    if assignment.teacher_id != teacher.id and not teacher.is_hod and current_teacher_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Unauthorized: You are not assigned to this course.")

    if not req.slot_ids:
        raise HTTPException(status_code=400, detail="Please select at least one timetable period/slot.")

    target_date = req.session_date or date.today()
    if target_date > date.today():
        raise HTTPException(status_code=400, detail="Cannot record attendance for a future date.")

    # Validate slots exist
    slots = db.query(AttendanceSlot).filter(AttendanceSlot.id.in_(req.slot_ids)).all()
    slot_map = {s.id: s for s in slots}

    created_session_ids = []
    now = datetime.now(timezone.utc)

    present_cnt = sum(1 for r in req.records if r.status == AttendanceStatus.PRESENT)
    absent_cnt = sum(1 for r in req.records if r.status == AttendanceStatus.ABSENT)

    for slot_id in req.slot_ids:
        slot = slot_map.get(slot_id)

        # Determine start/end times based on slot or current time
        if slot and slot.start_time and slot.end_time:
            start_dt = datetime.combine(target_date, slot.start_time).replace(tzinfo=timezone.utc)
            end_dt = datetime.combine(target_date, slot.end_time).replace(tzinfo=timezone.utc)
        else:
            start_dt = now
            end_dt = now + timedelta(minutes=60)

        # Check if an existing session exists for this assignment, slot, and date
        existing_session = db.query(AttendanceSession).filter(
            AttendanceSession.assignment_id == assignment.id,
            AttendanceSession.slot_id == slot_id,
            AttendanceSession.session_date == target_date
        ).first()

        if existing_session:
            session = existing_session
            session.status = AttendanceSessionStatus.COMPLETED
            session.end_time = end_dt
            db.query(AttendanceRecord).filter(AttendanceRecord.session_id == session.id).delete()
        else:
            session = AttendanceSession(
                assignment_id=assignment.id,
                teacher_id=teacher.id,
                slot_id=slot_id,
                session_date=target_date,
                start_time=start_dt,
                end_time=end_dt,
                status=AttendanceSessionStatus.COMPLETED
            )
            db.add(session)
            db.flush()

        created_session_ids.append(session.id)

        for rec in req.records:
            db.add(AttendanceRecord(
                session_id=session.id,
                student_id=rec.student_id,
                status=rec.status,
                verification_method=VerificationMethod.MANUAL_OVERRIDE,
                marked_by=f"{teacher.full_name} (Manual Period Entry)"
            ))

    db.commit()

    log_audit_event(
        db,
        action="MARK_CONSECUTIVE_ATTENDANCE",
        entity_type="AttendanceSession",
        user_id=current_teacher_user.id,
        entity_id=created_session_ids[0] if created_session_ids else 0,
        details={
            "subject": assignment.subject.name,
            "class": assignment.class_assigned.name,
            "slots": [slot_map[sid].name if sid in slot_map else str(sid) for sid in req.slot_ids],
            "total_periods": len(req.slot_ids),
            "present_count": present_cnt,
            "absent_count": absent_cnt,
            "remarks": req.remarks
        }
    )

    return ConsecutivePeriodResult(
        message=f"Successfully recorded attendance for {len(req.slot_ids)} period(s) ({assignment.subject.name} - {assignment.class_assigned.name}).",
        total_periods_marked=len(req.slot_ids),
        session_ids=created_session_ids,
        present_count=present_cnt,
        absent_count=absent_cnt,
        total_students=len(req.records)
    )

