from typing import Optional
from datetime import time
from pydantic import BaseModel

class DepartmentBase(BaseModel):
    code: str
    name: str

class DepartmentCreate(DepartmentBase):
    pass

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

class SlotOut(BaseModel):
    id: int
    name: str
    start_time: str
    end_time: str
    day_of_week: Optional[str]

    class Config:
        from_attributes = True
