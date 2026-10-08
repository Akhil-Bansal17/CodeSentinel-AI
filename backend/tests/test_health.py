from fastapi.testclient import TestClient
from backend.app.schemas.health import HealthResponse


def test_health_endpoint_success(client: TestClient):
    """Verify that GET /api/health returns 200 and matches the expected contract."""
    response = client.get("/api/health")
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "codesentinel-api"
    assert data["version"] == "0.1.0"
    assert "database" in data
    assert "environment" in data


def test_health_endpoint_schema_validation(client: TestClient):
    """Verify that the response payload strictly adheres to the HealthResponse schema."""
    response = client.get("/api/health")
    assert response.status_code == 200

    health_obj = HealthResponse(**response.json())
    assert health_obj.status == "ok"
    assert health_obj.service == "codesentinel-api"
    assert health_obj.version == "0.1.0"


def test_health_endpoint_response_headers(client: TestClient):
    """Verify that security and timing headers are attached to responses."""
    response = client.get("/api/health")
    assert response.status_code == 200
    assert "x-process-time-ms" in response.headers
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
