from datetime import time
from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint, Time
from sqlalchemy.orm import relationship
from app.database.session import Base

class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)

    teachers = relationship("Teacher", back_populates="department")
    students = relationship("Student", back_populates="department")
    classes = relationship("Class", back_populates="department")
    subjects = relationship("Subject", back_populates="department")

class Class(Base):
    __tablename__ = "classes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False)  # e.g., "MCA S3 Batch A"
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="CASCADE"), nullable=False)
    semester = Column(Integer, nullable=False)
    academic_year = Column(String(20), nullable=False)  # e.g., "2025-2026"
    class_advisor_id = Column(Integer, ForeignKey("teachers.id", ondelete="SET NULL"), nullable=True)

    __table_args__ = (
        UniqueConstraint("name", "department_id", "academic_year", name="uq_class_dept_year"),
    )

    department = relationship("Department", back_populates="classes")
    students = relationship("Student", back_populates="class_assigned")
    assignments = relationship("TeacherSubjectClassAssignment", back_populates="class_assigned", cascade="all, delete-orphan")
    advisor = relationship("Teacher", back_populates="advised_classes", foreign_keys=[class_advisor_id])

class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), unique=True, index=True, nullable=False)  # e.g., "MCA301"
    name = Column(String(100), nullable=False)                         # e.g., "Machine Learning"
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="CASCADE"), nullable=False)
    semester = Column(Integer, nullable=False)
    total_credits = Column(Integer, default=4, nullable=False)

    department = relationship("Department", back_populates="subjects")
    assignments = relationship("TeacherSubjectClassAssignment", back_populates="subject", cascade="all, delete-orphan")
    leave_applications = relationship("LeaveApplication", back_populates="subject")
    medical_waivers = relationship("MedicalWaiver", back_populates="subject")
    fine_records = relationship("FineRecord", back_populates="subject")

class TeacherSubjectClassAssignment(Base):
    __tablename__ = "teacher_subject_class_assignments"

    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="CASCADE"), nullable=False)

    __table_args__ = (
        UniqueConstraint("teacher_id", "subject_id", "class_id", name="uq_teacher_subject_class"),
    )

    teacher = relationship("Teacher", back_populates="assignments")
    subject = relationship("Subject", back_populates="assignments")
    class_assigned = relationship("Class", back_populates="assignments")
    sessions = relationship("AttendanceSession", back_populates="assignment", cascade="all, delete-orphan")

class AttendanceSlot(Base):
    __tablename__ = "attendance_slots"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False)  # e.g. "Slot 1 (09:00 - 10:00)"
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    day_of_week = Column(String(15), nullable=True)  # Optional: "Monday", "Tuesday" or NULL for recurring daily

    sessions = relationship("AttendanceSession", back_populates="slot")
