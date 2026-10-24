"""Shared test setup for the NeuroFace backend.

Every test runs against a real SQLite database in a temporary folder that is
filled with the same demo data `seed_data.py` creates. That way the tests
check the application exactly the way a real user would use it.

How it works:
  1. Before importing the app we point `DATABASE_URL` and `UPLOAD_DIR` at a
     temporary folder, so the real database is never touched.
  2. `fresh_database` empties the database and refills it with the demo data
     before each test, so tests never see each other's changes.
  3. The `*_headers` fixtures log in as a particular role and give you the
     Authorization header to put on a request.
"""

import os
import shutil
import sys
import tempfile
from pathlib import Path

import bcrypt
import pytest

# --- 1. Point the app at a throw-away database BEFORE importing it --------
BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

TMP_DIR = Path(tempfile.mkdtemp(prefix="neuroface-tests-"))
os.environ["DATABASE_URL"] = f"sqlite:///{TMP_DIR / 'neuroface_test.db'}"
os.environ["UPLOAD_DIR"] = str(TMP_DIR / "uploads")

# --- 2. Import the application ------------------------------------------
from fastapi.testclient import TestClient

import seed_data
from app.database.base import Base
from app.database.session import SessionLocal, engine
from app.main import app

# Passwords of the demo accounts created by seed_data.seed().
ADMIN_PASSWORD = seed_data.ADMIN_PASSWORD
HOD_PASSWORD = seed_data.HOD_PASSWORD
TEACHER_PASSWORD = seed_data.TEACHER_PASSWORD
STUDENT_PASSWORD = seed_data.STUDENT_PASSWORD


def fast_hash(password: str) -> str:
    """A bcrypt hash with few rounds - fast enough for a whole test suite."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=4)).decode("utf-8")


@pytest.fixture(scope="session", autouse=True)
def _remove_temp_folder():
    """Delete the temporary folder when the test session is over."""
    yield
    shutil.rmtree(TMP_DIR, ignore_errors=True)


@pytest.fixture(autouse=True)
def fresh_database(monkeypatch):
    """Give every test an empty database filled with the demo data."""
    # Use a cheap password hash so the suite does not spend all its time
    # waiting for bcrypt. `verify_password` still works with it.
    monkeypatch.setattr(seed_data, "get_password_hash", fast_hash)
    monkeypatch.setattr("app.core.security.get_password_hash", fast_hash)
    monkeypatch.setattr("app.api.v1.admin.get_password_hash", fast_hash)
    monkeypatch.setattr("app.api.v1.auth.get_password_hash", fast_hash)
    monkeypatch.setattr("app.api.v1.approvals.get_password_hash", fast_hash)

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        seed_data.seed(db)
    finally:
        db.close()

    yield


@pytest.fixture(scope="session")
def client():
    """A test client for the whole session (runs the startup code once)."""
    with TestClient(app) as test_client:
        yield test_client


def login(client: TestClient, username: str, password: str) -> dict:
    """Log in and return the Authorization header for the request."""
    response = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": username, "password": password},
    )
    assert response.status_code == 200, f"Login failed for {username}: {response.text}"
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


@pytest.fixture
def admin_headers(client):
    """Logged in as the system administrator."""
    return login(client, "admin", ADMIN_PASSWORD)


@pytest.fixture
def hod_headers(client):
    """Logged in as the Head of Department."""
    return login(client, "hod_mca", HOD_PASSWORD)


@pytest.fixture
def teacher_headers(client):
    """Logged in as a regular teacher (Prof. Rahul Verma)."""
    return login(client, "prof_rahul", TEACHER_PASSWORD)


@pytest.fixture
def other_teacher_headers(client):
    """Logged in as a different teacher (Prof. Sarah Thomas)."""
    return login(client, "prof_sarah", TEACHER_PASSWORD)


@pytest.fixture
def student_headers(client):
    """Logged in as student Arun Kumar (90% attendance)."""
    return login(client, "student_arun", STUDENT_PASSWORD)


@pytest.fixture
def priya_headers(client):
    """Logged in as student Priya Nair (80% attendance - condonation)."""
    return login(client, "student_priya", STUDENT_PASSWORD)


@pytest.fixture
def rohit_headers(client):
    """Logged in as student Rohit Sharma (70% attendance - detained)."""
    return login(client, "student_rohit", STUDENT_PASSWORD)


@pytest.fixture
def db():
    """A database session you can use to check what a request did."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
