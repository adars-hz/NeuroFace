from typing import Optional
from pydantic import BaseModel, EmailStr
from app.models.user import UserRole, TeacherDesignation

class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: int
    username: str
    email: str
    role: UserRole
    is_hod: bool
    full_name: str
    profile_id: Optional[int] = None
    department_id: Optional[int] = None
    class_id: Optional[int] = None

class TokenPayload(BaseModel):
    sub: Optional[str] = None

class UserLogin(BaseModel):
    username_or_email: str
    password: str

class PasswordChange(BaseModel):
    old_password: str
    new_password: str

class UserBase(BaseModel):
    username: str
    email: EmailStr
    role: UserRole
    is_active: bool = True

class TeacherCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: str
    teacher_code: str
    department_id: int
    designation: TeacherDesignation = TeacherDesignation.ASSISTANT_PROFESSOR
    phone: Optional[str] = None

class TeacherOut(BaseModel):
    id: int
    user_id: int
    teacher_code: str
    full_name: str
    department_id: Optional[int]
    department_name: Optional[str] = None
    designation: TeacherDesignation
    is_hod: bool
    email: str
    phone: Optional[str]
    is_active: bool

    class Config:
        from_attributes = True

class StudentCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: str
    register_number: str
    department_id: int
    class_id: int
    phone: Optional[str] = None

class StudentOut(BaseModel):
    id: int
    user_id: int
    register_number: str
    full_name: str
    department_id: Optional[int]
    department_name: Optional[str] = None
    class_id: Optional[int]
    class_name: Optional[str] = None
    face_registered: bool
    email: str
    phone: Optional[str]
    is_active: bool

    class Config:
        from_attributes = True

class HODToggleRequest(BaseModel):
    teacher_id: int
    is_hod: bool

class TeacherUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    department_id: Optional[int] = None
    designation: Optional[TeacherDesignation] = None
    phone: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None

class StudentUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    register_number: Optional[str] = None
    department_id: Optional[int] = None
    class_id: Optional[int] = None
    phone: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None
    reset_face: Optional[bool] = False
