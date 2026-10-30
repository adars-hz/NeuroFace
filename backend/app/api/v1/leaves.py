import os
import uuid
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from app.core.config import settings
from app.database.session import get_db
from app.models.user import User, UserRole, Student, TeacherDesignation
from app.models.academic import Subject
from app.models.leave import LeaveApplication, LeaveDocument, OCRResult, LeaveStatus
from app.schemas.leave import LeaveApplyRequest, LeaveReviewRequest, LeaveApplicationOut, OCRResultOut, LeaveDocumentOut
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

    # Fetch known subjects to assist OCR matching
    all_subjects = db.query(Subject).all()
    known_subjects = [{"id": s.id, "name": s.name, "code": s.code} for s in all_subjects]

    # Execute OCR service
    ocr_data = process_document_ocr(saved_path, known_subjects=known_subjects)

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
        detected_day_type=ocr_data.get("detected_day_type", "FULL_DAY"),
        detected_subject=ocr_data.get("detected_subject_name") or ocr_data.get("detected_subject_code"),
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
            "confidence": ocr_res.confidence,
            "start_date": ocr_data.get("start_date"),
            "end_date": ocr_data.get("end_date"),
            "detected_day_type": ocr_data.get("detected_day_type", "FULL_DAY"),
            "detected_half_day_session": ocr_data.get("detected_half_day_session"),
            "detected_subject_id": ocr_data.get("detected_subject_id"),
            "detected_subject_name": ocr_data.get("detected_subject_name"),
            "detected_subject_code": ocr_data.get("detected_subject_code"),
            "detected_scope_note": ocr_data.get("detected_scope_note")
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

    day_type = req.day_type or ("HALF_DAY" if req.subject_id else "FULL_DAY")

    app = LeaveApplication(
        student_id=student.id,
        subject_id=req.subject_id,
        day_type=day_type,
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
        details={"reason": app.reason, "dates": f"{app.start_date} to {app.end_date}", "day_type": app.day_type}
    )

    return LeaveApplicationOut(
        id=app.id,
        student_id=student.id,
        student_name=student.full_name,
        register_number=student.register_number,
        subject_id=app.subject_id,
        subject_name=app.subject.name if app.subject else "All Subjects",
        day_type=app.day_type,
        start_date=app.start_date,
        end_date=app.end_date,
        reason=app.reason,
        status=app.status,
        created_at=app.created_at
    )

@router.get("/pending-count")
def get_pending_leaves_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Return count of pending leave applications for the current user:
    - Admin: All pending applications
    - Student: Their own pending applications
    - HOD: All pending applications in their department
    - Class Advisor: Pending applications from advised classes + taught subjects
    - Teacher: Pending applications for assigned subjects / classes
    """
    query = db.query(LeaveApplication).filter(LeaveApplication.status == LeaveStatus.PENDING)

    if current_user.role == UserRole.STUDENT:
        if not current_user.student_profile:
            return {"pending_count": 0}
        query = query.filter(LeaveApplication.student_id == current_user.student_profile.id)
    elif current_user.role == UserRole.TEACHER:
        teacher = current_user.teacher_profile
        if not teacher:
            return {"pending_count": 0}

        if teacher.is_hod and teacher.department_id:
            query = query.join(Student, LeaveApplication.student_id == Student.id).filter(
                Student.department_id == teacher.department_id
            )
        else:
            advised_class_ids = [c.id for c in (teacher.advised_classes or [])]
            assigned_subject_ids = [a.subject_id for a in (teacher.assignments or [])]
            assigned_class_ids = [a.class_id for a in (teacher.assignments or [])]

            conditions = []
            if advised_class_ids:
                conditions.append(Student.class_id.in_(advised_class_ids))
            if assigned_subject_ids:
                conditions.append(LeaveApplication.subject_id.in_(assigned_subject_ids))
            if assigned_class_ids:
                conditions.append(
                    and_(
                        LeaveApplication.subject_id == None,
                        Student.class_id.in_(assigned_class_ids)
                    )
                )

            if conditions:
                query = query.join(Student, LeaveApplication.student_id == Student.id).filter(
                    or_(*conditions)
                )
            else:
                return {"pending_count": 0}

    return {"pending_count": query.count()}

@router.get("/applications", response_model=List[LeaveApplicationOut])
def get_leave_applications(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve leave applications:
    - Students see only their own.
    - HODs see all department applications.
    - Class Advisors see all applications from their advised class(es).
    - Teachers see applications from their assigned subjects / classes.
    - Admins see all applications.
    """
    query = db.query(LeaveApplication)

    if status_filter:
        try:
            status_enum = LeaveStatus(status_filter.upper())
            query = query.filter(LeaveApplication.status == status_enum)
        except ValueError:
            pass

    if current_user.role == UserRole.STUDENT:
        if not current_user.student_profile:
            return []
        query = query.filter(LeaveApplication.student_id == current_user.student_profile.id)
    elif current_user.role == UserRole.TEACHER:
        teacher = current_user.teacher_profile
        if not teacher:
            return []

        if teacher.is_hod and teacher.department_id:
            query = query.join(Student, LeaveApplication.student_id == Student.id).filter(
                Student.department_id == teacher.department_id
            )
        else:
            advised_class_ids = [c.id for c in (teacher.advised_classes or [])]
            assigned_subject_ids = [a.subject_id for a in (teacher.assignments or [])]
            assigned_class_ids = [a.class_id for a in (teacher.assignments or [])]

            conditions = []
            if advised_class_ids:
                conditions.append(Student.class_id.in_(advised_class_ids))
            if assigned_subject_ids:
                conditions.append(LeaveApplication.subject_id.in_(assigned_subject_ids))
            if assigned_class_ids:
                conditions.append(
                    and_(
                        LeaveApplication.subject_id == None,
                        Student.class_id.in_(assigned_class_ids)
                    )
                )

            if conditions:
                query = query.join(Student, LeaveApplication.student_id == Student.id).filter(
                    or_(*conditions)
                )
            else:
                return []

    applications = query.order_by(LeaveApplication.created_at.desc()).all()

    results = []
    for a in applications:
        docs_out = []
        for d in (a.documents or []):
            ocr_out = None
            if d.ocr_result:
                ocr_out = OCRResultOut(
                    id=d.ocr_result.id,
                    raw_text=d.ocr_result.raw_text,
                    detected_student_info=d.ocr_result.detected_student_info,
                    detected_dates=d.ocr_result.detected_dates,
                    detected_reason=d.ocr_result.detected_reason,
                    detected_day_type=d.ocr_result.detected_day_type,
                    detected_subject=d.ocr_result.detected_subject,
                    confidence=d.ocr_result.confidence
                )
            rel_path = f"/uploads/leaves/{os.path.basename(d.file_path)}"
            docs_out.append(LeaveDocumentOut(
                id=d.id,
                file_name=d.file_name,
                mime_type=d.mime_type,
                file_path=rel_path,
                ocr_result=ocr_out
            ))

        reviewer_name = None
        if a.reviewed_by:
            rev_user = db.query(User).filter(User.id == a.reviewed_by).first()
            if rev_user:
                if rev_user.teacher_profile:
                    role_str = "HOD" if rev_user.teacher_profile.is_hod else ("Class Advisor" if rev_user.teacher_profile.is_class_advisor else "Faculty")
                    reviewer_name = f"{rev_user.teacher_profile.full_name} ({role_str})"
                else:
                    reviewer_name = rev_user.username

        results.append(LeaveApplicationOut(
            id=a.id,
            student_id=a.student_id,
            student_name=a.student.full_name,
            register_number=a.student.register_number,
            subject_id=a.subject_id,
            subject_name=a.subject.name if a.subject else "All Subjects",
            day_type=a.day_type or ("HALF_DAY" if a.subject_id else "FULL_DAY"),
            start_date=a.start_date,
            end_date=a.end_date,
            reason=a.reason,
            status=a.status,
            reviewed_by_name=reviewer_name,
            review_date=a.review_date,
            review_remarks=a.review_remarks,
            created_at=a.created_at,
            documents=docs_out
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
