"""Pydantic schemas for Codebase Health Intelligence and Service Health APIs."""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Schema for the GET /api/health endpoint response."""

    status: str = Field(..., description="Overall service status, e.g. ok")
    service: str = Field(..., description="Service identifier name")
    version: str = Field(..., description="Service version string")
    database: Optional[str] = Field(default=None, description="Database connection health status")
    environment: Optional[str] = Field(default=None, description="Active execution environment")

    model_config = {
        "json_schema_extra": {
            "example": {
                "status": "ok",
                "service": "codesentinel-api",
                "version": "0.1.0",
                "database": "connected",
                "environment": "development",
            }
        }
    }


class HealthDimensionResponse(BaseModel):
    """Health dimension response schema."""

    name: str
    score: Optional[float] = None
    status: str
    weight: float
    contribution: Optional[float] = None
    metrics: Dict[str, Any] = Field(default_factory=dict)
    reasons: List[str] = Field(default_factory=list)


class RecommendationResponse(BaseModel):
    """Actionable codebase recommendation."""

    priority: str
    dimension: str
    title: str
    action: str


class CodebaseHealthResponse(BaseModel):
    """Overall codebase health assessment response schema."""

    id: Optional[str] = None
    repository_id: str
    snapshot_id: str
    scoring_version: str = "1.0.0"
    overall_score: Optional[float] = None
    status: str = "completed"
    dimensions: Dict[str, HealthDimensionResponse] = Field(default_factory=dict)
    contributing_runs: Dict[str, Optional[str]] = Field(default_factory=dict)
    missing_inputs: List[str] = Field(default_factory=list)
    recommendations: List[Dict[str, Any]] = Field(default_factory=list)
    assessed_at: str


class CodebaseHealthListResponse(BaseModel):
    """Paginated list of historical codebase health assessments."""

    items: List[CodebaseHealthResponse] = Field(default_factory=list)
    total: int
    page: int
    page_size: int

