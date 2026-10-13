"""Pydantic schemas for static code analysis runs and findings."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class AnalysisRunCreateRequest(BaseModel):
    """Request payload to initiate a static analysis run."""

    snapshot_id: Optional[str] = Field(
        default=None,
        description="Optional snapshot ID to analyze. If omitted, latest completed snapshot is used.",
    )
    config: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Optional rule configuration overrides (e.g. complexity_threshold, function_length_threshold).",
    )


class AnalysisFindingResponse(BaseModel):
    """Schema representing an individual evidence-backed static analysis finding."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    analysis_run_id: str
    repository_id: str
    snapshot_id: str
    rule_id: str
    rule_name: str
    rule_version: str
    title: str
    description: str
    severity: str
    confidence: str = Field(default="MEDIUM", description="Confidence level (HIGH, MEDIUM, LOW)")
    category: str
    file_path: str
    start_line: int
    start_column: Optional[int] = None
    end_line: Optional[int] = None
    end_column: Optional[int] = None
    evidence_summary: str
    fingerprint: str
    metadata_json: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime


class RuleMetadataResponse(BaseModel):
    """Schema representing static analysis and security rule metadata."""

    rule_id: str
    name: str
    version: str
    category: str
    default_severity: str
    default_confidence: str
    language: str
    description: str
    why_it_matters: Optional[str] = None
    remediation: Optional[str] = None
    limitations: Optional[str] = None


class AnalysisFindingListResponse(BaseModel):
    """Paginated collection of analysis findings."""

    items: List[AnalysisFindingResponse]
    total: int
    page: int
    page_size: int


class AnalysisRunResponse(BaseModel):
    """Schema representing the status and metrics of an analysis run."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    repository_id: str
    snapshot_id: str
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    rule_set_version: str
    files_discovered: int
    files_analyzed: int
    files_skipped: int
    findings_count: int
    failure_code: Optional[str] = None
    failure_reason: Optional[str] = None
    summary_json: Dict[str, Any] = Field(default_factory=dict)


class AnalysisRunListResponse(BaseModel):
    """Paginated collection of analysis runs."""

    items: List[AnalysisRunResponse]
    total: int
    page: int
    page_size: int
