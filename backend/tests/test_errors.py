from fastapi import FastAPI
from fastapi.testclient import TestClient
from backend.app.core.exceptions import AppException, NotFoundError
from backend.app.main import create_application


def test_custom_app_exception_handling():
    """Verify that domain exceptions are rendered in uniform JSON error structure."""
    app = create_application()

    @app.get("/test-custom-error")
    def trigger_custom_error():
        raise NotFoundError(resource="Repository", identifier="repo-xyz")

    client = TestClient(app)
    response = client.get("/test-custom-error")
    assert response.status_code == 404

    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "NOT_FOUND"
    assert "repo-xyz" in data["error"]["message"]


def test_unhandled_exception_does_not_leak_internals():
    """Verify that unhandled server exceptions return 500 with generic safe message."""
    app = create_application()

    @app.get("/test-unhandled-crash")
    def trigger_crash():
        raise RuntimeError("super_secret_database_password_12345 in raw exception")

    client = TestClient(app, raise_server_exceptions=False)
    response = client.get("/test-unhandled-crash")
    assert response.status_code == 500

    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "INTERNAL_SERVER_ERROR"
    # Verify internal secret is NOT leaked to response
    assert "super_secret_database_password_12345" not in response.text


def test_validation_error_handling():
    """Verify that request validation failures return structured 422 errors."""
    app = create_application()
    client = TestClient(app)

    # Calling an endpoint that expects query parameter or body with invalid shape
    response = client.get("/api/health?extra_invalid=123")
    # Health endpoint ignores extra query, but let's test a route with typed param
    @app.get("/test-typed-param")
    def typed_route(count: int):
        return {"count": count}

    response = client.get("/test-typed-param?count=not_a_number")
    assert response.status_code == 422
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "VALIDATION_ERROR"
    assert "details" in data["error"]
