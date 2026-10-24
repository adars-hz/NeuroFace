import os
import uuid
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from app.core.config import settings
from app.database.session import get_db
from app.models.user import User, UserRole, Student, TeacherDesignation
from app.models.academic import Subject
from app.models.leave import LeaveApplication, LeaveDocument, OCRResult, LeaveStatus
from app.schemas.leave import LeaveApplyRequest, LeaveReviewRequest, LeaveApplicationOut, OCRResultOut
from app.api.deps import get_current_user
from app.services.ocr_service import process_document_ocr
from app.core.audit import log_audit_event

router = APIRouter()

ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"]

@router.post("/upload-document")
async def upload_leave_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload a leave letter or medical certificate and automatically run OCR text extraction.
    Returns document ID, extracted text, detected dates, and sickness reasons.
    """
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Please upload a JPG, PNG, WEBP image or PDF document."
        )

    ext = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4().hex}{ext}"
    saved_path = os.path.join(settings.LEAVE_UPLOAD_DIR, unique_filename)

    with open(saved_path, "wb") as f:
        content = await file.read()
        f.write(content)

    # Execute OCR service
    ocr_data = process_document_ocr(saved_path)

    # Create temporary standalone document record (will be linked to LeaveApplication on submission)
    doc = LeaveDocument(
        leave_id=None,  # linked to a leave application later, if one is submitted
        file_path=saved_path,
        file_name=file.filename,
        mime_type=file.content_type,
        ocr_processed=True
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    ocr_res = OCRResult(
        document_id=doc.id,
        raw_text=ocr_data["raw_text"],
        detected_student_info=ocr_data["detected_student_info"],
        detected_dates=ocr_data["detected_dates"],
        detected_reason=ocr_data["detected_reason"],
        confidence=ocr_data["confidence"]
    )
    db.add(ocr_res)
    db.commit()

    return {
        "document_id": doc.id,
        "file_name": doc.file_name,
        "ocr": {
            "raw_text": ocr_res.raw_text,
            "detected_dates": ocr_res.detected_dates,
            "detected_reason": ocr_res.detected_reason,
            "detected_student_info": ocr_res.detected_student_info,
            "confidence": ocr_res.confidence
        }
    }

@router.post("/apply", response_model=LeaveApplicationOut)
def apply_leave(
    req: LeaveApplyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Submit a leave application for approval."""
    if current_user.role == UserRole.STUDENT:
        student = current_user.student_profile
    else:
        raise HTTPException(status_code=403, detail="Students can submit leave applications.")

    app = LeaveApplication(
        student_id=student.id,
        subject_id=req.subject_id,
        start_date=req.start_date,
        end_date=req.end_date,
        reason=req.reason,
        status=LeaveStatus.PENDING
    )
    db.add(app)
    db.commit()
    db.refresh(app)

    # Link uploaded document if present
    if req.document_id:
        # Use a row-level lock to prevent race conditions if multiple requests
        # try to link the same document.
        doc = db.query(LeaveDocument).filter(
            LeaveDocument.id == req.document_id,
            LeaveDocument.leave_id == None
        ).with_for_update().first()

        if doc:
            doc.leave_id = app.id
            db.commit()
        else:
            # Document is either missing or already linked to another application.
            pass

    log_audit_event(
        db,
        action="APPLY_LEAVE",
        entity_type="LeaveApplication",
        user_id=current_user.id,
        entity_id=app.id,
        details={"reason": app.reason, "dates": f"{app.start_date} to {app.end_date}"}
    )

    return LeaveApplicationOut(
        id=app.id,
        student_id=student.id,
        student_name=student.full_name,
        register_number=student.register_number,
        subject_id=app.subject_id,
        subject_name=app.subject.name if app.subject else "All Subjects",
        start_date=app.start_date,
        end_date=app.end_date,
        reason=app.reason,
        status=app.status,
        created_at=app.created_at
    )

@router.get("/applications", response_model=List[LeaveApplicationOut])
def get_leave_applications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve leave applications:
    - Students see only their own.
    - Teachers see applications from their department/assigned subjects.
    - HODs see all department applications.
    """
    query = db.query(LeaveApplication)

    if current_user.role == UserRole.STUDENT:
        query = query.filter(LeaveApplication.student_id == current_user.student_profile.id)
    elif current_user.role == UserRole.TEACHER:
        teacher = current_user.teacher_profile
        if teacher.is_hod and teacher.department_id:
            query = query.join(Student).filter(Student.department_id == teacher.department_id)

    applications = query.order_by(LeaveApplication.created_at.desc()).all()

    results = []
    for a in applications:
        results.append(LeaveApplicationOut(
            id=a.id,
            student_id=a.student_id,
            student_name=a.student.full_name,
            register_number=a.student.register_number,
            subject_id=a.subject_id,
            subject_name=a.subject.name if a.subject else "All Subjects",
            start_date=a.start_date,
            end_date=a.end_date,
            reason=a.reason,
            status=a.status,
            reviewed_by_name=a.reviewed_by,
            review_date=a.review_date,
            review_remarks=a.review_remarks,
            created_at=a.created_at
        ))
    return results

@router.put("/applications/{id}/review")
def review_leave_application(
    id: int,
    req: LeaveReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Authorized Teacher or HOD approves or rejects a leave application."""
    if current_user.role not in [UserRole.TEACHER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Unauthorized to review leave applications.")

    app = db.query(LeaveApplication).filter(LeaveApplication.id == id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Leave application not found")

    app.status = req.status
    app.reviewed_by = current_user.id
    app.review_date = datetime.now(timezone.utc)
    app.review_remarks = req.remarks
    db.commit()

    log_audit_event(
        db,
        action="REVIEW_LEAVE",
        entity_type="LeaveApplication",
        user_id=current_user.id,
        entity_id=app.id,
        details={"decision": req.status.value, "remarks": req.remarks}
    )

    return {"message": f"Leave application marked as {req.status.value}"}
