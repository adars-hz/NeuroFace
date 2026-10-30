import enum
from datetime import datetime, timezone, date
from sqlalchemy import Column, Integer, String, Float, DateTime, Date, ForeignKey, Enum, Text, Boolean
from sqlalchemy.orm import relationship
from app.database.session import Base

class LeaveStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class FinePaymentStatus(str, enum.Enum):
    UNPAID = "UNPAID"
    PAID = "PAID"
    WAIVED = "WAIVED"

class LeaveApplication(Base):
    __tablename__ = "leave_applications"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)  # Nullable if applies to all subjects
    day_type = Column(String(20), default="FULL_DAY", nullable=False)  # "FULL_DAY" or "HALF_DAY"
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    reason = Column(Text, nullable=False)
    status = Column(Enum(LeaveStatus), default=LeaveStatus.PENDING, nullable=False)
    reviewed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    review_date = Column(DateTime, nullable=True)
    review_remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    student = relationship("Student", back_populates="leave_applications")
    subject = relationship("Subject", back_populates="leave_applications")
    documents = relationship("LeaveDocument", back_populates="leave_application", cascade="all, delete-orphan")
    waiver = relationship("MedicalWaiver", back_populates="leave_application", uselist=False, cascade="all, delete-orphan")

class LeaveDocument(Base):
    __tablename__ = "leave_documents"

    id = Column(Integer, primary_key=True, index=True)
    # Nullable: a document can be uploaded before its leave application is created.
    leave_id = Column(Integer, ForeignKey("leave_applications.id", ondelete="CASCADE"), nullable=True)
    file_path = Column(String(255), nullable=False)
    file_name = Column(String(100), nullable=False)
    mime_type = Column(String(50), nullable=False)
    ocr_processed = Column(Boolean, default=False, nullable=False)
    uploaded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    leave_application = relationship("LeaveApplication", back_populates="documents")
    ocr_result = relationship("OCRResult", back_populates="document", uselist=False, cascade="all, delete-orphan")

class OCRResult(Base):
    __tablename__ = "ocr_results"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("leave_documents.id", ondelete="CASCADE"), unique=True, nullable=False)
    raw_text = Column(Text, nullable=False)
    detected_student_info = Column(String(100), nullable=True)
    detected_dates = Column(String(100), nullable=True)
    detected_reason = Column(Text, nullable=True)
    detected_day_type = Column(String(20), nullable=True)  # "HALF_DAY" or "FULL_DAY"
    detected_subject = Column(String(100), nullable=True)  # Name or code of detected subject
    confidence = Column(Float, default=0.0, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    document = relationship("LeaveDocument", back_populates="ocr_result")

class MedicalWaiver(Base):
    __tablename__ = "medical_waivers"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    leave_id = Column(Integer, ForeignKey("leave_applications.id", ondelete="SET NULL"), nullable=True)
    waived_classes_count = Column(Integer, default=0, nullable=False)
    applied_rule = Column(String(100), default="HOD_MEDICAL_WAIVER_ADD_PRESENT", nullable=False)
    approved_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=False)
    approval_date = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    remarks = Column(Text, nullable=True)

    student = relationship("Student", back_populates="medical_waivers")
    subject = relationship("Subject", back_populates="medical_waivers")
    leave_application = relationship("LeaveApplication", back_populates="waiver")

class FineRule(Base):
    __tablename__ = "fine_rules"

    id = Column(Integer, primary_key=True, index=True)
    min_eligible_pct = Column(Float, default=85.0, nullable=False)
    condonation_min_pct = Column(Float, default=75.0, nullable=False)
    fine_amount = Column(Float, default=500.0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

class FineRecord(Base):
    __tablename__ = "fine_records"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    attendance_pct = Column(Float, nullable=False)
    fine_amount = Column(Float, nullable=False)
    payment_status = Column(Enum(FinePaymentStatus), default=FinePaymentStatus.UNPAID, nullable=False)
    remarks = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    student = relationship("Student", back_populates="fine_records")
    subject = relationship("Subject", back_populates="fine_records")
