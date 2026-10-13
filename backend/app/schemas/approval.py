from typing import Optional, Any, Dict
from datetime import datetime
from pydantic import BaseModel
from app.models.approval import ApprovalRequestType, ApprovalStatus

class HODApprovalRequestCreate(BaseModel):
    request_type: ApprovalRequestType
    title: str
    payload: Dict[str, Any]

class HODApprovalRequestReview(BaseModel):
    remarks: Optional[str] = None

class HODApprovalRequestOut(BaseModel):
    id: int
    request_type: ApprovalRequestType
    status: ApprovalStatus
    requested_by_id: int
    requested_by_name: str
    title: str
    payload: Dict[str, Any]
    reviewed_by_id: Optional[int] = None
    reviewed_by_name: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    admin_remarks: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
