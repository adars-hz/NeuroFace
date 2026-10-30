from typing import Optional
from datetime import date, datetime
from pydantic import BaseModel
from app.models.leave import LeaveStatus, FinePaymentStatus

class LeaveApplyRequest(BaseModel):
    subject_id: Optional[int] = None  # None means applies to all subjects
    day_type: Optional[str] = "FULL_DAY"  # "FULL_DAY" or "HALF_DAY"
    start_date: date
    end_date: date
    reason: str
    document_id: Optional[int] = None

class LeaveReviewRequest(BaseModel):
    status: LeaveStatus  # APPROVED or REJECTED
    remarks: Optional[str] = None

class OCRResultOut(BaseModel):
    id: int
    raw_text: str
    detected_student_info: Optional[str] = None
    detected_dates: Optional[str] = None
    detected_reason: Optional[str] = None
    detected_day_type: Optional[str] = None
    detected_subject: Optional[str] = None
    confidence: float

    class Config:
        from_attributes = True

class LeaveDocumentOut(BaseModel):
    id: int
    file_name: str
    mime_type: str
    file_path: str
    ocr_result: Optional[OCRResultOut] = None

    class Config:
        from_attributes = True

class LeaveApplicationOut(BaseModel):
    id: int
    student_id: int
    student_name: str
    register_number: str
    subject_id: Optional[int] = None
    subject_name: Optional[str] = None
    day_type: Optional[str] = "FULL_DAY"
    start_date: date
    end_date: date
    reason: str
    status: LeaveStatus
    reviewed_by_name: Optional[str] = None
    review_date: Optional[datetime] = None
    review_remarks: Optional[str] = None
    created_at: datetime
    documents: list[LeaveDocumentOut] = []

    class Config:
        from_attributes = True

class MedicalWaiverCreate(BaseModel):
    student_id: int
    subject_id: int
    leave_id: Optional[int] = None
    waived_classes_count: int
    remarks: Optional[str] = None

class MedicalWaiverOut(BaseModel):
    id: int
    student_id: int
    student_name: str
    register_number: str
    subject_id: int
    subject_name: str
    subject_code: str
    leave_id: Optional[int]
    waived_classes_count: int
    applied_rule: str
    approved_by_name: str
    approval_date: datetime
    remarks: Optional[str]

    class Config:
        from_attributes = True

class FineRuleUpdate(BaseModel):
    min_eligible_pct: float = 85.0
    condonation_min_pct: float = 75.0
    fine_amount: float = 500.0
    is_active: bool = True

class FineRuleOut(BaseModel):
    id: int
    min_eligible_pct: float
    condonation_min_pct: float
    fine_amount: float
    is_active: bool
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

class FineRecordOut(BaseModel):
    id: int
    student_id: int
    student_name: str
    register_number: str
    subject_id: int
    subject_name: str
    attendance_pct: float
    fine_amount: float
    payment_status: FinePaymentStatus
    remarks: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
