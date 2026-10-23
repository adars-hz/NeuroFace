"""Tests for logging in and for the access rules of the API.

The four roles are: ADMIN, TEACHER (with an optional HOD designation) and
STUDENT. Every protected endpoint must refuse the wrong role.
"""

from app.models.user import User, UserRole


def test_login_with_username(client):
    """A user can log in with their username."""
    response = client.post("/api/v1/auth/login", json={
        "username_or_email": "admin",
        "password": "AdminPassword123!",
    })

    assert response.status_code == 200
    body = response.json()
    assert body["username"] == "admin"
    assert body["role"] == UserRole.ADMIN.value
    assert body["token_type"] == "bearer"
    assert body["access_token"]


def test_login_with_email(client):
    """A user can log in with their email address too."""
    response = client.post("/api/v1/auth/login", json={
        "username_or_email": "arun@neuroface.edu",
        "password": "StudentPassword123!",
    })

    assert response.status_code == 200
    assert response.json()["username"] == "student_arun"


def test_login_returns_the_right_details_for_each_role(client):
    """The login response tells the frontend who the person is."""
    admin = client.post("/api/v1/auth/login", json={
        "username_or_email": "admin", "password": "AdminPassword123!",
    }).json()
    assert admin["full_name"] == "Administrator"
    assert admin["is_hod"] is False

    hod = client.post("/api/v1/auth/login", json={
        "username_or_email": "hod_mca", "password": "HodPassword123!",
    }).json()
    assert hod["role"] == UserRole.TEACHER.value
    assert hod["is_hod"] is True
    assert hod["full_name"] == "Dr. K. R. Ramanathan"

    student = client.post("/api/v1/auth/login", json={
        "username_or_email": "student_arun", "password": "StudentPassword123!",
    }).json()
    assert student["role"] == UserRole.STUDENT.value
    assert student["class_id"] is not None


def test_login_with_wrong_password_is_refused(client):
    """A wrong password never returns a token."""
    response = client.post("/api/v1/auth/login", json={
        "username_or_email": "admin",
        "password": "not-the-password",
    })

    assert response.status_code == 401
    assert "access_token" not in response.json()


def test_login_with_unknown_user_is_refused(client):
    """An unknown username never returns a token."""
    response = client.post("/api/v1/auth/login", json={
        "username_or_email": "nobody",
        "password": "whatever",
    })

    assert response.status_code == 401


def test_login_without_data_is_rejected(client):
    """The login endpoint needs both a name and a password."""
    response = client.post("/api/v1/auth/login", json={})

    assert response.status_code == 422


def test_me_returns_the_signed_in_user(client, student_headers):
    """The /me endpoint describes the person that owns the token."""
    response = client.get("/api/v1/auth/me", headers=student_headers)

    assert response.status_code == 200
    body = response.json()
    assert body["username"] == "student_arun"
    assert body["role"] == UserRole.STUDENT.value
    assert body["is_active"] is True


def test_me_without_a_token_is_refused(client):
    """A protected endpoint needs a token."""
    response = client.get("/api/v1/auth/me")

    assert response.status_code == 401


def test_me_with_a_broken_token_is_refused(client):
    """A token that is not a valid JWT is refused."""
    response = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer nonsense"})

    assert response.status_code == 401


def test_deactivated_user_cannot_use_a_token(client, db):
    """A disabled account is blocked even with a valid token."""
    login = client.post("/api/v1/auth/login", json={
        "username_or_email": "student_priya", "password": "StudentPassword123!",
    }).json()
    headers = {"Authorization": f"Bearer {login['access_token']}"}

    user = db.query(User).filter(User.username == "student_priya").first()
    user.is_active = False
    db.commit()

    response = client.get("/api/v1/auth/me", headers=headers)

    assert response.status_code == 400
    assert "inactive" in response.json()["detail"].lower()


def test_deactivated_user_cannot_log_in(client, db):
    """A disabled account cannot get a new token either."""
    user = db.query(User).filter(User.username == "student_priya").first()
    user.is_active = False
    db.commit()

    response = client.post("/api/v1/auth/login", json={
        "username_or_email": "student_priya", "password": "StudentPassword123!",
    })

    assert response.status_code == 400


def test_change_password(client, student_headers):
    """A user can change their own password and then use the new one."""
    response = client.post("/api/v1/auth/change-password", headers=student_headers, json={
        "old_password": "StudentPassword123!",
        "new_password": "BrandNewPassword456!",
    })

    assert response.status_code == 200

    again = client.post("/api/v1/auth/login", json={
        "username_or_email": "student_arun", "password": "BrandNewPassword456!",
    })
    assert again.status_code == 200


def test_change_password_with_wrong_old_password(client, student_headers):
    """The old password has to be correct."""
    response = client.post("/api/v1/auth/change-password", headers=student_headers, json={
        "old_password": "wrong-one",
        "new_password": "BrandNewPassword456!",
    })

    assert response.status_code == 400


def test_student_cannot_use_admin_endpoints(client, student_headers):
    """A student is not an administrator."""
    response = client.get("/api/v1/admin/students", headers=student_headers)

    assert response.status_code == 403


def test_teacher_cannot_use_admin_only_endpoints(client, teacher_headers):
    """A regular teacher is not an administrator."""
    response = client.get("/api/v1/admin/audit-logs", headers=teacher_headers)

    assert response.status_code == 403


def test_hod_may_read_admin_overview(client, hod_headers):
    """An HOD may look at the administrative overview."""
    response = client.get("/api/v1/admin/students", headers=hod_headers)

    assert response.status_code == 200


def test_hod_may_not_use_admin_only_endpoints(client, hod_headers):
    """The HOD designation does not make somebody a system administrator."""
    response = client.get("/api/v1/admin/audit-logs", headers=hod_headers)

    assert response.status_code == 403


def test_teacher_cannot_use_student_endpoints(client, teacher_headers):
    """A teacher is not a student."""
    response = client.get("/api/v1/student/my-attendance", headers=teacher_headers)

    assert response.status_code == 403


def test_student_cannot_use_teacher_endpoints(client, student_headers):
    """A student is not a teacher."""
    response = client.get("/api/v1/teacher/my-assignments", headers=student_headers)

    assert response.status_code == 403
