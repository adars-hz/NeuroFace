from typing import Optional, List
from pydantic import BaseModel

class SubjectAttendanceStat(BaseModel):
    subject_id: int
    subject_code: str
    subject_name: str
    total_classes: int
    present_classes: int
    absent_classes: int
    waived_classes: int
    raw_attendance_pct: float
    effective_attendance_pct: float
    is_eligible: bool
    requires_fine: bool
    fine_amount: float
    fine_status: str  # "NONE", "UNPAID", "PAID", "WAIVED", "DETAINED"

class StudentAttendanceReport(BaseModel):
    student_id: int
    register_number: str
    student_name: str
    class_id: int
    class_name: str
    department_name: str
    overall_attendance_pct: float
    all_subjects_eligible: bool
    subjects: List[SubjectAttendanceStat]

class StudentReportCandidate(BaseModel):
    id: int
    register_number: str
    full_name: str
    class_name: Optional[str]
    department_name: Optional[str]

class ClassAttendanceRow(BaseModel):
    student_id: int
    register_number: str
    student_name: str
    total_classes: int
    present_classes: int
    waived_classes: int
    attendance_pct: float
    is_eligible: bool
    fine_status: str

class ClassSubjectReport(BaseModel):
    class_id: int
    class_name: str
    subject_id: int
    subject_code: str
    subject_name: str
    teacher_name: str
    total_sessions_held: int
    average_attendance_pct: float
    eligible_students_count: int
    condonation_students_count: int
    detained_students_count: int
    students: List[ClassAttendanceRow]
