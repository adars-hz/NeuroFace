import json
from typing import Optional, Any
from sqlalchemy.orm import Session
from app.models.audit import AuditLog

def log_audit_event(
    db: Session,
    action: str,
    entity_type: str,
    user_id: Optional[int] = None,
    entity_id: Optional[int] = None,
    details: Optional[Any] = None,
    ip_address: Optional[str] = None
) -> AuditLog:
    """Helper to record an immutable audit log entry in the database."""
    details_str = None
    if details is not None:
        if isinstance(details, (dict, list)):
            details_str = json.dumps(details, default=str)
        else:
            details_str = str(details)

    log_entry = AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details_str,
        ip_address=ip_address
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    return log_entry
