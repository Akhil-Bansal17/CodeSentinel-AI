"""Operational Observability & Lightweight Metrics for CodeSentinel AI.

Tracks low-cardinality operational telemetry:
- Service uptime and process health
- HTTP request counts, status class distributions, and latencies
- HTTP error rates (4xx / 5xx)
- Database connectivity status
- Background task lifecycle aggregations

Strictly avoids high-cardinality labels (no raw URLs, filenames, query params, or user IDs).
Exposes zero sensitive secrets.
"""

import threading
import time
from typing import Any, Dict
from backend.app.core.config import settings
from backend.app.core.database import check_database_health
from backend.app.core.tasks import task_manager


class OperationalMetricsCollector:
    """Thread-safe collector for lightweight service operations metrics."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._start_time = time.time()
        self.reset()

    def reset(self) -> None:
        """Reset operational telemetry counters (used during test setup)."""
        with self._lock:
            self._requests_total = 0
            self._requests_by_method = {
                "GET": 0,
                "POST": 0,
                "PUT": 0,
                "DELETE": 0,
                "PATCH": 0,
                "OPTIONS": 0,
                "HEAD": 0,
                "OTHER": 0,
            }
            self._requests_by_status_class = {
                "2xx": 0,
                "3xx": 0,
                "4xx": 0,
                "5xx": 0,
                "other": 0,
            }
            self._total_duration_ms = 0.0
            self._errors_4xx = 0
            self._errors_5xx = 0

    def record_request(self, method: str, status_code: int, duration_ms: float) -> None:
        """Record an executed HTTP request in low-cardinality buckets."""
        clean_method = method.upper() if method.upper() in self._requests_by_method else "OTHER"

        if 200 <= status_code < 300:
            status_class = "2xx"
        elif 300 <= status_code < 400:
            status_class = "3xx"
        elif 400 <= status_code < 500:
            status_class = "4xx"
        elif 500 <= status_code < 600:
            status_class = "5xx"
        else:
            status_class = "other"

        with self._lock:
            self._requests_total += 1
            self._requests_by_method[clean_method] = self._requests_by_method.get(clean_method, 0) + 1
            self._requests_by_status_class[status_class] = self._requests_by_status_class.get(status_class, 0) + 1
            self._total_duration_ms += max(duration_ms, 0.0)

            if status_class == "4xx":
                self._errors_4xx += 1
            elif status_class == "5xx":
                self._errors_5xx += 1

    def get_metrics(self) -> Dict[str, Any]:
        """Generate sanitized, low-cardinality operational telemetry snapshot."""
        with self._lock:
            total_reqs = self._requests_total
            total_errors = self._errors_4xx + self._errors_5xx
            avg_duration = round(self._total_duration_ms / total_reqs, 2) if total_reqs > 0 else 0.0
            error_rate = round((total_errors / total_reqs) * 100.0, 2) if total_reqs > 0 else 0.0
            by_method = dict(self._requests_by_method)
            by_status = dict(self._requests_by_status_class)
            errors_4xx = self._errors_4xx
            errors_5xx = self._errors_5xx

        uptime = round(time.time() - self._start_time, 2)
        db_status = check_database_health()
        task_summary = task_manager.get_summary()

        return {
            "service": settings.SERVICE_NAME,
            "version": settings.VERSION,
            "environment": settings.ENVIRONMENT,
            "uptime_seconds": uptime,
            "database_status": db_status,
            "http": {
                "requests_total": total_reqs,
                "by_method": by_method,
                "by_status_class": by_status,
                "avg_duration_ms": avg_duration,
                "errors_total": total_errors,
                "errors_4xx": errors_4xx,
                "errors_5xx": errors_5xx,
                "error_rate_percent": error_rate,
            },
            "background_tasks": task_summary,
        }


# Global singleton metrics collector
metrics_collector = OperationalMetricsCollector()
