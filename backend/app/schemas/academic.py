from typing import Optional
from datetime import time
from pydantic import BaseModel

class DepartmentBase(BaseModel):
    code: str
    name: str

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None

class DepartmentOut(DepartmentBase):
    id: int

    class Config:
        from_attributes = True

class ClassBase(BaseModel):
    name: str
    department_id: int
    semester: int
    academic_year: str

class ClassCreate(ClassBase):
    pass

class ClassUpdate(BaseModel):
    name: Optional[str] = None
    department_id: Optional[int] = None
    semester: Optional[int] = None
    academic_year: Optional[str] = None
    class_advisor_id: Optional[int] = None

class ClassOut(ClassBase):
    id: int
    department_name: Optional[str] = None
    student_count: Optional[int] = 0
    class_advisor_id: Optional[int] = None
    class_advisor_name: Optional[str] = None
    class_advisor_code: Optional[str] = None

    class Config:
        from_attributes = True

class ClassAdvisorAssign(BaseModel):
    teacher_id: Optional[int] = None

class SubjectBase(BaseModel):
    code: str
    name: str
    department_id: int
    semester: int
    total_credits: int = 4

class SubjectCreate(SubjectBase):
    pass

class SubjectUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    department_id: Optional[int] = None
    semester: Optional[int] = None
    total_credits: Optional[int] = None

class SubjectOut(SubjectBase):
    id: int
    department_name: Optional[str] = None

    class Config:
        from_attributes = True

class AssignmentCreate(BaseModel):
    teacher_id: int
    subject_id: int
    class_id: int

class AssignmentOut(BaseModel):
    id: int
    teacher_id: int
    teacher_name: str
    teacher_code: str
    subject_id: int
    subject_name: str
    subject_code: str
    class_id: int
    class_name: str

    class Config:
        from_attributes = True

class SlotCreate(BaseModel):
    name: str
    start_time: str  # Format: "HH:MM:SS" or "HH:MM"
    end_time: str
    day_of_week: Optional[str] = None

class SlotUpdate(BaseModel):
    name: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    day_of_week: Optional[str] = None

class SlotOut(BaseModel):
    id: int
    name: str
    start_time: str
    end_time: str
    day_of_week: Optional[str] = None
    # Dynamic runtime slot availability states
    is_disabled: bool = False
    disabled_reason: Optional[str] = None
    is_passed: bool = False
    is_active_now: bool = False
    is_accessed: bool = False
    accessed_by_teacher_id: Optional[int] = None
    accessed_by_teacher_name: Optional[str] = None
    is_my_session: bool = False
    active_session_id: Optional[int] = None
    session_status: Optional[str] = None

    class Config:
        from_attributes = True
