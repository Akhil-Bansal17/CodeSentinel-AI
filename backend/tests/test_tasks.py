"""Tests for Task Lifecycle Hardening & Reliability (Phase 12).

Verifies:
- Explicit task lifecycle states (PENDING -> RUNNING -> COMPLETED/FAILED/CANCELLED)
- Cancelled tasks cannot be marked COMPLETED by subsequent async completions
- Failed tasks cannot be marked COMPLETED
- Cancellation cannot overwrite already COMPLETED or FAILED tasks
- Error summaries in fail_task are strictly sanitized to prevent credential leakage
- Shutdown idempotency (repeated shutdowns are safe and return 0)
- Task summary metric generation for operational observability
"""

import pytest
from backend.app.core.tasks import TaskLifecycleManager, TaskRecord, TaskStatus


def test_task_creation_and_lifecycle_flow():
    """Verify standard happy path lifecycle transitions."""
    mgr = TaskLifecycleManager()
    task = mgr.create_task("analysis_job", repository_id="repo-123")
    assert task.status == TaskStatus.PENDING
    assert task.progress_percent == 0.0

    mgr.start_task(task.id, message="Starting AST parsing")
    assert task.status == TaskStatus.RUNNING
    assert task.started_at is not None

    mgr.update_progress(task.id, 50.0, message="Analyzing 50/100 files")
    assert task.progress_percent == 50.0

    mgr.complete_task(task.id, result_summary={"findings_count": 3}, message="Analysis complete")
    assert task.status == TaskStatus.COMPLETED
    assert task.progress_percent == 100.0
    assert task.completed_at is not None
    assert task.duration_seconds is not None
    assert task.duration_seconds >= 0.0


def test_cancelled_task_cannot_become_completed():
    """Cancelled tasks must reject completion attempts from late asynchronous threads."""
    mgr = TaskLifecycleManager()
    task = mgr.create_task("ingestion_job")
    mgr.start_task(task.id)

    # Task is cancelled (e.g. user abort or shutdown)
    mgr.cancel_task(task.id, reason="User cancelled operation")
    assert task.status == TaskStatus.CANCELLED

    # Late async thread attempts to call complete_task
    mgr.complete_task(task.id, result_summary={"files": 10})

    # Status MUST remain CANCELLED
    assert task.status == TaskStatus.CANCELLED
    assert "User cancelled operation" in task.status_message


def test_failed_task_cannot_become_completed():
    """Failed tasks must reject completion attempts."""
    mgr = TaskLifecycleManager()
    task = mgr.create_task("indexing_job")
    mgr.start_task(task.id)

    mgr.fail_task(task.id, error="Index parsing exception", failure_code="PARSE_ERROR")
    assert task.status == TaskStatus.FAILED

    # Late completion attempt
    mgr.complete_task(task.id, result_summary={"indexed_chunks": 42})

    # Status MUST remain FAILED
    assert task.status == TaskStatus.FAILED
    assert task.failure_code == "PARSE_ERROR"


def test_cancel_cannot_overwrite_terminal_completed_or_failed():
    """Calling cancel on already completed or failed tasks must not change their terminal status."""
    mgr = TaskLifecycleManager()

    # Completed task
    t_comp = mgr.create_task("task_completed")
    mgr.start_task(t_comp.id)
    mgr.complete_task(t_comp.id)
    mgr.cancel_task(t_comp.id, reason="Late cancellation")
    assert t_comp.status == TaskStatus.COMPLETED

    # Failed task
    t_fail = mgr.create_task("task_failed")
    mgr.start_task(t_fail.id)
    mgr.fail_task(t_fail.id, error="Disk full")
    mgr.cancel_task(t_fail.id, reason="Late cancellation")
    assert t_fail.status == TaskStatus.FAILED


def test_fail_task_sanitizes_credentials():
    """Error messages containing passwords, tokens, or connection strings must be redacted."""
    mgr = TaskLifecycleManager()
    task = mgr.create_task("auth_job")
    mgr.start_task(task.id)

    sensitive_error = (
        "Failed connection to postgresql+psycopg://admin:SuperSecretPass123!@db.internal:5432/db "
        "with token=ghp_ABC123456789SecretToken and Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xyz"
    )
    mgr.fail_task(task.id, error=sensitive_error)

    assert "SuperSecretPass123!" not in task.failure_reason
    assert "ghp_ABC123456789SecretToken" not in task.failure_reason
    assert "******" in task.failure_reason


def test_shutdown_idempotency():
    """Repeated calls to shutdown() must be idempotent and cancel active tasks only once."""
    mgr = TaskLifecycleManager()
    t1 = mgr.create_task("job_1")
    t2 = mgr.create_task("job_2")
    mgr.start_task(t2.id)
    t3 = mgr.create_task("job_3")
    mgr.start_task(t3.id)
    mgr.complete_task(t3.id)

    # First shutdown cancels t1 and t2 (2 tasks)
    first_cancelled = mgr.shutdown(reason="Graceful server termination")
    assert first_cancelled == 2
    assert t1.status == TaskStatus.CANCELLED
    assert t2.status == TaskStatus.CANCELLED
    assert t3.status == TaskStatus.COMPLETED

    # Second shutdown must be a safe no-op returning 0
    second_cancelled = mgr.shutdown(reason="Repeated shutdown call")
    assert second_cancelled == 0


def test_task_summary_metrics():
    """Verify get_summary() aggregate counts accurately reflect current registry."""
    mgr = TaskLifecycleManager()
    t_pend = mgr.create_task("task_pending")
    t_run = mgr.create_task("task_running")
    mgr.start_task(t_run.id)
    t_comp = mgr.create_task("task_completed")
    mgr.start_task(t_comp.id)
    mgr.complete_task(t_comp.id)
    t_fail = mgr.create_task("task_failed")
    mgr.start_task(t_fail.id)
    mgr.fail_task(t_fail.id, error="Failed")
    t_canc = mgr.create_task("task_cancelled")
    mgr.cancel_task(t_canc.id)

    summary = mgr.get_summary()
    assert summary["total_tracked"] == 5
    assert summary["pending"] == 1
    assert summary["running"] == 1
    assert summary["completed"] == 1
    assert summary["failed"] == 1
    assert summary["cancelled"] == 1
