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
from app.schemas.attendance import (
    StartSessionRequest, SessionOut, FrameProcessRequest,
    FrameProcessResponse, DetectedFaceResult, LiveSessionStats
)
from app.api.deps import get_current_teacher
from app.core.audit import log_audit_event
from app.ai.detector import face_detector
from app.ai.imaging import decode_base64_image
from app.ai.recognizer import face_recognizer
from app.ai.quality import evaluate_face_quality
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

    for detected in detected_faces:
        box = detected["box"]
        aligned = detected["aligned"]
        crop = detected["crop"]

        # 2. Quality check
        is_quality_ok, _ = evaluate_face_quality(crop)
        if not is_quality_ok:
            face_results.append(DetectedFaceResult(
                box=box,
                confidence=detected["score"],
                status="LOW_QUALITY"
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
        else:
            # 5. The student must be seen in a second frame before we record it.
            confirmed = frame_tracker.record_hit(session.id, matched_id)
            if not confirmed:
                status_label = "CONFIRMING"
            else:
                existing_record = db.query(AttendanceRecord).filter(
                    AttendanceRecord.session_id == session.id,
                    AttendanceRecord.student_id == matched_id
                ).first()

                if existing_record:
                    status_label = "ALREADY_MARKED"
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

        face_results.append(DetectedFaceResult(
            box=box,
            student_id=student.id,
            student_name=student.full_name,
            register_number=student.register_number,
            confidence=round(confidence, 4),
            status=status_label
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
