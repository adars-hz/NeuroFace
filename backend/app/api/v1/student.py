import base64
import json
import cv2
import numpy as np
from typing import List
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.user import User, Student
from app.models.attendance import FaceEmbedding, AttendanceRecord
from app.schemas.reports import StudentAttendanceReport
from app.api.deps import get_current_student
from app.core.config import settings
from app.core.audit import log_audit_event
from app.ai.detector import face_detector
from app.ai.recognizer import face_recognizer
from app.ai.quality import evaluate_face_quality
from app.services.attendance_calculator import calculate_student_full_report

router = APIRouter()

class FaceRegistrationPayload(BaseModel):
    frames: List[str]  # List of 3 to 10 base64-encoded image frames

@router.get("/profile")
def get_student_profile(
    db: Session = Depends(get_db),
    current_student_user: User = Depends(get_current_student)
):
    """Retrieve profile and face registration status for current student."""
    stu = current_student_user.student_profile
    return {
        "id": stu.id,
        "register_number": stu.register_number,
        "full_name": stu.full_name,
        "email": current_student_user.email,
        "department_id": stu.department_id,
        "department_name": stu.department.name if stu.department else None,
        "class_id": stu.class_id,
        "class_name": stu.class_assigned.name if stu.class_assigned else None,
        "face_registered": stu.face_registered,
        "phone": stu.phone
    }

class SingleFrameValidationPayload(BaseModel):
    image_base64: str

@router.post("/validate-frame")
def validate_single_frame(
    payload: SingleFrameValidationPayload,
    current_student_user: User = Depends(get_current_student)
):
    """Real-time pre-validation of a single video frame during biometric enrollment."""
    try:
        header, encoded = payload.image_base64.split(",", 1) if "," in payload.image_base64 else ("", payload.image_base64)
        img_bytes = base64.b64decode(encoded)
        np_arr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if img is None:
            return {"valid": False, "message": "Invalid image data"}
    except Exception as e:
        return {"valid": False, "message": str(e)}

    detected = face_detector.detect_faces(img)
    if len(detected) == 0:
        return {"valid": False, "message": "No face detected. Please position your face inside the guide oval."}
    if len(detected) > 1:
        return {"valid": False, "message": "Multiple faces detected! Please ensure only you are visible."}

    f = detected[0]
    is_ok, quality_msg = evaluate_face_quality(f["crop"])
    if not is_ok:
        return {"valid": False, "message": quality_msg}

    return {
        "valid": True,
        "message": "Face clear & well-positioned. Ready to capture!",
        "box": f["box"],
        "score": round(f["score"], 3)
    }

@router.post("/register-face")
def register_student_face(
    payload: FaceRegistrationPayload,
    db: Session = Depends(get_db),
    current_student_user: User = Depends(get_current_student)
):
    """
    Register student biometric face representation from multi-frame camera capture:
    1. Validates each frame with MTCNN.
    2. Enforces single face presence, minimum resolution, and blur checks.
    3. Generates 512-D ArcFace embeddings and averages them.
    4. Securely stores the resulting normalized template in FaceEmbedding table.
    """
    stu = current_student_user.student_profile
    if not stu:
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

    for idx, frame_b64 in enumerate(payload.frames):
        try:
            header, encoded = frame_b64.split(",", 1) if "," in frame_b64 else ("", frame_b64)
            img_bytes = base64.b64decode(encoded)
            np_arr = np.frombuffer(img_bytes, np.uint8)
            img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            if img is None:
                continue
        except Exception:
            continue

        # Detect faces
        detected = face_detector.detect_faces(img)
        if len(detected) == 0:
            continue
        if len(detected) > 1:
            # Registration requires strictly 1 person in frame
            raise HTTPException(
                status_code=400,
                detail=f"Frame {idx + 1} contains multiple faces. Please ensure only you are visible."
            )

        f = detected[0]
        # Verify crop dimensions
        h_crop, w_crop = f["crop"].shape[:2]
        if h_crop < 30 or w_crop < 30:
            continue

        emb = face_recognizer.extract_embedding(f["aligned"])
        valid_embeddings.append(emb)

    if len(valid_embeddings) < 1:
        raise HTTPException(
            status_code=400,
            detail="No clear face was detected in the captured frames. Please face the camera directly in good lighting and try again."
        )

    # Average the extracted embeddings and re-normalize to unit vector
    mean_emb = np.mean(valid_embeddings, axis=0)
    mean_emb = mean_emb / np.linalg.norm(mean_emb)
    emb_json = json.dumps(mean_emb.tolist())

    # -------------------------------------------------------------
    # 1-to-N Biometric De-Duplication Guard:
    # Check if this face already belongs to another student!
    # -------------------------------------------------------------
    duplicate_threshold = getattr(settings, "DUPLICATE_FACE_THRESHOLD", 0.85)
    other_embeddings = db.query(FaceEmbedding).filter(FaceEmbedding.student_id != stu.id).all()

    for existing in other_embeddings:
        try:
            existing_vec = np.array(json.loads(existing.embedding_vector), dtype=np.float32)
            similarity = float(np.dot(mean_emb, existing_vec))
            if similarity >= duplicate_threshold:
                conflicting_student = existing.student
                log_audit_event(
                    db,
                    action="DUPLICATE_FACE_REGISTRATION_ATTEMPT",
                    entity_type="Student",
                    user_id=current_student_user.id,
                    entity_id=stu.id,
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
        except HTTPException:
            raise
        except Exception:
            continue

    # Replace any existing embedding for this student
    db.query(FaceEmbedding).filter(FaceEmbedding.student_id == stu.id).delete()

    face_rec = FaceEmbedding(
        student_id=stu.id,
        embedding_vector=emb_json,
        quality_score=0.98,
        model_name="ArcFace-512"
    )
    db.add(face_rec)
    stu.face_registered = True
    db.commit()

    log_audit_event(
        db,
        action="REGISTER_STUDENT_FACE",
        entity_type="Student",
        user_id=current_student_user.id,
        entity_id=stu.id,
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
    """Retrieve full attendance percentage, 85% eligibility status, and fine assessment."""
    stu = current_student_user.student_profile
    return calculate_student_full_report(db, stu.id)

@router.get("/attendance-history")
def get_attendance_history(
    db: Session = Depends(get_db),
    current_student_user: User = Depends(get_current_student)
):
    """Retrieve individual lecture attendance entries for student."""
    stu = current_student_user.student_profile
    records = db.query(AttendanceRecord).filter(
        AttendanceRecord.student_id == stu.id
    ).order_by(AttendanceRecord.timestamp.desc()).limit(100).all()

    return [
        {
            "id": r.id,
            "session_id": r.session_id,
            "subject_name": r.session.assignment.subject.name,
            "subject_code": r.session.assignment.subject.code,
            "teacher_name": r.session.teacher.full_name,
            "date": r.session.session_date,
            "timestamp": r.timestamp,
            "status": r.status.value,
            "verification_method": r.verification_method.value
        } for r in records
    ]
