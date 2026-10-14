"""API endpoints for Codebase Health Intelligence (Phase 5)."""

from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.exceptions import NotFoundError
from backend.app.schemas.health import (
    CodebaseHealthListResponse,
    CodebaseHealthResponse,
    HealthDimensionResponse,
)
from backend.app.services.health.health_service import CodebaseHealthService

repo_health_router = APIRouter(prefix="/repositories", tags=["Codebase Health Intelligence"])
health_assessments_router = APIRouter(prefix="/health-assessments", tags=["Codebase Health Intelligence"])


def _serialize_assessment(assessment) -> CodebaseHealthResponse:
    """Helper to convert CodebaseHealthAssessment model to response schema."""
    raw_dims = assessment.dimensions_json or {}
    dimensions = {
        k: HealthDimensionResponse(
            name=v.get("name", k),
            score=v.get("score"),
            status=v.get("status", "UNAVAILABLE"),
            weight=v.get("weight", 0.0),
            contribution=v.get("contribution"),
            metrics=v.get("metrics", {}),
            reasons=v.get("reasons", []),
        )
        for k, v in raw_dims.items()
    }
    metrics = assessment.metrics_json or {}

    return CodebaseHealthResponse(
        id=assessment.id,
        repository_id=assessment.repository_id,
        snapshot_id=assessment.snapshot_id,
        scoring_version=assessment.scoring_version,
        overall_score=assessment.overall_score,
        status=assessment.status,
        dimensions=dimensions,
        contributing_runs=metrics.get("contributing_runs", {}),
        missing_inputs=metrics.get("missing_inputs", []),
        recommendations=assessment.recommendations_json or [],
        assessed_at=assessment.created_at.isoformat() if assessment.created_at else "",
    )


@repo_health_router.get(
    "/{repository_id}/health",
    response_model=CodebaseHealthResponse,
    summary="Retrieve or compute deterministic codebase health assessment",
)
def get_repository_health(
    repository_id: str,
    snapshot_id: Optional[str] = Query(None, description="Optional snapshot ID (defaults to latest completed)"),
    db: Session = Depends(get_db),
) -> CodebaseHealthResponse:
    """Calculates multi-dimensional health score across Maintainability, Security, Architecture, SCA, and Coverage."""
    service = CodebaseHealthService(db)
    assessment = service.get_or_compute_health(repository_id=repository_id, snapshot_id=snapshot_id)
    return _serialize_assessment(assessment)


@repo_health_router.get(
    "/{repository_id}/health/history",
    response_model=CodebaseHealthListResponse,
    summary="List historical codebase health assessments for a repository",
)
def list_repository_health_history(
    repository_id: str,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
) -> CodebaseHealthListResponse:
    """List historical health assessments for a repository with pagination."""
    service = CodebaseHealthService(db)
    assessments, total = service.list_assessments_for_repository(
        repository_id=repository_id,
        page=page,
        page_size=page_size,
    )
    return CodebaseHealthListResponse(
        items=[_serialize_assessment(a) for a in assessments],
        total=total,
        page=page,
        page_size=page_size,
    )


@health_assessments_router.get(
    "/{assessment_id}",
    response_model=CodebaseHealthResponse,
    summary="Retrieve a specific codebase health assessment by ID",
)
def get_health_assessment(
    assessment_id: str,
    db: Session = Depends(get_db),
) -> CodebaseHealthResponse:
    """Retrieve an assessment by its primary key."""
    service = CodebaseHealthService(db)
    assessment = service.get_assessment_by_id(assessment_id)
    if not assessment:
        raise NotFoundError("CodebaseHealthAssessment", assessment_id)
    return _serialize_assessment(assessment)
