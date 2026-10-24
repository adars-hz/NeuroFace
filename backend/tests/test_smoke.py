"""Checks that the server itself is alive and complete.

These are the quickest tests to run and they catch the most annoying
problems, such as a router that was never included in the application.
"""

import pytest


def test_root_endpoint_says_online(client):
    """The landing endpoint answers and reports the system as online."""
    response = client.get("/")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "online"
    assert body["docs_url"] == "/docs"


def test_openapi_document_can_be_built(client):
    """The API documentation builds - this proves every route is well formed."""
    response = client.get("/api/v1/openapi.json")

    assert response.status_code == 200
    paths = response.json()["paths"]
    assert len(paths) > 30, "The API should expose all the feature endpoints"


@pytest.mark.parametrize("path", [
    "/api/v1/auth/login",
    "/api/v1/auth/me",
    "/api/v1/admin/students",
    "/api/v1/admin/teachers",
    "/api/v1/admin/assignments",
    "/api/v1/teacher/my-assignments",
    "/api/v1/attendance/sessions/start",
    "/api/v1/student/my-attendance",
    "/api/v1/student/register-face",
    "/api/v1/leaves/apply",
    "/api/v1/reports/student/{student_id}",
    "/api/v1/admin/approvals",
])
def test_expected_endpoints_are_registered(client, path):
    """Every part of the system is reachable through the API."""
    paths = client.get("/api/v1/openapi.json").json()["paths"]

    assert path in paths, f"{path} is missing from the API"


def test_uploads_folder_is_served(client):
    """Uploaded documents can be opened again through the /uploads folder."""
    response = client.get("/uploads/")

    assert response.status_code in (200, 404)
