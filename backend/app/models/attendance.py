import enum
from datetime import datetime, timezone, date
from sqlalchemy import Column, Integer, String, Float, DateTime, Date, ForeignKey, Enum, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database.session import Base

class AttendanceSessionStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    EXPIRED = "EXPIRED"

class AttendanceStatus(str, enum.Enum):
    PRESENT = "PRESENT"
    ABSENT = "ABSENT"
    LATE = "LATE"

class VerificationMethod(str, enum.Enum):
    FACE_RECOGNITION = "FACE_RECOGNITION"
    MANUAL_OVERRIDE = "MANUAL_OVERRIDE"
    MEDICAL_WAIVER = "MEDICAL_WAIVER"

class AttendanceSession(Base):
    __tablename__ = "attendance_sessions"

    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("teacher_subject_class_assignments.id", ondelete="CASCADE"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False)
    slot_id = Column(Integer, ForeignKey("attendance_slots.id", ondelete="SET NULL"), nullable=True)
    session_date = Column(Date, default=lambda: date.today(), nullable=False)
    start_time = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    end_time = Column(DateTime, nullable=False)
    status = Column(Enum(AttendanceSessionStatus), default=AttendanceSessionStatus.ACTIVE, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    assignment = relationship("TeacherSubjectClassAssignment", back_populates="sessions")
    teacher = relationship("Teacher", back_populates="sessions")
    slot = relationship("AttendanceSlot", back_populates="sessions")
    records = relationship("AttendanceRecord", back_populates="session", cascade="all, delete-orphan")

class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("attendance_sessions.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    status = Column(Enum(AttendanceStatus), default=AttendanceStatus.PRESENT, nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    confidence_score = Column(Float, nullable=True)  # Cosine similarity score
    verification_method = Column(Enum(VerificationMethod), default=VerificationMethod.FACE_RECOGNITION, nullable=False)
    marked_by = Column(String(100), nullable=True)  # E.g. "System AI" or Teacher Name

    __table_args__ = (
        UniqueConstraint("session_id", "student_id", name="uq_session_student_attendance"),
    )

    session = relationship("AttendanceSession", back_populates="records")
    student = relationship("Student", back_populates="attendance_records")

class FaceEmbedding(Base):
    __tablename__ = "face_embeddings"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    embedding_vector = Column(Text, nullable=False)  # JSON-encoded array of 512 normalized floats
    quality_score = Column(Float, default=1.0, nullable=False)
    model_name = Column(String(50), default="ArcFace-512-ONNX", nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    student = relationship("Student", back_populates="embeddings")
