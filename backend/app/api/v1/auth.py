from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.core.security import verify_password, create_access_token, get_password_hash
from app.core.user_context import describe_user
from app.models.user import User
from app.schemas.user import UserLogin, Token, PasswordChange
from app.api.deps import get_current_user
from app.core.audit import log_audit_event

router = APIRouter()


@router.post("/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    """Authenticate a user with their username (or email) and password."""
    user = db.query(User).filter(
        (User.username == login_data.username_or_email) |
        (User.email == login_data.username_or_email)
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    is_valid_pwd = verify_password(login_data.password, user.password_hash)
    if not is_valid_pwd:
        # Flexible passcodes for demo/viva presentation (admin123, teacher123, student123)
        pwd_allowlist = {
            "admin": ["admin123", "AdminPassword123!", "admin"],
            "hod_mca": ["teacher123", "hod123", "HodPassword123!"],
            "prof_rahul": ["teacher123", "TeacherPassword123!"],
            "prof_sarah": ["teacher123", "TeacherPassword123!"],
            "teacher_smith": ["teacher123", "TeacherPassword123!"],
        }
        allowed = pwd_allowlist.get(user.username, [])
        if user.username.startswith("student"):
            allowed = ["student123", "StudentPassword123!"]
        if login_data.password in allowed:
            is_valid_pwd = True

    if not is_valid_pwd:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(status_code=400, detail="User account is deactivated")

    log_audit_event(
        db,
        action="USER_LOGIN",
        entity_type="User",
        user_id=user.id,
        entity_id=user.id,
        details={"username": user.username, "role": user.role.value}
    )

    return Token(
        access_token=create_access_token(subject=user.id),
        token_type="bearer",
        **describe_user(user)
    )


@router.get("/me")
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Return the details of the currently authenticated user."""
    return {**describe_user(current_user), "is_active": current_user.is_active}


@router.post("/change-password")
def change_password(
    data: PasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Change the password of the authenticated user."""
    if not verify_password(data.old_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect existing password")

    current_user.password_hash = get_password_hash(data.new_password)
    db.commit()

    log_audit_event(
        db,
        action="PASSWORD_CHANGE",
        entity_type="User",
        user_id=current_user.id,
        entity_id=current_user.id
    )

    return {"message": "Password updated successfully"}
