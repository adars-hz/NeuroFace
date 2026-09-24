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
from app.ai.recognizer import face_recognizer
from app.ai.quality import evaluate_face_quality
from app.ai.tracker import frame_tracker

router = APIRouter()

def auto_expire_stale_sessions(db: Session):
    """Check for active sessions that have exceeded their scheduled end time and mark them EXPIRED."""
    now = datetime.now(timezone.utc)
    stale_sessions = db.query(AttendanceSession).filter(
        AttendanceSession.status == AttendanceSessionStatus.ACTIVE,
        AttendanceSession.end_time < now
    ).all()

    for s in stale_sessions:
        s.status = AttendanceSessionStatus.EXPIRED
        # Mark unrecorded enrolled students as ABSENT
        enrolled_students = db.query(Student).filter(Student.class_id == s.assignment.class_id).all()
        marked_ids = {r.student_id for r in s.records}
        for stu in enrolled_students:
            if stu.id not in marked_ids:
                db.add(AttendanceRecord(
                    session_id=s.id,
                    student_id=stu.id,
                    status=AttendanceStatus.ABSENT,
                    verification_method=VerificationMethod.FACE_RECOGNITION,
                    marked_by="System Expiry"
                ))
    if stale_sessions:
        db.commit()

@router.post("/sessions/start", response_model=SessionOut)
def start_attendance_session(
    req: StartSessionRequest,
    db: Session = Depends(get_db),
    current_teacher_user: User = Depends(get_current_teacher)
):
    """
    Start an attendance session for an assigned subject and class.
    Enforces that teacher is assigned, and checks for overlapping active sessions for this class.
    """
    auto_expire_stale_sessions(db)
    teacher = current_teacher_user.teacher_profile

    # 1. Verify assignment belongs to this teacher
    assignment = db.query(TeacherSubjectClassAssignment).filter(
        TeacherSubjectClassAssignment.id == req.assignment_id,
        TeacherSubjectClassAssignment.teacher_id == teacher.id
    ).first()
    if not assignment:
        raise HTTPException(
            status_code=403,
            detail="Unauthorized: You are not assigned to this subject and class."
        )

    # 2. Check for overlapping active sessions for the same class
    overlap = db.query(AttendanceSession)\
        .join(TeacherSubjectClassAssignment, AttendanceSession.assignment_id == TeacherSubjectClassAssignment.id)\
        .filter(
            TeacherSubjectClassAssignment.class_id == assignment.class_id,
            AttendanceSession.status == AttendanceSessionStatus.ACTIVE
        ).first()
    if overlap:
        raise HTTPException(
            status_code=400,
            detail=f"Class '{assignment.class_assigned.name}' already has an active attendance session ({overlap.assignment.subject.name})."
        )

    # 3. Calculate start and end times
    start_time = datetime.now(timezone.utc)
    end_time = start_time + timedelta(minutes=req.duration_minutes)

    session = AttendanceSession(
        assignment_id=assignment.id,
        teacher_id=teacher.id,
        slot_id=req.slot_id,
        session_date=date.today(),
        start_time=start_time,
        end_time=end_time,
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
    """Retrieve real-time statistics for an active attendance session."""
    session = db.query(AttendanceSession).filter(AttendanceSession.id == id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    now = datetime.now(timezone.utc)
    if session.status == AttendanceSessionStatus.ACTIVE and session.end_time < now:
        session.status = AttendanceSessionStatus.EXPIRED
        db.commit()

    total_enrolled = db.query(Student).filter(Student.class_id == session.assignment.class_id).count()
    present_count = db.query(AttendanceRecord).filter(
        AttendanceRecord.session_id == session.id,
        AttendanceRecord.status == AttendanceStatus.PRESENT
    ).count()
    absent_count = max(0, total_enrolled - present_count)

    time_remaining = max(0, int((session.end_time - now).total_seconds())) if session.status == AttendanceSessionStatus.ACTIVE else 0

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
    """
    Process a single classroom camera frame:
    1. MTCNN multi-face detection & 5-point alignment.
    2. Quality validation (minimum size, blur, lighting).
    3. ArcFace 512-D embedding extraction.
    4. Cosine similarity matching with unknown face rejection.
    5. Temporal multi-frame confirmation buffer.
    6. Duplicate attendance check before database insertion.
    """
    session = db.query(AttendanceSession).filter(AttendanceSession.id == id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Attendance session not found")
    if session.status != AttendanceSessionStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="This attendance session is no longer active.")

    # Decode base64 image
    try:
        header, encoded = req.image_base64.split(",", 1) if "," in req.image_base64 else ("", req.image_base64)
        image_bytes = base64.b64decode(encoded)
        np_arr = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if frame is None:
            raise ValueError("Empty image")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image data: {str(e)}")

    # Load enrolled students and their registered embeddings for this class
    enrolled_students = db.query(Student).filter(
        Student.class_id == session.assignment.class_id,
        Student.face_registered == True
    ).all()

    registered_pool = []
    student_lookup = {}
    for stu in enrolled_students:
        student_lookup[stu.id] = stu
        for emb in stu.embeddings:
            try:
                vec = np.array(json.loads(emb.embedding_vector), dtype=np.float32)
                registered_pool.append({
                    "student_id": stu.id,
                    "embedding": vec
                })
            except Exception:
                continue

    # Query students already marked present in this session
    already_marked_ids = set(
        r[0] for r in db.query(AttendanceRecord.student_id).filter(
            AttendanceRecord.session_id == session.id,
            AttendanceRecord.status == AttendanceStatus.PRESENT
        ).all()
    )

    # 1. Detect faces in frame via MTCNN
    detected_faces = face_detector.detect_faces(frame)

    face_results: List[DetectedFaceResult] = []
    newly_marked_count = 0
    recognized_count = 0
    unknown_count = 0

    for f in detected_faces:
        box = f["box"]
        aligned = f["aligned"]
        crop = f["crop"]

        # Quality check
        is_quality_ok, quality_msg = evaluate_face_quality(crop)
        if not is_quality_ok:
            face_results.append(DetectedFaceResult(
                box=box,
                confidence=f["score"],
                status="LOW_QUALITY"
            ))
            continue

        # Extract 512-D embedding
        query_emb = face_recognizer.extract_embedding(aligned)

        # Match against registered pool
        matched_id, confidence, match_status = face_recognizer.match_face(query_emb, registered_pool)

        if match_status == "MATCHED" and matched_id in student_lookup:
            student = student_lookup[matched_id]
            recognized_count += 1

            if matched_id in already_marked_ids:
                status_label = "ALREADY_MARKED"
            else:
                # Temporal multi-frame confirmation
                confirmed = frame_tracker.record_hit(session.id, matched_id)
                if confirmed:
                    # Mark attendance in database (preventing duplicates via UNIQUE constraint)
                    existing_record = db.query(AttendanceRecord).filter(
                        AttendanceRecord.session_id == session.id,
                        AttendanceRecord.student_id == matched_id
                    ).first()

                    if not existing_record:
                        rec = AttendanceRecord(
                            session_id=session.id,
                            student_id=matched_id,
                            status=AttendanceStatus.PRESENT,
                            confidence_score=round(confidence, 4),
                            verification_method=VerificationMethod.FACE_RECOGNITION,
                            marked_by="NeuroFace AI Camera"
                        )
                        db.add(rec)
                        db.commit()
                        already_marked_ids.add(matched_id)
                        newly_marked_count += 1
                        status_label = "MATCHED"
                    else:
                        status_label = "ALREADY_MARKED"
                else:
                    status_label = "CONFIRMING"

            face_results.append(DetectedFaceResult(
                box=box,
                student_id=student.id,
                student_name=student.full_name,
                register_number=student.register_number,
                confidence=round(confidence, 4),
                status=status_label
            ))
        else:
            unknown_count += 1
            face_results.append(DetectedFaceResult(
                box=box,
                confidence=round(confidence, 4),
                status="UNKNOWN"
            ))

    total_present = len(already_marked_ids)

    return FrameProcessResponse(
        session_id=session.id,
        total_detected=len(detected_faces),
        recognized_count=recognized_count,
        unknown_count=unknown_count,
        newly_marked_count=newly_marked_count,
        total_present=total_present,
        faces=face_results
    )

@router.post("/sessions/{id}/complete")
def complete_attendance_session(
    id: int,
    db: Session = Depends(get_db),
    current_teacher_user: User = Depends(get_current_teacher)
):
    """Complete an attendance session and automatically mark remaining enrolled students as ABSENT."""
    session = db.query(AttendanceSession).filter(AttendanceSession.id == id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.status = AttendanceSessionStatus.COMPLETED
    session.end_time = datetime.now(timezone.utc)

    # Mark remaining enrolled students as ABSENT
    enrolled_students = db.query(Student).filter(Student.class_id == session.assignment.class_id).all()
    marked_student_ids = {r.student_id for r in session.records}

    for stu in enrolled_students:
        if stu.id not in marked_student_ids:
            db.add(AttendanceRecord(
                session_id=session.id,
                student_id=stu.id,
                status=AttendanceStatus.ABSENT,
                verification_method=VerificationMethod.FACE_RECOGNITION,
                marked_by="Auto Finalize"
            ))

    db.commit()
    frame_tracker.clear_session(session.id)

    log_audit_event(
        db,
        action="COMPLETE_ATTENDANCE_SESSION",
        entity_type="AttendanceSession",
        user_id=current_teacher_user.id,
        entity_id=session.id,
        details={"present_count": len(marked_student_ids), "total_enrolled": len(enrolled_students)}
    )

    return {"message": "Attendance session completed successfully"}
