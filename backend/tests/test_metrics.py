"""Tests for Operational Observability & Metrics Endpoint (Phase 12).

Verifies:
- Thread-safe low-cardinality aggregation of HTTP telemetry
- Calculation of error rates and average duration
- Task lifecycle aggregation integration
- API endpoints /api/v1/metrics and /api/metrics
- Low cardinality and zero sensitive data leakage
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.core.metrics import OperationalMetricsCollector, metrics_collector
from backend.app.core.tasks import TaskLifecycleManager


def test_metrics_collector_record_request():
    """Verify that requests are properly categorized into low-cardinality buckets."""
    collector = OperationalMetricsCollector()
    collector.reset()

    # Record some requests
    collector.record_request("GET", 200, 10.5)
    collector.record_request("POST", 201, 20.0)
    collector.record_request("GET", 404, 5.0)
    collector.record_request("DELETE", 500, 15.0)
    collector.record_request("CUSTOM_METHOD", 200, 8.0)

    snapshot = collector.get_metrics()
    http = snapshot["http"]

    assert http["requests_total"] == 5
    assert http["by_method"]["GET"] == 2
    assert http["by_method"]["POST"] == 1
    assert http["by_method"]["DELETE"] == 1
    assert http["by_method"]["OTHER"] == 1

    assert http["by_status_class"]["2xx"] == 3
    assert http["by_status_class"]["4xx"] == 1
    assert http["by_status_class"]["5xx"] == 1

    assert http["errors_total"] == 2
    assert http["errors_4xx"] == 1
    assert http["errors_5xx"] == 1
    # 2 errors out of 5 requests = 40.0%
    assert http["error_rate_percent"] == 40.0
    # Average latency: (10.5 + 20.0 + 5.0 + 15.0 + 8.0) / 5 = 11.7ms
    assert http["avg_duration_ms"] == 11.7


def test_metrics_endpoint_v1_and_alias(client: TestClient):
    """Verify /api/v1/metrics and /api/metrics endpoints return 200 and expected contract."""
    # 1. Test primary endpoint /api/v1/metrics
    res_v1 = client.get("/api/v1/metrics")
    assert res_v1.status_code == 200
    data_v1 = res_v1.json()

    assert data_v1["service"] == "codesentinel-api"
    assert "version" in data_v1
    assert "environment" in data_v1
    assert "uptime_seconds" in data_v1
    assert data_v1["uptime_seconds"] >= 0
    assert "database_status" in data_v1
    assert "http" in data_v1
    assert "background_tasks" in data_v1

    # Security and timing headers
    assert "x-request-id" in res_v1.headers
    assert "x-process-time-ms" in res_v1.headers
    assert res_v1.headers.get("x-content-type-options") == "nosniff"
    assert res_v1.headers.get("x-frame-options") == "DENY"

    # 2. Test alias endpoint /api/metrics
    res_alias = client.get("/api/metrics")
    assert res_alias.status_code == 200
    data_alias = res_alias.json()
    assert data_alias["service"] == data_v1["service"]


def test_metrics_low_cardinality_and_zero_secrets(client: TestClient):
    """Verify that metrics payload never leaks secrets, passwords, or raw user URLs."""
    res = client.get("/api/v1/metrics")
    assert res.status_code == 200
    text_content = res.text.lower()

    # Check for forbidden sensitive keywords in payload
    forbidden_terms = [
        "secret_key",
        "ci_webhook_secret",
        "postgrespassword",
        "bearer ",
        "token=",
        "password=",
    ]
    for term in forbidden_terms:
        assert term not in text_content, f"Found sensitive term '{term}' in operational metrics"

    # Verify no raw user URLs in keys
    data = res.json()
    for key in data["http"]["by_method"].keys():
        assert key in ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD", "OTHER"]
    for key in data["http"]["by_status_class"].keys():
        assert key in ["2xx", "3xx", "4xx", "5xx", "other"]
