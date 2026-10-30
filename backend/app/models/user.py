import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.database.session import Base

class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    TEACHER = "TEACHER"
    STUDENT = "STUDENT"

class TeacherDesignation(str, enum.Enum):
    ASSISTANT_PROFESSOR = "ASSISTANT_PROFESSOR"
    ASSOCIATE_PROFESSOR = "ASSOCIATE_PROFESSOR"
    PROFESSOR = "PROFESSOR"
    HOD = "HOD"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.STUDENT)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    teacher_profile = relationship("Teacher", back_populates="user", uselist=False, cascade="all, delete-orphan")
    student_profile = relationship("Student", back_populates="user", uselist=False, cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user")

class Teacher(Base):
    __tablename__ = "teachers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    teacher_code = Column(String(20), unique=True, index=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    designation = Column(Enum(TeacherDesignation), default=TeacherDesignation.ASSISTANT_PROFESSOR, nullable=False)
    phone = Column(String(20), nullable=True)

    user = relationship("User", back_populates="teacher_profile")
    department = relationship("Department", back_populates="teachers")
    assignments = relationship("TeacherSubjectClassAssignment", back_populates="teacher", cascade="all, delete-orphan")
    sessions = relationship("AttendanceSession", back_populates="teacher")
    advised_classes = relationship("Class", back_populates="advisor", foreign_keys="Class.class_advisor_id")

    @property
    def is_hod(self) -> bool:
        return self.designation == TeacherDesignation.HOD

    @property
    def is_class_advisor(self) -> bool:
        return len(self.advised_classes) > 0

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    register_number = Column(String(30), unique=True, index=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="SET NULL"), nullable=True)
    face_registered = Column(Boolean, default=False, nullable=False)
    phone = Column(String(20), nullable=True)

    user = relationship("User", back_populates="student_profile")
    department = relationship("Department", back_populates="students")
    class_assigned = relationship("Class", back_populates="students")
    embeddings = relationship("FaceEmbedding", back_populates="student", cascade="all, delete-orphan")
    attendance_records = relationship("AttendanceRecord", back_populates="student", cascade="all, delete-orphan")
    leave_applications = relationship("LeaveApplication", back_populates="student", cascade="all, delete-orphan")
    medical_waivers = relationship("MedicalWaiver", back_populates="student", cascade="all, delete-orphan")
    fine_records = relationship("FineRecord", back_populates="student", cascade="all, delete-orphan")
    face_re_registration_requests = relationship("FaceReRegistrationRequest", back_populates="student", cascade="all, delete-orphan")
