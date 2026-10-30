import json
from typing import List
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.user import User
from app.models.attendance import FaceEmbedding, AttendanceRecord
from app.models.approval import FaceReRegistrationRequest, ApprovalStatus
from app.schemas.reports import StudentAttendanceReport
from app.schemas.approval import FaceReRegistrationCreate
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


@router.get("/face-re-registration-status")
def get_face_re_registration_status(
    db: Session = Depends(get_db),
    current_student_user: User = Depends(get_current_student)
):
    """Check whether the student is allowed to capture and register their face,
    and returns details on any pending or approved re-registration request."""
    student = current_student_user.student_profile
    if not student:
        raise HTTPException(status_code=400, detail="Student profile not found.")

    if not student.face_registered:
        return {
            "face_registered": False,
            "can_register": True,
            "has_pending_request": False,
            "latest_request": None
        }

    latest_req = db.query(FaceReRegistrationRequest).filter(
        FaceReRegistrationRequest.student_id == student.id
    ).order_by(FaceReRegistrationRequest.created_at.desc()).first()

    can_register = False
    has_pending = False
    req_data = None

    if latest_req:
        reviewer_name = None
        if latest_req.reviewed_by:
            if latest_req.reviewed_by.teacher_profile:
                t = latest_req.reviewed_by.teacher_profile
                role_tag = "HOD" if t.is_hod else "Faculty"
                reviewer_name = f"{t.full_name} ({role_tag})"
            else:
                reviewer_name = f"{latest_req.reviewed_by.username} (Admin)"

        req_data = {
            "id": latest_req.id,
            "status": latest_req.status.value,
            "reason": latest_req.reason,
            "reviewed_by_id": latest_req.reviewed_by_id,
            "reviewed_by_name": reviewer_name,
            "reviewed_at": latest_req.reviewed_at.isoformat() if latest_req.reviewed_at else None,
            "admin_remarks": latest_req.admin_remarks,
            "is_used": latest_req.is_used,
            "created_at": latest_req.created_at.isoformat() if latest_req.created_at else None
        }

        if latest_req.status == ApprovalStatus.PENDING:
            has_pending = True
            can_register = False
        elif latest_req.status == ApprovalStatus.APPROVED and not latest_req.is_used:
            can_register = True
        else:
            can_register = False

    return {
        "face_registered": True,
        "can_register": can_register,
        "has_pending_request": has_pending,
        "latest_request": req_data
    }


@router.post("/request-face-re-registration")
def request_face_re_registration(
    payload: FaceReRegistrationCreate,
    db: Session = Depends(get_db),
    current_student_user: User = Depends(get_current_student)
):
    """Student submits a request to re-register their face.
    Requires approval from Admin or HOD before new biometric capture is unlocked."""
    student = current_student_user.student_profile
    if not student:
        raise HTTPException(status_code=400, detail="Student profile not found.")

    if not student.face_registered:
        raise HTTPException(
            status_code=400,
            detail="Your face is not registered yet. You can perform initial face registration directly without requiring approval."
        )

    pending_req = db.query(FaceReRegistrationRequest).filter(
        FaceReRegistrationRequest.student_id == student.id,
        FaceReRegistrationRequest.status == ApprovalStatus.PENDING
    ).first()
    if pending_req:
        raise HTTPException(
            status_code=400,
            detail="You already have a pending re-registration request awaiting approval from your HOD or Admin."
        )

    approved_req = db.query(FaceReRegistrationRequest).filter(
        FaceReRegistrationRequest.student_id == student.id,
        FaceReRegistrationRequest.status == ApprovalStatus.APPROVED,
        FaceReRegistrationRequest.is_used == False
    ).first()
    if approved_req:
        return {
            "message": "You already have an approved re-registration permission. You can proceed with face registration.",
            "status": "APPROVED",
            "request_id": approved_req.id
        }

    reason_text = payload.reason.strip() if payload.reason else "Recalibration / appearance update"
    new_req = FaceReRegistrationRequest(
        student_id=student.id,
        status=ApprovalStatus.PENDING,
        reason=reason_text
    )
    db.add(new_req)
    db.commit()
    db.refresh(new_req)

    log_audit_event(
        db,
        action="REQUEST_FACE_RE_REGISTRATION",
        entity_type="Student",
        user_id=current_student_user.id,
        entity_id=student.id,
        details={"request_id": new_req.id, "reason": reason_text}
    )

    return {
        "message": "Face re-registration request submitted successfully. Awaiting approval from your HOD or Administrator.",
        "status": "PENDING",
        "request_id": new_req.id
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

    # If the student has already registered their face, require approval from Admin or HOD
    approved_re_reg_req = None
    if student.face_registered:
        approved_re_reg_req = db.query(FaceReRegistrationRequest).filter(
            FaceReRegistrationRequest.student_id == student.id,
            FaceReRegistrationRequest.status == ApprovalStatus.APPROVED,
            FaceReRegistrationRequest.is_used == False
        ).order_by(FaceReRegistrationRequest.created_at.desc()).first()

        if not approved_re_reg_req:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Face biometrics already registered. You must obtain approval from an Admin or HOD before re-registering."
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
    if approved_re_reg_req:
        approved_re_reg_req.is_used = True
    db.commit()

    log_audit_event(
        db,
        action="RE_REGISTER_STUDENT_FACE" if approved_re_reg_req else "REGISTER_STUDENT_FACE",
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
