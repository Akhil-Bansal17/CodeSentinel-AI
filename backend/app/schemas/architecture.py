"""Pydantic schemas for Phase 5 Architectural Intelligence and Governance APIs."""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ModuleNodeResponse(BaseModel):
    """Normalized module node schema."""

    path: str
    language: str
    total_lines: int = 0
    classes_count: int = 0
    abstract_classes_count: int = 0
    afferent_coupling: int = 0
    efferent_coupling: int = 0
    instability: Optional[float] = None
    abstractness: Optional[float] = None
    main_sequence_distance: Optional[float] = None


class DependencyEdgeResponse(BaseModel):
    """Directed dependency edge schema."""

    source_path: str
    target_path: str
    specifier: str
    line_number: int = 1
    is_external: bool = False
    is_unresolved: bool = False


class CycleInfoResponse(BaseModel):
    """Detected dependency cycle schema."""

    id: str
    modules: List[str]
    length: int


class ArchitectureGraphResponse(BaseModel):
    """Complete module dependency graph schema."""

    modules: List[ModuleNodeResponse] = Field(default_factory=list)
    internal_edges: List[DependencyEdgeResponse] = Field(default_factory=list)
    external_edges: List[DependencyEdgeResponse] = Field(default_factory=list)
    unresolved_edges: List[DependencyEdgeResponse] = Field(default_factory=list)
    cycles: List[CycleInfoResponse] = Field(default_factory=list)
    summary: Dict[str, Any] = Field(default_factory=dict)
    is_partial: bool = False


class ModuleDetailResponse(BaseModel):
    """Detailed inspection of a specific module."""

    node: ModuleNodeResponse
    incoming_dependencies: List[DependencyEdgeResponse] = Field(default_factory=list)
    outgoing_dependencies: List[DependencyEdgeResponse] = Field(default_factory=list)
    external_dependencies: List[DependencyEdgeResponse] = Field(default_factory=list)
    unresolved_dependencies: List[DependencyEdgeResponse] = Field(default_factory=list)
    cycles: List[CycleInfoResponse] = Field(default_factory=list)
    violations_count: int = 0
    violations: List[Dict[str, Any]] = Field(default_factory=list)



class ArchitectureViolationResponse(BaseModel):
    """Architectural boundary or policy violation schema."""

    id: str
    architecture_run_id: str
    repository_id: str
    snapshot_id: str
    rule_id: str
    policy_id: str
    source_module: str
    target_module: str
    edge_specifier: str
    line_number: int
    violated_boundary: str
    description: str
    remediation: str
    severity: str
    confidence: str
    fingerprint: str
    metadata_json: Dict[str, Any] = Field(default_factory=dict)
    created_at: str


class ArchitectureRunResponse(BaseModel):
    """Execution run summary schema for architecture analysis."""

    id: str
    repository_id: str
    snapshot_id: str
    status: str
    started_at: str
    completed_at: Optional[str] = None
    modules_analyzed: int = 0
    internal_edges_count: int = 0
    external_deps_count: int = 0
    unresolved_count: int = 0
    cycles_count: int = 0
    violations_count: int = 0
    policy_configured: bool = False
    policy_path: Optional[str] = None
    failure_code: Optional[str] = None
    failure_reason: Optional[str] = None
    summary_json: Dict[str, Any] = Field(default_factory=dict)


class StartArchitecturePayload(BaseModel):
    """Payload to trigger an architectural governance run."""

    snapshot_id: Optional[str] = None
    policy_json: Optional[str] = None


class ArchitectureRunListResponse(BaseModel):
    """Paginated list of historical architecture analysis runs."""

    items: List[ArchitectureRunResponse] = Field(default_factory=list)
    total: int
    page: int
    page_size: int


class ArchitectureViolationListResponse(BaseModel):
    """Paginated list of architectural policy violations."""

    items: List[ArchitectureViolationResponse] = Field(default_factory=list)
    total: int
    page: int
    page_size: int


class ModuleListResponse(BaseModel):
    """Paginated list of modules with coupling metrics."""

    items: List[ModuleNodeResponse] = Field(default_factory=list)
    total: int
    page: int
    page_size: int
