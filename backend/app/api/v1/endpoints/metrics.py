"""Operational metrics endpoint for CodeSentinel AI.

Exposes low-cardinality runtime telemetry:
- Service uptime
- HTTP request counts, status class distributions, and latencies
- HTTP error rates
- Database connectivity state
- Background task lifecycle counts

Zero credentials, tokens, repository code, or user identifiers are exposed.
"""

from typing import Any, Dict
from fastapi import APIRouter
from backend.app.core.metrics import metrics_collector

router = APIRouter()


@router.get("/metrics", summary="Retrieve operational service metrics", response_model=Dict[str, Any])
def get_operational_metrics() -> Dict[str, Any]:
    """Retrieve current operational observability metrics for monitoring and staging verification."""
    return metrics_collector.get_metrics()
