import json
from typing import List
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.user import User
from app.models.attendance import FaceEmbedding, AttendanceRecord
from app.schemas.reports import StudentAttendanceReport
from app.api.deps import get_current_student
from app.core.config import settings
from app.core.audit import log_audit_event
from app.ai.detector import face_detector
from app.ai.imaging import decode_base64_image
from app.ai.recognizer import face_recognizer
from app.ai.quality import evaluate_face_quality
from app.services.attendance_calculator import calculate_student_full_report

import numpy as np

router = APIRouter()


class FaceRegistrationPayload(BaseModel):
    frames: List[str]  # 3 to 10 base64-encoded camera frames


class SingleFrameValidationPayload(BaseModel):
    image_base64: str


@router.get("/profile")
def get_student_profile(
    db: Session = Depends(get_db),
    current_student_user: User = Depends(get_current_student)
):
    """Return the profile and face registration status of the current student."""
    student = current_student_user.student_profile
    return {
        "id": student.id,
        "register_number": student.register_number,
        "full_name": student.full_name,
        "email": current_student_user.email,
        "department_id": student.department_id,
        "department_name": student.department.name if student.department else None,
        "class_id": student.class_id,
        "class_name": student.class_assigned.name if student.class_assigned else None,
        "face_registered": student.face_registered,
        "phone": student.phone
    }


@router.post("/validate-frame")
def validate_single_frame(
    payload: SingleFrameValidationPayload,
    current_student_user: User = Depends(get_current_student)
):
    """Check one camera frame before the student starts the real capture."""
    try:
        image = decode_base64_image(payload.image_base64)
    except Exception as exc:
        return {"valid": False, "message": str(exc)}

    detected = face_detector.detect_faces(image)
    if len(detected) == 0:
        return {"valid": False, "message": "No face detected. Please position your face inside the guide oval."}
    if len(detected) > 1:
        return {"valid": False, "message": "Multiple faces detected! Please ensure only you are visible."}

    face = detected[0]
    is_ok, quality_message = evaluate_face_quality(face["crop"])
    if not is_ok:
        return {"valid": False, "message": quality_message}

    return {
        "valid": True,
        "message": "Face clear & well-positioned. Ready to capture!",
        "box": face["box"],
        "score": round(face["score"], 3)
    }


def average_embeddings(embeddings: List[np.ndarray]) -> np.ndarray:
    """Average several face embeddings and keep the result a unit vector."""
    mean_embedding = np.mean(embeddings, axis=0)
    return mean_embedding / np.linalg.norm(mean_embedding)


def find_duplicate_face(db: Session, student_id: int, embedding: np.ndarray):
    """Return the other student whose registered face looks the same, if any.

    This stops one person from registering their face under two student IDs.
    """
    others = db.query(FaceEmbedding).filter(FaceEmbedding.student_id != student_id).all()

    for existing in others:
        try:
            existing_vector = np.array(json.loads(existing.embedding_vector), dtype=np.float32)
        except Exception:
            continue  # Ignore a stored embedding we cannot read.

        similarity = float(np.dot(embedding, existing_vector))
        if similarity >= settings.DUPLICATE_FACE_THRESHOLD:
            return existing.student, similarity

    return None, 0.0


@router.post("/register-face")
def register_student_face(
    payload: FaceRegistrationPayload,
    db: Session = Depends(get_db),
    current_student_user: User = Depends(get_current_student)
):
    """Store the biometric face template of the current student.

    Every frame is checked for exactly one clear face. The 512-D embeddings
    of the good frames are averaged, and the result is stored as the
    student's face template.
    """
    student = current_student_user.student_profile
    if not student:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student profile not found for current user account."
        )

    if len(payload.frames) < 3:
        raise HTTPException(
            status_code=400,
            detail="At least 3 clear facial frames are required for accurate registration."
        )

    valid_embeddings = []

    for index, frame_base64 in enumerate(payload.frames):
        try:
            image = decode_base64_image(frame_base64)
        except Exception:
            continue  # Skip a frame we cannot read.

        detected = face_detector.detect_faces(image)
        if len(detected) == 0:
            continue
        if len(detected) > 1:
            raise HTTPException(
                status_code=400,
                detail=f"Frame {index + 1} contains multiple faces. Please ensure only you are visible."
            )

        face = detected[0]
        height, width = face["crop"].shape[:2]
        if height < 30 or width < 30:
            continue

        valid_embeddings.append(face_recognizer.extract_embedding(face["aligned"]))

    if not valid_embeddings:
        raise HTTPException(
            status_code=400,
            detail="No clear face was detected in the captured frames. Please face the camera directly in good lighting and try again."
        )

    mean_embedding = average_embeddings(valid_embeddings)

    # 1-to-N biometric de-duplication: refuse a face that already belongs to
    # a different student account.
    conflicting_student, similarity = find_duplicate_face(db, student.id, mean_embedding)
    if conflicting_student is not None:
        log_audit_event(
            db,
            action="DUPLICATE_FACE_REGISTRATION_ATTEMPT",
            entity_type="Student",
            user_id=current_student_user.id,
            entity_id=student.id,
            details={
                "conflicting_student_id": conflicting_student.id,
                "conflicting_register_number": conflicting_student.register_number,
                "conflicting_name": conflicting_student.full_name,
                "similarity_score": round(similarity, 4)
            }
        )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Biometric Conflict: This facial identity is already registered to "
                f"student '{conflicting_student.full_name}' ({conflicting_student.register_number}) "
                f"with {round(similarity * 100, 1)}% match. "
                f"A person cannot register under multiple student IDs."
            )
        )

    # Replace any template this student had before.
    db.query(FaceEmbedding).filter(FaceEmbedding.student_id == student.id).delete()
    db.add(FaceEmbedding(
        student_id=student.id,
        embedding_vector=json.dumps(mean_embedding.tolist()),
        quality_score=0.98,
        model_name="ArcFace-512"
    ))
    student.face_registered = True
    db.commit()

    log_audit_event(
        db,
        action="REGISTER_STUDENT_FACE",
        entity_type="Student",
        user_id=current_student_user.id,
        entity_id=student.id,
        details={"samples_processed": len(valid_embeddings)}
    )

    return {
        "message": "Face registered successfully!",
        "face_registered": True,
        "valid_frames_used": len(valid_embeddings)
    }


@router.get("/my-attendance", response_model=StudentAttendanceReport)
def get_my_attendance(
    db: Session = Depends(get_db),
    current_student_user: User = Depends(get_current_student)
):
    """Return the attendance percentage, eligibility and fine status."""
    student = current_student_user.student_profile
    return calculate_student_full_report(db, student.id)


@router.get("/attendance-history")
def get_attendance_history(
    db: Session = Depends(get_db),
    current_student_user: User = Depends(get_current_student)
):
    """Return the individual lecture attendance entries of the student."""
    student = current_student_user.student_profile
    records = db.query(AttendanceRecord).filter(
        AttendanceRecord.student_id == student.id
    ).order_by(AttendanceRecord.timestamp.desc()).limit(100).all()

    return [
        {
            "id": record.id,
            "session_id": record.session_id,
            "subject_name": record.session.assignment.subject.name,
            "subject_code": record.session.assignment.subject.code,
            "teacher_name": record.session.teacher.full_name,
            "date": record.session.session_date,
            "timestamp": record.timestamp,
            "status": record.status.value,
            "verification_method": record.verification_method.value
        } for record in records
    ]
