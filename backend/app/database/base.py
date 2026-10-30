# Import all models here so that Base has them registered before create_all()
from app.database.session import Base
from app.models.user import User, Teacher, Student, UserRole, TeacherDesignation
from app.models.academic import Department, Class, Subject, TeacherSubjectClassAssignment, AttendanceSlot
from app.models.attendance import AttendanceSession, AttendanceRecord, FaceEmbedding, AttendanceSessionStatus, AttendanceStatus, VerificationMethod
from app.models.leave import LeaveApplication, LeaveDocument, OCRResult, MedicalWaiver, FineRule, FineRecord, LeaveStatus, FinePaymentStatus
from app.models.audit import AuditLog
from app.models.approval import HODApprovalRequest, ApprovalRequestType, ApprovalStatus, FaceReRegistrationRequest

__all__ = [
    "Base",
    "User", "Teacher", "Student", "UserRole", "TeacherDesignation",
    "Department", "Class", "Subject", "TeacherSubjectClassAssignment", "AttendanceSlot",
    "AttendanceSession", "AttendanceRecord", "FaceEmbedding", "AttendanceSessionStatus", "AttendanceStatus", "VerificationMethod",
    "LeaveApplication", "LeaveDocument", "OCRResult", "MedicalWaiver", "FineRule", "FineRecord", "LeaveStatus", "FinePaymentStatus",
    "AuditLog", "HODApprovalRequest", "ApprovalRequestType", "ApprovalStatus", "FaceReRegistrationRequest"
]
