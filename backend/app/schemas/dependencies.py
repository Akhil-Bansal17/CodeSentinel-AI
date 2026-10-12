"""Pydantic schemas for Phase 3 Dependency Intelligence & Software Composition Analysis."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class DependencyRunCreateRequest(BaseModel):
    """Request payload to trigger a dependency analysis run."""

    model_config = ConfigDict(extra="forbid")

    snapshot_id: Optional[str] = Field(None, description="Specific snapshot ID. Defaults to latest completed.")
    config: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Optional configuration parameters.")


class DependencyRunResponse(BaseModel):
    """Execution run representation for dependency analysis."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    repository_id: str
    snapshot_id: str
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    advisory_dataset_version: Optional[str] = None
    parser_version: str
    matching_engine_version: str
    dependencies_discovered: int
    dependencies_resolved: int
    dependencies_unresolved: int
    vulnerabilities_count: int
    manifest_files_count: int
    failure_code: Optional[str] = None
    failure_reason: Optional[str] = None
    summary_json: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime


class DependencyRunListResponse(BaseModel):
    """Paginated list of historical dependency analysis runs."""

    items: List[DependencyRunResponse]
    total: int
    page: int
    page_size: int


class RepositoryDependencyResponse(BaseModel):
    """Discovered dependency record."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    dependency_run_id: str
    repository_id: str
    snapshot_id: str
    manifest_path: str
    lockfile_path: Optional[str] = None
    ecosystem: str
    package_name: str
    original_package_name: str
    version_constraint: Optional[str] = None
    resolved_version: Optional[str] = None
    dependency_type: str
    is_direct: Optional[bool] = None
    scope: Optional[str] = None
    parser_name: str
    parser_version: str
    status: str
    metadata_json: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime


class RepositoryDependencyListResponse(BaseModel):
    """Paginated response for dependency inventory."""

    items: List[RepositoryDependencyResponse]
    total: int
    page: int
    page_size: int


class DependencyVulnerabilityResponse(BaseModel):
    """Evidence-backed security vulnerability finding."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    dependency_run_id: str
    dependency_id: Optional[str] = None
    repository_id: str
    snapshot_id: str
    advisory_id: str
    ecosystem: str
    package_name: str
    resolved_version: Optional[str] = None
    affected_range: str
    severity: str
    severity_source: str
    cvss_score: Optional[float] = None
    remediation_version: Optional[str] = None
    manifest_path: str
    line_number: Optional[int] = None
    evidence_summary: str
    fingerprint: str
    cve_ids: List[str] = Field(default_factory=list)
    advisory_dataset_version: Optional[str] = None
    metadata_json: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime


class DependencyVulnerabilityListResponse(BaseModel):
    """Paginated response for vulnerability findings."""

    items: List[DependencyVulnerabilityResponse]
    total: int
    page: int
    page_size: int


class AdvisoryStatusResponse(BaseModel):
    """Authoritative status and provenance of the vulnerability advisory dataset."""

    status: str
    dataset_version: Optional[str] = None
    source_name: Optional[str] = None
    records_count: int = 0
    checksum: Optional[str] = None
    updated_at: Optional[str] = None
    message: str


class AdvisoryImportRequest(BaseModel):
    """Request payload for controlled advisory dataset import."""

    model_config = ConfigDict(extra="forbid")

    dataset_version: str = Field(..., description="Unique semantic version or batch identifier for dataset.")
    source_name: str = Field("codesentinel_curated", description="Source or authoritative catalog identity.")
    advisories: List[Dict[str, Any]] = Field(..., description="List of advisory records conforming to OSV/GHSA schema.")


class AdvisoryImportResponse(BaseModel):
    """Response outcome of advisory dataset import."""

    dataset_version: str
    source_name: str
    status: str
    accepted_count: int
    rejected_count: int
    checksum: Optional[str] = None
