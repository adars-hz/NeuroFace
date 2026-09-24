from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.security import verify_password, create_access_token, get_password_hash
from app.models.user import User, UserRole, TeacherDesignation
from app.schemas.user import UserLogin, Token, PasswordChange
from app.api.deps import get_current_user
from app.core.audit import log_audit_event

router = APIRouter()

@router.post("/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    """Authenticate user with username or email and password."""
    user = db.query(User).filter(
        (User.username == login_data.username_or_email) |
        (User.email == login_data.username_or_email)
    ).first()

    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(status_code=400, detail="User account is deactivated")

    is_hod = False
    full_name = user.username
    profile_id = None
    department_id = None
    class_id = None

    if user.role == UserRole.TEACHER and user.teacher_profile:
        is_hod = (user.teacher_profile.designation == TeacherDesignation.HOD)
        full_name = user.teacher_profile.full_name
        profile_id = user.teacher_profile.id
        department_id = user.teacher_profile.department_id
    elif user.role == UserRole.STUDENT and user.student_profile:
        full_name = user.student_profile.full_name
        profile_id = user.student_profile.id
        department_id = user.student_profile.department_id
        class_id = user.student_profile.class_id
    elif user.role == UserRole.ADMIN:
        full_name = "Administrator"

    access_token = create_access_token(subject=user.id)

    log_audit_event(
        db,
        action="USER_LOGIN",
        entity_type="User",
        user_id=user.id,
        entity_id=user.id,
        details={"username": user.username, "role": user.role.value, "is_hod": is_hod}
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        user_id=user.id,
        username=user.username,
        email=user.email,
        role=user.role,
        is_hod=is_hod,
        full_name=full_name,
        profile_id=profile_id,
        department_id=department_id,
        class_id=class_id
    )

@router.get("/me")
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Retrieve details of the currently authenticated user."""
    is_hod = False
    full_name = current_user.username
    profile_id = None
    department_id = None
    class_id = None

    if current_user.role == UserRole.TEACHER and current_user.teacher_profile:
        is_hod = (current_user.teacher_profile.designation == TeacherDesignation.HOD)
        full_name = current_user.teacher_profile.full_name
        profile_id = current_user.teacher_profile.id
        department_id = current_user.teacher_profile.department_id
    elif current_user.role == UserRole.STUDENT and current_user.student_profile:
        full_name = current_user.student_profile.full_name
        profile_id = current_user.student_profile.id
        department_id = current_user.student_profile.department_id
        class_id = current_user.student_profile.class_id
    elif current_user.role == UserRole.ADMIN:
        full_name = "Administrator"

    return {
        "user_id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "role": current_user.role,
        "is_hod": is_hod,
        "full_name": full_name,
        "profile_id": profile_id,
        "department_id": department_id,
        "class_id": class_id,
        "is_active": current_user.is_active
    }

@router.post("/change-password")
def change_password(
    data: PasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Change authenticated user password."""
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
