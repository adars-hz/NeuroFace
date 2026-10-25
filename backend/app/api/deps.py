"""Authentication and authorisation helpers.

Every protected endpoint declares which of these dependencies it needs, and
FastAPI calls them before the endpoint runs. Each helper either returns the
signed-in user or raises a 401/403 error.
"""

from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database.session import get_db
from app.models.user import User, UserRole, TeacherDesignation
from app.schemas.user import TokenPayload

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")


def is_hod(user: User) -> bool:
    """True when the user is a teacher carrying the HOD designation."""
    return (
        user.role == UserRole.TEACHER
        and user.teacher_profile is not None
        and user.teacher_profile.designation == TeacherDesignation.HOD
    )


def is_class_advisor(user: User) -> bool:
    """True when the user is a teacher assigned as an advisor for at least one class."""
    return (
        user.role == UserRole.TEACHER
        and user.teacher_profile is not None
        and bool(user.teacher_profile.advised_classes)
    )


def is_advisor_for_class(user: User, class_id: int) -> bool:
    """True when the user is a teacher assigned as advisor for the specific class."""
    if user.role != UserRole.TEACHER or not user.teacher_profile:
        return False
    try:
        cid = int(class_id)
    except (ValueError, TypeError):
        return False
    return any(c.id == cid for c in (user.teacher_profile.advised_classes or []))


def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> User:
    """Return the user that the bearer token belongs to."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception
        token_data = TokenPayload(sub=user_id_str)
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.id == int(token_data.sub)).first()
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user account")
    return user


def _require(condition: bool, message: str) -> None:
    """Stop the request with a 403 and a readable reason."""
    if not condition:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=message)


def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    """Only a system administrator may use this endpoint."""
    _require(current_user.role == UserRole.ADMIN, "Admin privileges required")
    return current_user


def get_current_teacher(current_user: User = Depends(get_current_user)) -> User:
    """Only a teacher may use this endpoint."""
    _require(current_user.role == UserRole.TEACHER, "Teacher privileges required")
    return current_user


def get_current_hod(current_user: User = Depends(get_current_teacher)) -> User:
    """Only a teacher with the HOD designation may use this endpoint."""
    _require(is_hod(current_user), "HOD elevated designation required for this action")
    return current_user


def get_current_admin_or_hod(current_user: User = Depends(get_current_user)) -> User:
    """Only a system administrator or an HOD may use this endpoint."""
    _require(
        current_user.role == UserRole.ADMIN or is_hod(current_user),
        "Administrative or HOD elevated authorization required"
    )
    return current_user


def get_current_admin_or_hod_or_advisor(current_user: User = Depends(get_current_user)) -> User:
    """Only a system administrator, HOD, or Class Advisor may use this endpoint."""
    _require(
        current_user.role == UserRole.ADMIN or is_hod(current_user) or is_class_advisor(current_user),
        "Administrative, HOD, or Class Advisor elevated authorization required"
    )
    return current_user


def get_current_student(current_user: User = Depends(get_current_user)) -> User:
    """Only a student may use this endpoint."""
    _require(current_user.role == UserRole.STUDENT, "Student privileges required")
    return current_user
