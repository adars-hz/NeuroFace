"""One place that describes who a user is.

The login response and the `/auth/me` endpoint both need to tell the
frontend the same things about the signed-in person (real name, role, HOD
flag, which profile/ids belong to them). Keeping that logic in a single
function means the two endpoints can never drift apart.
"""

from typing import Any, Dict

from app.models.user import User, UserRole, TeacherDesignation


def describe_user(user: User) -> Dict[str, Any]:
    """Return the public details of a user account."""
    is_hod = False
    is_class_advisor = False
    advised_class_ids = []
    advised_class_names = []
    full_name = user.username
    profile_id = None
    department_id = None
    class_id = None

    if user.role == UserRole.TEACHER and user.teacher_profile:
        is_hod = user.teacher_profile.designation == TeacherDesignation.HOD
        full_name = user.teacher_profile.full_name
        profile_id = user.teacher_profile.id
        department_id = user.teacher_profile.department_id
        if user.teacher_profile.advised_classes:
            is_class_advisor = True
            advised_class_ids = [c.id for c in user.teacher_profile.advised_classes]
            advised_class_names = [c.name for c in user.teacher_profile.advised_classes]
    elif user.role == UserRole.STUDENT and user.student_profile:
        full_name = user.student_profile.full_name
        profile_id = user.student_profile.id
        department_id = user.student_profile.department_id
        class_id = user.student_profile.class_id
    elif user.role == UserRole.ADMIN:
        full_name = "Administrator"

    return {
        "user_id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "is_hod": is_hod,
        "is_class_advisor": is_class_advisor,
        "advised_class_ids": advised_class_ids,
        "advised_class_names": advised_class_names,
        "full_name": full_name,
        "profile_id": profile_id,
        "department_id": department_id,
        "class_id": class_id
    }

