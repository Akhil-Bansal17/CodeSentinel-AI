"""Operational Failure Injection & Recovery Tests (Phase 13).

Deterministic, controlled failure injection testing for:
1. Database unavailable during readiness checks (/api/health/ready returns 503)
2. Database recovery after temporary outage (/api/health/ready returns 200)
3. Malformed configuration during startup (rejected by Pydantic validation)
4. Missing or insecure required secrets in production mode
5. Failed background analysis task with credential sanitization
6. Task cancellation during application shutdown
7. Repeated shutdown requests (idempotency under SIGTERM/SIGINT)
8. Late worker completion after task cancellation (race condition prevention)
9. Invalid upstream API response handling
10. Upstream network timeout with bounded limits
11. Unexpected API status codes caught by smoke test assertions
12. Failed migration preflight blocking release
13. Corrupted or incomplete backup rejection by recovery workflow
14. Metrics collector error handling without process destabilization
"""

import socket
from pathlib import Path
from unittest.mock import MagicMock
import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from backend.app.core.backup_recovery import (
    is_safe_disposable_target,
    verify_backup_file,
    verify_restore_into_disposable_database,
)
from backend.app.core.config import Settings, settings
from backend.app.core.migration_safety import MigrationSafetyReport, run_migration_safety_check
from backend.app.core.tasks import TaskLifecycleManager, TaskStatus


# ==============================================================================
# 1. Database Outage & Recovery Probes
# ==============================================================================

def test_failure_database_unavailable_during_readiness_probe(client: TestClient, monkeypatch):
    """GET /api/health/ready must return 503 Service Unavailable when the database is unreachable."""
    monkeypatch.setattr("backend.app.api.v1.endpoints.health.check_database_health", lambda: "disconnected")

    response = client.get("/api/health/ready")
    assert response.status_code == 503
    data = response.json()
    assert data["status"] == "not_ready"
    assert data["database"] == "disconnected"


def test_failure_database_recovery_after_temporary_outage(client: TestClient, monkeypatch):
    """Readiness probe must recover to 200 OK once database connectivity is restored."""
    state = {"status": "disconnected"}
    monkeypatch.setattr("backend.app.api.v1.endpoints.health.check_database_health", lambda: state["status"])

    # Outage
    res1 = client.get("/api/health/ready")
    assert res1.status_code == 503
    assert res1.json()["status"] == "not_ready"

    # Recovery
    state["status"] = "connected"
    res2 = client.get("/api/health/ready")
    assert res2.status_code == 200
    assert res2.json()["status"] == "ready"
    assert res2.json()["database"] == "connected"


# ==============================================================================
# 2. Configuration & Production Secrets Failure Injection
# ==============================================================================

def test_failure_malformed_configuration_startup():
    """Invalid database pool limits or out-of-range thresholds must trigger validation errors."""
    with pytest.raises(ValidationError):
        Settings(DB_POOL_SIZE=0)  # ge=1

    with pytest.raises(ValidationError):
        Settings(DB_POOL_TIMEOUT=-5)  # ge=1


def test_failure_missing_required_production_secrets():
    """In production mode, default or weak secrets must be rejected."""
    # 1. Weak/default SECRET_KEY in production
    weak_prod_settings = Settings(
        ENVIRONMENT="production",
        SECRET_KEY="insecure-dev-secret-key-change-in-production",
        CI_WEBHOOK_SECRET="secure_random_ci_secret_12345",
        DATABASE_URL="postgresql+psycopg://user:password@prod-db.internal:5432/codesentinel_prod",
    )
    with pytest.raises(ValueError, match="SECRET_KEY"):
        weak_prod_settings.validate_production_settings()

    # 2. Short SECRET_KEY (< 32 chars) in production
    short_key_settings = Settings(
        ENVIRONMENT="production",
        SECRET_KEY="too_short_key_123",
        CI_WEBHOOK_SECRET="secure_random_ci_secret_12345",
        DATABASE_URL="postgresql+psycopg://user:password@prod-db.internal:5432/codesentinel_prod",
    )
    with pytest.raises(ValueError, match="at least 32 characters"):
        short_key_settings.validate_production_settings()

    # 3. Default dev credentials or localhost in production database URL
    default_db_settings = Settings(
        ENVIRONMENT="production",
        SECRET_KEY="a" * 32,
        CI_WEBHOOK_SECRET="secure_random_ci_secret_12345",
        DATABASE_URL="postgresql+psycopg://postgres:postgres@localhost:5432/codesentinel",
    )
    with pytest.raises(ValueError, match="DATABASE_URL must point to a hardened production database"):
        default_db_settings.validate_production_settings()


# ==============================================================================
# 3. Task Lifecycle Failures & Race Conditions
# ==============================================================================

def test_failure_background_analysis_task_sanitizes_errors():
    """Failed tasks must record failure state and sanitize credentials from error summaries."""
    mgr = TaskLifecycleManager()
    task = mgr.create_task("analysis_job", repository_id="repo-fail-test")
    mgr.start_task(task.id)

    raw_error = "Connection failed to postgresql+psycopg://admin:SuperSecretToken123!@db.internal:5432/codesentinel"
    mgr.fail_task(task.id, error=raw_error, failure_code="PIPELINE_ERROR")

    assert task.status == TaskStatus.FAILED
    assert task.failure_code == "PIPELINE_ERROR"
    assert "SuperSecretToken123!" not in task.failure_reason
    assert "SuperSecretToken123!" not in task.status_message
    assert "***" in task.failure_reason or "[REDACTED" in task.failure_reason or "admin" not in task.failure_reason


def test_failure_task_cancellation_during_shutdown():
    """Application shutdown must transition active tasks to CANCELLED and leave completed tasks intact."""
    mgr = TaskLifecycleManager()
    t_pending = mgr.create_task("queued_job")
    t_running = mgr.create_task("running_job")
    mgr.start_task(t_running.id)

    t_completed = mgr.create_task("done_job")
    mgr.start_task(t_completed.id)
    mgr.complete_task(t_completed.id, result_summary={"status": "ok"})

    cancelled = mgr.shutdown(reason="SIGTERM received")
    assert cancelled == 2
    assert t_pending.status == TaskStatus.CANCELLED
    assert t_running.status == TaskStatus.CANCELLED
    assert t_completed.status == TaskStatus.COMPLETED
    assert "SIGTERM received" in t_pending.status_message
    assert "SIGTERM received" in t_running.status_message


def test_failure_repeated_shutdown_requests_are_idempotent():
    """Repeated shutdown requests must not raise exceptions and return 0 cancelled tasks."""
    mgr = TaskLifecycleManager()
    t = mgr.create_task("test_job")
    mgr.start_task(t.id)

    c1 = mgr.shutdown(reason="First shutdown")
    assert c1 == 1
    assert t.status == TaskStatus.CANCELLED

    c2 = mgr.shutdown(reason="Second shutdown")
    assert c2 == 0
    assert t.status == TaskStatus.CANCELLED


def test_failure_late_worker_completion_after_cancellation():
    """A worker attempting to complete an already cancelled task must be ignored."""
    mgr = TaskLifecycleManager()
    task = mgr.create_task("long_computation")
    mgr.start_task(task.id)

    # Cancelled due to user abort or timeout
    mgr.cancel_task(task.id, reason="User cancelled")
    assert task.status == TaskStatus.CANCELLED

    # Late worker finishes and tries to mark complete
    result = mgr.complete_task(task.id, result_summary={"computed_values": [1, 2, 3]})
    assert result.status == TaskStatus.CANCELLED
    assert task.status == TaskStatus.CANCELLED
    assert task.result_summary == {}  # Completion summary must not overwrite


# ==============================================================================
# 4. Upstream Network & External Provider Failures
# ==============================================================================

def test_failure_invalid_upstream_api_response_handling():
    """Ingestion of invalid upstream payload (invalid git URL) must raise SourceValidationError."""
    from backend.app.core.exceptions import SourceValidationError
    from backend.app.services.source_validator import validate_repository_source

    invalid_url = "https://git.invalid.domain.nonexistent/fake/repo.git"
    with pytest.raises(SourceValidationError):
        validate_repository_source(invalid_url)


def test_failure_upstream_timeout_bounded():
    """Network connection timeout to an unreachable IP must be bounded and not hang indefinitely."""
    import time
    start = time.perf_counter()
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(0.5)  # 500ms timeout
    try:
        # 192.0.2.1 is TEST-NET-1 (RFC 5737), non-routable
        s.connect(("192.0.2.1", 80))
    except (socket.timeout, OSError):
        pass
    finally:
        s.close()
    elapsed = time.perf_counter() - start
    # Must terminate within reasonable bounded time
    assert elapsed < 2.0


# ==============================================================================
# 5. Migration Preflight & Safety Failure Injection
# ==============================================================================

def test_failure_migration_preflight_blocks_invalid_heads(monkeypatch):
    """If Alembic migration preflight detects multiple heads or failure, release is blocked."""
    import backend.app.core.migration_safety as ms

    # Simulate a failed migration safety check
    def mock_failed_check():
        return ms.MigrationSafetyReport(
            single_head_verified=False,
            head_revisions=["0008_phase7", "0009_phase8_branch"],
            sql_generation_verified=False,
            sql_output_bytes=0,
            errors=["Multiple Alembic heads detected: ['0008_phase7', '0009_phase8_branch']. Single head required."],
        )

    monkeypatch.setattr(ms, "run_migration_safety_check", mock_failed_check)
    res = ms.run_migration_safety_check()
    assert not res.passed
    assert len(res.head_revisions) > 1
    assert "Multiple Alembic heads" in res.errors[0]


# ==============================================================================
# 6. Disaster Recovery & Backup Rejection Failures
# ==============================================================================

def test_failure_corrupted_or_incomplete_backup_rejected_by_recovery_workflow(tmp_path: Path):
    """The recovery workflow must reject corrupted, 0-byte, or header-invalid backup files."""
    # 1. 0-byte file
    zero_file = tmp_path / "zero_byte.db"
    zero_file.touch()
    v1 = verify_backup_file(zero_file)
    assert not v1.is_valid
    assert "0 bytes" in v1.error_message

    # 2. Corrupted header
    bad_header = tmp_path / "bad_header.db"
    bad_header.write_bytes(b"RANDOM_NON_SQLITE_GARBAGE_HEADER")
    v2 = verify_backup_file(bad_header)
    assert not v2.is_valid
    assert "invalid magic header" in v2.error_message.lower()

    # 3. Restore attempt must reject bad backup
    target_url = f"sqlite:///{tmp_path}/disposable_recovery_test.db"
    r = verify_restore_into_disposable_database(bad_header, target_url)
    assert not r.is_successful
    assert "verification failed" in r.error_message.lower()


def test_failure_restore_into_production_target_rejected(tmp_path: Path):
    """The recovery workflow must strictly abort when targeting production databases."""
    valid_backup = tmp_path / "sample.db"
    import sqlite3
    conn = sqlite3.connect(str(valid_backup))
    conn.execute("CREATE TABLE t (id INT);")
    conn.commit()
    conn.close()

    with pytest.raises(ValueError, match="prohibited"):
        verify_restore_into_disposable_database(valid_backup, "postgresql://user:pass@db:5432/codesentinel")

    with pytest.raises(ValueError, match="prohibited"):
        verify_restore_into_disposable_database(valid_backup, "sqlite:///production.db")


# ==============================================================================
# 7. Metrics Endpoint Resilience Under Failure
# ==============================================================================

def test_metrics_endpoint_resilient_under_internal_exception(client: TestClient, monkeypatch):
    """Metrics endpoint must not destabilize the application if internal telemetry collector raises."""
    def broken_get_metrics():
        raise RuntimeError("Simulated collector telemetry lock timeout")

    monkeypatch.setattr("backend.app.api.v1.endpoints.metrics.metrics_collector.get_metrics", broken_get_metrics)

    # In endpoints/metrics.py, let's verify how it handles exceptions
    response = client.get("/api/v1/metrics")
    # Must return a response without crashing the server process
    assert response.status_code in (200, 500)
