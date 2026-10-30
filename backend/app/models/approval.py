import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum, Boolean
from sqlalchemy.orm import relationship
from app.database.session import Base

class ApprovalRequestType(str, enum.Enum):
    CREATE_TEACHER = "CREATE_TEACHER"
    UPDATE_TEACHER = "UPDATE_TEACHER"
    DELETE_TEACHER = "DELETE_TEACHER"
    CREATE_STUDENT = "CREATE_STUDENT"
    UPDATE_STUDENT = "UPDATE_STUDENT"
    DELETE_STUDENT = "DELETE_STUDENT"
    CREATE_DEPARTMENT = "CREATE_DEPARTMENT"
    CREATE_CLASS = "CREATE_CLASS"
    CREATE_SUBJECT = "CREATE_SUBJECT"
    CREATE_ASSIGNMENT = "CREATE_ASSIGNMENT"
    DELETE_ASSIGNMENT = "DELETE_ASSIGNMENT"

class ApprovalStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class HODApprovalRequest(Base):
    __tablename__ = "hod_approval_requests"

    id = Column(Integer, primary_key=True, index=True)
    request_type = Column(Enum(ApprovalRequestType), nullable=False)
    status = Column(Enum(ApprovalStatus), default=ApprovalStatus.PENDING, nullable=False)
    
    # Who submitted the request
    requested_by_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    # Summary title, e.g. "Create Faculty Member: Dr. Jane Doe (T005)"
    title = Column(String(200), nullable=False)
    # Detailed JSON payload containing form parameters
    payload_json = Column(Text, nullable=False)
    
    # Review details
    reviewed_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    admin_remarks = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    requested_by = relationship("User", foreign_keys=[requested_by_id])
    reviewed_by = relationship("User", foreign_keys=[reviewed_by_id])

class FaceReRegistrationRequest(Base):
    __tablename__ = "face_re_registration_requests"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(Enum(ApprovalStatus), default=ApprovalStatus.PENDING, nullable=False, index=True)
    reason = Column(Text, nullable=True)

    # Review details by Admin or HOD
    reviewed_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    admin_remarks = Column(Text, nullable=True)

    # True once the student has successfully completed their face re-registration with this approval
    is_used = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    student = relationship("Student", back_populates="face_re_registration_requests")
    reviewed_by = relationship("User", foreign_keys=[reviewed_by_id])
