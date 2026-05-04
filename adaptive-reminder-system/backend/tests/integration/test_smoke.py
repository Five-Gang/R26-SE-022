"""Smoke test: app boots, root endpoint responds, health endpoint responds.

If this fails, nothing else will work. Run this first when something feels off.
"""

from fastapi.testclient import TestClient


def test_root_returns_metadata(client: TestClient) -> None:
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"name": "Adaptive Reminder System", "docs": "/docs"}


def test_health_endpoint_returns_ok(client: TestClient) -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_openapi_schema_is_served(client: TestClient) -> None:
    """Auto-generated OpenAPI schema is the heart of FastAPI's value prop."""
    response = client.get("/openapi.json")
    assert response.status_code == 200
    schema = response.json()
    assert schema["info"]["title"] == "Adaptive Reminder System"
