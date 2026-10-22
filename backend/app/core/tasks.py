"""Core task lifecycle manager for tracking background and long-running operations.

Provides explicit status transitions: PENDING -> RUNNING -> (COMPLETED | FAILED | CANCELLED),
with timestamps, progress tracking, timeout enforcement, and sanitized error summaries.
"""

import threading
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from backend.app.core.logging import logger


class TaskStatus(str, Enum):
    """Lifecycle states for asynchronous tasks."""

    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class TaskRecord:
    """Represents a tracked task lifecycle entry."""

    id: str
    task_type: str
    repository_id: Optional[str] = None
    status: TaskStatus = TaskStatus.PENDING
    progress_percent: float = 0.0
    status_message: Optional[str] = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    timeout_seconds: int = 300
    failure_code: Optional[str] = None
    failure_reason: Optional[str] = None
    result_summary: Dict[str, Any] = field(default_factory=dict)

    @property
    def duration_seconds(self) -> Optional[float]:
        """Calculates runtime duration in seconds."""
        if not self.started_at:
            return None
        end_time = self.completed_at or datetime.now(timezone.utc)
        return round((end_time - self.started_at).total_seconds(), 2)

    def to_dict(self) -> Dict[str, Any]:
        """Serialize to a safe JSON-compatible dictionary."""
        return {
            "id": self.id,
            "task_type": self.task_type,
            "repository_id": self.repository_id,
            "status": self.status.value,
            "progress_percent": self.progress_percent,
            "status_message": self.status_message,
            "created_at": self.created_at.isoformat(),
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "duration_seconds": self.duration_seconds,
            "failure_code": self.failure_code,
            "failure_reason": self.failure_reason,
            "result_summary": self.result_summary,
        }


class TaskLifecycleManager:
    """Thread-safe in-memory task registry for long-running workflows."""

    def __init__(self) -> None:
        self._tasks: Dict[str, TaskRecord] = {}
        self._lock = threading.Lock()
        self._is_shutdown = False


    def create_task(
        self,
        task_type: str,
        repository_id: Optional[str] = None,
        timeout_seconds: int = 300,
    ) -> TaskRecord:
        """Register a new pending task."""
        task_id = str(uuid.uuid4())
        record = TaskRecord(
            id=task_id,
            task_type=task_type,
            repository_id=repository_id,
            status=TaskStatus.PENDING,
            timeout_seconds=timeout_seconds,
            status_message="Task registered and queued for execution",
        )
        with self._lock:
            self._tasks[task_id] = record
        logger.info("Created background task [%s] type=%s repo=%s", task_id, task_type, repository_id)
        return record

    def start_task(self, task_id: str, message: Optional[str] = None) -> TaskRecord:
        """Mark task as running with start timestamp."""
        with self._lock:
            record = self._tasks.get(task_id)
            if not record:
                raise KeyError(f"Task not found: {task_id}")
            if record.status in (TaskStatus.CANCELLED, TaskStatus.FAILED, TaskStatus.COMPLETED):
                logger.warning("Cannot start task [%s] already in terminal state %s", task_id, record.status.value)
                return record
            record.status = TaskStatus.RUNNING
            record.started_at = datetime.now(timezone.utc)
            record.status_message = message or "Task execution in progress"
            logger.info("Started background task [%s]", task_id)
            return record

    def update_progress(self, task_id: str, percent: float, message: Optional[str] = None) -> TaskRecord:
        """Update percentage progress and optional status message."""
        with self._lock:
            record = self._tasks.get(task_id)
            if not record:
                raise KeyError(f"Task not found: {task_id}")
            if record.status in (TaskStatus.CANCELLED, TaskStatus.FAILED, TaskStatus.COMPLETED):
                return record
            record.progress_percent = min(max(percent, 0.0), 100.0)
            if message:
                record.status_message = message
            return record

    def complete_task(
        self,
        task_id: str,
        result_summary: Optional[Dict[str, Any]] = None,
        message: str = "Task completed successfully",
    ) -> TaskRecord:
        """Mark task as successfully completed.

        Guarantees that a task which failed or was cancelled cannot be marked completed.
        """
        with self._lock:
            record = self._tasks.get(task_id)
            if not record:
                raise KeyError(f"Task not found: {task_id}")
            if record.status == TaskStatus.CANCELLED:
                logger.warning("Ignoring completion attempt for cancelled task [%s]", task_id)
                return record
            if record.status == TaskStatus.FAILED:
                logger.warning("Ignoring completion attempt for failed task [%s]", task_id)
                return record
            record.status = TaskStatus.COMPLETED
            record.progress_percent = 100.0
            record.completed_at = datetime.now(timezone.utc)
            record.status_message = message
            if result_summary:
                record.result_summary = result_summary
            logger.info("Completed background task [%s] in %ss", task_id, record.duration_seconds)
            return record

    def fail_task(
        self,
        task_id: str,
        error: Any,
        failure_code: str = "TASK_EXECUTION_FAILED",
    ) -> TaskRecord:
        """Mark task as failed with sanitized error summary."""
        raw_msg = str(error)
        clean_msg = raw_msg[:300] if len(raw_msg) > 300 else raw_msg
        # Sanitize error message to prevent leaking passwords, tokens or credentials
        from backend.app.core.logging import sanitize_log_text
        clean_msg = sanitize_log_text(clean_msg)

        with self._lock:
            record = self._tasks.get(task_id)
            if not record:
                raise KeyError(f"Task not found: {task_id}")
            if record.status == TaskStatus.CANCELLED:
                logger.info("Ignoring failure report for already cancelled task [%s]", task_id)
                return record
            record.status = TaskStatus.FAILED
            record.completed_at = datetime.now(timezone.utc)
            record.failure_code = failure_code
            record.failure_reason = clean_msg
            record.status_message = f"Failed: {clean_msg}"
            logger.warning("Failed background task [%s]: %s (%s)", task_id, clean_msg, failure_code)
            return record

    def cancel_task(self, task_id: str, reason: str = "Task cancelled by user") -> TaskRecord:
        """Mark task as cancelled if not already completed or failed."""
        with self._lock:
            record = self._tasks.get(task_id)
            if not record:
                raise KeyError(f"Task not found: {task_id}")
            if record.status in (TaskStatus.COMPLETED, TaskStatus.FAILED):
                logger.info("Ignoring cancellation for task [%s] already in terminal state %s", task_id, record.status.value)
                return record
            record.status = TaskStatus.CANCELLED
            record.completed_at = datetime.now(timezone.utc)
            record.status_message = reason
            logger.info("Cancelled background task [%s]: %s", task_id, reason)
            return record

    def get_task(self, task_id: str) -> Optional[TaskRecord]:
        """Retrieve task by identifier."""
        with self._lock:
            return self._tasks.get(task_id)

    def list_tasks(
        self,
        repository_id: Optional[str] = None,
        status: Optional[TaskStatus] = None,
        limit: int = 50,
    ) -> List[TaskRecord]:
        """List tasks optionally filtered by repository and status."""
        with self._lock:
            results = list(self._tasks.values())
            if repository_id:
                results = [r for r in results if r.repository_id == repository_id]
            if status:
                results = [r for r in results if r.status == status]
            # Order newest first
            results.sort(key=lambda r: r.created_at, reverse=True)
            return results[:limit]

    def get_summary(self) -> Dict[str, int]:
        """Return aggregate count of tasks by lifecycle state for observability metrics."""
        summary = {
            "pending": 0,
            "running": 0,
            "completed": 0,
            "failed": 0,
            "cancelled": 0,
            "total_tracked": 0,
        }
        with self._lock:
            for task in self._tasks.values():
                summary["total_tracked"] += 1
                if task.status == TaskStatus.PENDING:
                    summary["pending"] += 1
                elif task.status == TaskStatus.RUNNING:
                    summary["running"] += 1
                elif task.status == TaskStatus.COMPLETED:
                    summary["completed"] += 1
                elif task.status == TaskStatus.FAILED:
                    summary["failed"] += 1
                elif task.status == TaskStatus.CANCELLED:
                    summary["cancelled"] += 1
        return summary

    def shutdown(self, reason: str = "Application shutdown") -> int:
        """Cancel all pending or running tasks during application shutdown.

        Guarantees that no in-flight or queued task is falsely reported as complete.
        Is safe against repeated invocations (idempotent).
        Returns the number of cancelled tasks.
        """
        with self._lock:
            if self._is_shutdown:
                return 0
            cancelled_count = 0
            for task in self._tasks.values():
                if task.status in (TaskStatus.PENDING, TaskStatus.RUNNING):
                    task.status = TaskStatus.CANCELLED
                    task.completed_at = datetime.now(timezone.utc)
                    task.status_message = f"Cancelled due to {reason}"
                    cancelled_count += 1
            self._is_shutdown = True

        if cancelled_count > 0:
            logger.info("Task lifecycle manager shutdown: cancelled %d active tasks", cancelled_count)
        return cancelled_count



# Global singleton lifecycle manager
task_manager = TaskLifecycleManager()
