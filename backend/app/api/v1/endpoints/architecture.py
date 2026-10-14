"""API endpoints for Phase 5 Architectural Intelligence and Governance."""

import json
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.exceptions import NotFoundError, ValidationError
from backend.app.schemas.architecture import (
    ArchitectureGraphResponse,
    ArchitectureRunListResponse,
    ArchitectureRunResponse,
    ArchitectureViolationListResponse,
    ArchitectureViolationResponse,
    CycleInfoResponse,
    DependencyEdgeResponse,
    ModuleDetailResponse,
    ModuleListResponse,
    ModuleNodeResponse,
    StartArchitecturePayload,
)
from backend.app.services.architecture.architecture_service import ArchitectureService

# Router for repository-scoped architecture runs & policy checks
repo_architecture_router = APIRouter(prefix="/repositories", tags=["Architecture & Governance"])

# Router for run-scoped graph, module, and violation inspection
architecture_router = APIRouter(prefix="/architecture", tags=["Architecture & Governance"])


def _serialize_run(run) -> ArchitectureRunResponse:
    """Helper to convert ArchitectureRun model to response schema."""
    return ArchitectureRunResponse(
        id=run.id,
        repository_id=run.repository_id,
        snapshot_id=run.snapshot_id,
        status=run.status,
        started_at=run.started_at.isoformat() if run.started_at else "",
        completed_at=run.completed_at.isoformat() if run.completed_at else None,
        modules_analyzed=run.modules_analyzed,
        internal_edges_count=run.internal_edges_count,
        external_deps_count=run.external_deps_count,
        unresolved_count=run.unresolved_count,
        cycles_count=run.cycles_count,
        violations_count=run.violations_count,
        policy_configured=run.policy_configured,
        policy_path=run.policy_path,
        failure_code=run.failure_code,
        failure_reason=run.failure_reason,
        summary_json=run.summary_json or {},
    )


def _serialize_violation(v) -> ArchitectureViolationResponse:
    """Helper to convert ArchitectureViolation model to response schema."""
    return ArchitectureViolationResponse(
        id=v.id,
        architecture_run_id=v.architecture_run_id,
        repository_id=v.repository_id,
        snapshot_id=v.snapshot_id,
        rule_id=v.rule_id,
        policy_id=v.policy_id,
        source_module=v.source_module,
        target_module=v.target_module,
        edge_specifier=v.edge_specifier,
        line_number=v.line_number,
        violated_boundary=v.violated_boundary,
        description=v.description,
        remediation=v.remediation,
        severity=v.severity,
        confidence=v.confidence,
        fingerprint=v.fingerprint,
        metadata_json=v.metadata_json or {},
        created_at=v.created_at.isoformat() if v.created_at else "",
    )


# ---------------------------------------------------------------------------
# Repository-scoped endpoints
# ---------------------------------------------------------------------------


@repo_architecture_router.post(
    "/{repository_id}/architecture",
    response_model=ArchitectureRunResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Trigger architectural dependency and governance analysis",
)
async def start_repository_architecture_analysis(
    repository_id: str,
    payload: Optional[StartArchitecturePayload] = None,
    db: Session = Depends(get_db),
) -> ArchitectureRunResponse:
    """Run complete deterministic module dependency graph construction and policy governance."""
    service = ArchitectureService(db)
    snapshot_id = payload.snapshot_id if payload else None
    policy_override: Optional[Dict[str, Any]] = None

    if payload and payload.policy_json:
        try:
            policy_override = json.loads(payload.policy_json)
        except Exception as e:
            raise ValidationError(f"Invalid policy JSON payload: {str(e)}")

    run = await service.execute_architecture_run(
        repository_id=repository_id,
        snapshot_id=snapshot_id,
        policy_override=policy_override,
    )
    return _serialize_run(run)


@repo_architecture_router.get(
    "/{repository_id}/architecture",
    response_model=ArchitectureRunListResponse,
    summary="List historical architecture analysis runs for a repository",
)
def list_repository_architecture_runs(
    repository_id: str,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
) -> ArchitectureRunListResponse:
    """Retrieve historical architecture runs for a repository with pagination."""
    service = ArchitectureService(db)
    runs, total = service.list_runs_for_repository(
        repository_id=repository_id,
        page=page,
        page_size=page_size,
    )
    return ArchitectureRunListResponse(
        items=[_serialize_run(r) for r in runs],
        total=total,
        page=page,
        page_size=page_size,
    )


@repo_architecture_router.get(
    "/{repository_id}/architecture/policy",
    summary="Retrieve active architecture governance policy status and definition",
)
async def get_repository_architecture_policy(
    repository_id: str,
    snapshot_id: Optional[str] = Query(None, description="Optional snapshot ID"),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Inspect whether a valid codesentinel.architecture.json is configured."""
    service = ArchitectureService(db)
    return await service.get_active_policy(repository_id=repository_id, snapshot_id=snapshot_id)


# ---------------------------------------------------------------------------
# Run-scoped endpoints
# ---------------------------------------------------------------------------


@architecture_router.get(
    "/{run_id}",
    response_model=ArchitectureRunResponse,
    summary="Retrieve status and metrics for a specific architecture run",
)
def get_architecture_run(
    run_id: str,
    db: Session = Depends(get_db),
) -> ArchitectureRunResponse:
    """Retrieve an architecture run by ID."""
    service = ArchitectureService(db)
    run = service.get_run(run_id)
    if not run:
        raise NotFoundError("ArchitectureRun", run_id)
    return _serialize_run(run)


@architecture_router.get(
    "/{run_id}/graph",
    response_model=ArchitectureGraphResponse,
    summary="Retrieve complete module dependency graph payload",
)
def get_architecture_graph(
    run_id: str,
    db: Session = Depends(get_db),
) -> ArchitectureGraphResponse:
    """Retrieve graph representation containing nodes, directed edges, cycles, and summary."""
    service = ArchitectureService(db)
    graph_data = service.get_run_graph(run_id)
    if not graph_data:
        raise NotFoundError("ArchitectureGraph", run_id)

    raw_modules = graph_data.get("modules", {})
    modules = [ModuleNodeResponse(**m) for m in raw_modules.values()]
    internal_edges = [DependencyEdgeResponse(**e) for e in graph_data.get("internal_edges", [])]
    external_edges = [DependencyEdgeResponse(**e) for e in graph_data.get("external_edges", [])]
    unresolved_edges = [DependencyEdgeResponse(**e) for e in graph_data.get("unresolved_edges", [])]
    cycles = [CycleInfoResponse(**c) for c in graph_data.get("cycles", [])]

    return ArchitectureGraphResponse(
        modules=modules,
        internal_edges=internal_edges,
        external_edges=external_edges,
        unresolved_edges=unresolved_edges,
        cycles=cycles,
        summary=graph_data.get("summary", {}),
        is_partial=graph_data.get("is_partial", False),
    )


@architecture_router.get(
    "/{run_id}/modules",
    response_model=ModuleListResponse,
    summary="List paginated module coupling metrics (Ca, Ce, I, A, D)",
)
def list_architecture_modules(
    run_id: str,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=200, description="Items per page"),
    search: Optional[str] = Query(None, description="Filter module path"),
    sort_by: str = Query("coupling", description="Sort by: coupling, instability, afferent, efferent, name"),
    db: Session = Depends(get_db),
) -> ModuleListResponse:
    """List modules and their coupling metrics with search and sorting."""
    service = ArchitectureService(db)
    modules, total = service.list_modules(
        run_id=run_id,
        page=page,
        page_size=page_size,
        search=search,
        sort_by=sort_by,
    )
    return ModuleListResponse(
        items=[ModuleNodeResponse(**m) for m in modules],
        total=total,
        page=page,
        page_size=page_size,
    )


@architecture_router.get(
    "/{run_id}/modules/{module_path:path}",
    response_model=ModuleDetailResponse,
    summary="Inspect a specific module's incoming/outgoing dependencies and cycles",
)
def get_module_detail(
    run_id: str,
    module_path: str,
    db: Session = Depends(get_db),
) -> ModuleDetailResponse:
    """Inspect detailed relationships for a single module."""
    service = ArchitectureService(db)
    detail = service.get_module_detail(run_id, module_path)
    if not detail:
        raise NotFoundError("Module", module_path)

    return ModuleDetailResponse(
        node=ModuleNodeResponse(**detail["node"]),
        incoming_dependencies=[DependencyEdgeResponse(**e) for e in detail.get("incoming_dependencies", [])],
        outgoing_dependencies=[DependencyEdgeResponse(**e) for e in detail.get("outgoing_dependencies", [])],
        external_dependencies=[DependencyEdgeResponse(**e) for e in detail.get("external_dependencies", [])],
        unresolved_dependencies=[DependencyEdgeResponse(**e) for e in detail.get("unresolved_dependencies", [])],
        cycles=[CycleInfoResponse(**c) for c in detail.get("cycles", [])],
        violations_count=detail.get("violations_count", 0),
        violations=detail.get("violations", []),
    )


@architecture_router.get(
    "/{run_id}/violations",
    response_model=ArchitectureViolationListResponse,
    summary="List paginated architecture policy violations",
)
def list_architecture_violations(
    run_id: str,
    severity: Optional[str] = Query(None, description="Filter by severity: CRITICAL, HIGH, MEDIUM, LOW"),
    rule_id: Optional[str] = Query(None, description="Filter by specific rule ID"),
    source_module: Optional[str] = Query(None, description="Filter by source module path"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=200, description="Items per page"),
    db: Session = Depends(get_db),
) -> ArchitectureViolationListResponse:
    """Retrieve policy violations with evidence and remediation suggestions."""
    service = ArchitectureService(db)
    violations, total = service.list_violations(
        run_id=run_id,
        severity=severity,
        rule_id=rule_id,
        source_module=source_module,
        page=page,
        page_size=page_size,
    )
    return ArchitectureViolationListResponse(
        items=[_serialize_violation(v) for v in violations],
        total=total,
        page=page,
        page_size=page_size,
    )
