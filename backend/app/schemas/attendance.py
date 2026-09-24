from typing import Optional, List
from datetime import datetime, date
from pydantic import BaseModel
from app.models.attendance import AttendanceSessionStatus, AttendanceStatus, VerificationMethod

class StartSessionRequest(BaseModel):
    assignment_id: int
    slot_id: Optional[int] = None
    duration_minutes: int = 60

class SessionOut(BaseModel):
    id: int
    assignment_id: int
    teacher_id: int
    teacher_name: Optional[str] = None
    subject_id: Optional[int] = None
    subject_name: Optional[str] = None
    subject_code: Optional[str] = None
    class_id: Optional[int] = None
    class_name: Optional[str] = None
    slot_id: Optional[int] = None
    slot_name: Optional[str] = None
    session_date: date
    start_time: datetime
    end_time: datetime
    status: AttendanceSessionStatus
    total_enrolled: Optional[int] = 0
    present_count: Optional[int] = 0

    class Config:
        from_attributes = True

class AttendanceRecordOut(BaseModel):
    id: int
    session_id: int
    student_id: int
    student_name: str
    register_number: str
    status: AttendanceStatus
    timestamp: datetime
    confidence_score: Optional[float]
    verification_method: VerificationMethod
    marked_by: Optional[str]

    class Config:
        from_attributes = True

class DetectedFaceResult(BaseModel):
    box: List[int]  # [x1, y1, x2, y2]
    student_id: Optional[int] = None
    student_name: Optional[str] = None
    register_number: Optional[str] = None
    confidence: float
    status: str  # "MATCHED", "UNKNOWN", "LOW_QUALITY", "ALREADY_MARKED"

class FrameProcessRequest(BaseModel):
    image_base64: str

class FrameProcessResponse(BaseModel):
    session_id: int
    total_detected: int
    recognized_count: int
    unknown_count: int
    newly_marked_count: int
    total_present: int
    faces: List[DetectedFaceResult]

class LiveSessionStats(BaseModel):
    session_id: int
    status: AttendanceSessionStatus
    subject_name: str
    subject_code: str
    class_name: str
    teacher_name: str
    start_time: datetime
    end_time: datetime
    time_remaining_seconds: int
    total_enrolled: int
    present_count: int
    absent_count: int
    unknown_detections: int

class ManualAttendanceCorrection(BaseModel):
    student_id: int
    status: AttendanceStatus
    remarks: str
