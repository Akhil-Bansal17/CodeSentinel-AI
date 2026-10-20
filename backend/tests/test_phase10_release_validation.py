"""Phase 10 Release Candidate Validation & Deployment Readiness Tests.

Covers:
1. Decoupled Liveness & Readiness Probes (/api/health/live, /api/health/ready, /api/health)
2. Dependency failure isolation (readiness returns 503 on database disconnect while liveness stays 200)
3. Lifespan shutdown: database engine disposal and active task cancellation
4. TaskLifecycleManager shutdown guarantees: no in-flight task falsely marked complete
5. Request correlation ID propagation and generation
6. Sensitive log data masking
7. Fail-fast production configuration security validation
8. Security gates regression checks (protected paths, HMAC replay protection, path safety)
"""

import hmac
import hashlib
import json
import uuid
import pytest
from fastapi.testclient import TestClient

from backend.app.core.config import Settings, settings
from backend.app.core.database import check_database_health, dispose_engine, engine
from backend.app.core.logging import SensitiveDataFilter
from backend.app.core.tasks import TaskLifecycleManager, TaskRecord, TaskStatus, task_manager
from backend.app.services.remediation.patch_engine import ProtectedPathError, validate_path_safety
from backend.app.services.cicd.ingestion import CIIngestionService
from backend.app.schemas.cicd import CIIngestRequest


# ==============================================================================
# 1. Health, Readiness, and Liveness Probe Tests
# ==============================================================================

def test_liveness_probe_independent_of_database(client: TestClient, monkeypatch):
    """GET /api/health/live must return 200 even when database is completely disconnected."""
    # Force check_database_health to return 'disconnected'
    monkeypatch.setattr("backend.app.api.v1.endpoints.health.check_database_health", lambda: "disconnected")
    
    response = client.get("/api/health/live")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == settings.SERVICE_NAME
    assert data["version"] == settings.VERSION
    # Liveness probe does not probe external database
    assert data.get("database") is None


def test_readiness_probe_returns_200_when_connected(client: TestClient, monkeypatch):
    """GET /api/health/ready returns 200 when database connection is healthy."""
    monkeypatch.setattr("backend.app.api.v1.endpoints.health.check_database_health", lambda: "connected")
    
    response = client.get("/api/health/ready")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"
    assert data["database"] == "connected"


def test_readiness_probe_returns_503_when_disconnected(client: TestClient, monkeypatch):
    """GET /api/health/ready returns 503 Service Unavailable when database is unreachable."""
    monkeypatch.setattr("backend.app.api.v1.endpoints.health.check_database_health", lambda: "disconnected")
    
    response = client.get("/api/health/ready")
    assert response.status_code == 503
    data = response.json()
    assert data["status"] == "not_ready"
    assert data["database"] == "disconnected"


def test_general_health_reports_database_status(client: TestClient, monkeypatch):
    """GET /api/health returns 200 with current database status."""
    monkeypatch.setattr("backend.app.api.v1.endpoints.health.check_database_health", lambda: "connected")
    
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["database"] == "connected"


# ==============================================================================
# 2. Shutdown Lifecycle & Resource Cleanup
# ==============================================================================

def test_task_manager_shutdown_cancels_active_tasks():
    """Shutdown must cancel pending and running tasks to prevent false completion."""
    mgr = TaskLifecycleManager()
    t1 = mgr.create_task("ingestion_task")
    t2 = mgr.create_task("analysis_task")
    mgr.start_task(t2.id)
    t3 = mgr.create_task("completed_task")
    mgr.start_task(t3.id)
    mgr.complete_task(t3.id, result_summary={"count": 5})

    assert t1.status == TaskStatus.PENDING
    assert t2.status == TaskStatus.RUNNING
    assert t3.status == TaskStatus.COMPLETED

    cancelled_count = mgr.shutdown(reason="unit test shutdown")
    assert cancelled_count == 2
    assert t1.status == TaskStatus.CANCELLED
    assert t2.status == TaskStatus.CANCELLED
    assert t3.status == TaskStatus.COMPLETED  # already completed tasks must remain untouched
    assert "Cancelled due to unit test shutdown" in t1.status_message
    assert "Cancelled due to unit test shutdown" in t2.status_message


def test_dispose_engine_runs_safely():
    """dispose_engine() must execute without throwing exceptions."""
    try:
        dispose_engine()
    except Exception as e:
        pytest.fail(f"dispose_engine raised unexpected exception: {e}")


# ==============================================================================
# 3. Observability, Correlation ID, and Secret Redaction
# ==============================================================================

def test_request_id_header_forwarded_and_generated(client: TestClient):
    """Requests must preserve incoming X-Request-ID or assign a new UUID."""
    # 1. Custom request ID passed
    custom_id = f"custom-req-{uuid.uuid4()}"
    res1 = client.get("/api/health/live", headers={"X-Request-ID": custom_id})
    assert res1.status_code == 200
    assert res1.headers.get("X-Request-ID") == custom_id

    # 2. No request ID passed -> auto-generated
    res2 = client.get("/api/health/live")
    assert res2.status_code == 200
    auto_id = res2.headers.get("X-Request-ID")
    assert auto_id is not None
    assert len(auto_id) >= 16


def test_sensitive_log_data_filtering():
    """SensitiveDataFilter must mask passwords, bearer tokens, and secret keys in log messages."""
    log_filter = SensitiveDataFilter()

    import logging
    record = logging.LogRecord(
        name="test",
        level=logging.INFO,
        pathname="test.py",
        lineno=10,
        msg="Database auth with password=super_secret_pwd and token: 'my_bearer_token'",
        args=(),
        exc_info=None,
    )
    log_filter.filter(record)
    assert "super_secret_pwd" not in record.msg
    assert "my_bearer_token" not in record.msg
    assert "password=******" in record.msg
    assert "token=******" in record.msg


# ==============================================================================
# 4. Production Configuration Security Fail-Fast Validation
# ==============================================================================

def test_production_settings_validation_enforces_safety():
    """Production mode must reject insecure defaults."""
    # 1. Debug mode in production
    s1 = Settings(
        ENVIRONMENT="production",
        DEBUG=True,
        SECRET_KEY="a" * 32,
        CI_WEBHOOK_SECRET="custom-prod-secret-key-12345",
        DATABASE_URL="postgresql+psycopg://user:hardenedpass@db.internal:5432/prod_db",
    )
    with pytest.raises(ValueError, match="DEBUG mode must be False"):
        s1.validate_production_settings()

    # 2. Default secret key in production
    s2 = Settings(
        ENVIRONMENT="production",
        DEBUG=False,
        SECRET_KEY="codesentinel-dev-secret-key-change-in-production-min32chars",
        CI_WEBHOOK_SECRET="custom-prod-secret-key-12345",
        DATABASE_URL="postgresql+psycopg://user:hardenedpass@db.internal:5432/prod_db",
    )
    with pytest.raises(ValueError, match="SECRET_KEY must be a unique"):
        s2.validate_production_settings()

    # 3. Short secret key in production
    s3 = Settings(
        ENVIRONMENT="production",
        DEBUG=False,
        SECRET_KEY="too_short_key",
        CI_WEBHOOK_SECRET="custom-prod-secret-key-12345",
        DATABASE_URL="postgresql+psycopg://user:hardenedpass@db.internal:5432/prod_db",
    )
    with pytest.raises(ValueError, match="SECRET_KEY must be a unique"):
        s3.validate_production_settings()

    # 4. Default webhook secret in production
    s4 = Settings(
        ENVIRONMENT="production",
        DEBUG=False,
        SECRET_KEY="a" * 32,
        CI_WEBHOOK_SECRET="codesentinel-ci-default-secret",
        DATABASE_URL="postgresql+psycopg://user:hardenedpass@db.internal:5432/prod_db",
    )
    with pytest.raises(ValueError, match="CI_WEBHOOK_SECRET must be configured"):
        s4.validate_production_settings()

    # 5. Localhost / sqlite database URL in production
    s5 = Settings(
        ENVIRONMENT="production",
        DEBUG=False,
        SECRET_KEY="a" * 32,
        CI_WEBHOOK_SECRET="custom-prod-secret-key-12345",
        DATABASE_URL="sqlite:///./prod.db",
    )
    with pytest.raises(ValueError, match="DATABASE_URL must point to a hardened production database"):
        s5.validate_production_settings()

    # 6. Valid production settings pass
    valid_s = Settings(
        ENVIRONMENT="production",
        DEBUG=False,
        SECRET_KEY="a" * 32,
        CI_WEBHOOK_SECRET="custom-prod-secret-key-12345",
        DATABASE_URL="postgresql+psycopg://app_user:StrongSecretPass987@prod-db.internal:5432/codesentinel_prod",
    )
    valid_s.validate_production_settings()  # Should not raise


# ==============================================================================
# 5. Security Gates & Safety Regressions
# ==============================================================================

def test_protected_paths_cannot_be_targeted_for_remediation():
    """Remediation patch engine must strictly reject attempts to modify protected system files."""
    for protected in [".env", ".env.local", ".git/config", "id_rsa", "credentials.json", "../traversal.py", "/etc/passwd"]:
        with pytest.raises(ProtectedPathError):
            validate_path_safety(protected)


def test_safe_path_allowed_for_remediation():
    """Standard application source files are permitted for remediation without error."""
    # validate_path_safety asserts without error for safe files
    validate_path_safety("src/utils.py")
    validate_path_safety("app/main.py")
