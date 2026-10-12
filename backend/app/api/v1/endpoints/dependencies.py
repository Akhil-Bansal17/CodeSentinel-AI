"""API endpoints for Phase 3 Dependency Intelligence & Software Composition Analysis."""

from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.exceptions import NotFoundError
from backend.app.schemas.dependencies import (
    DependencyRunCreateRequest,
    DependencyRunListResponse,
    DependencyRunResponse,
    DependencyVulnerabilityListResponse,
    DependencyVulnerabilityResponse,
    RepositoryDependencyListResponse,
    RepositoryDependencyResponse,
)
from backend.app.services.dependencies.discovery_service import DependencyDiscoveryService

# Router for repository-scoped dependency analysis execution & listing
repo_dependency_router = APIRouter(prefix="/repositories", tags=["Dependencies & SCA"])

# Router for run-scoped dependency & vulnerability inspection
dependency_analyses_router = APIRouter(prefix="/dependency-analyses", tags=["Dependencies & SCA"])


@repo_dependency_router.post(
    "/{repository_id}/dependency-analyses",
    response_model=DependencyRunResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Start dependency analysis (SCA) for a repository snapshot",
)
async def start_repository_dependency_analysis(
    repository_id: str,
    request: Optional[DependencyRunCreateRequest] = None,
    db: Session = Depends(get_db),
) -> DependencyRunResponse:
    """Trigger deterministic dependency discovery and vulnerability correlation on a repository snapshot."""
    service = DependencyDiscoveryService(db)
    snapshot_id = request.snapshot_id if request else None
    config = request.config if request else None
    run = await service.execute_dependency_run(
        repository_id=repository_id,
        snapshot_id=snapshot_id,
        config=config,
    )
    return DependencyRunResponse.model_validate(run)


@repo_dependency_router.get(
    "/{repository_id}/dependency-analyses",
    response_model=DependencyRunListResponse,
    summary="List historical dependency analysis runs for a repository",
)
def list_repository_dependency_analyses(
    repository_id: str,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
) -> DependencyRunListResponse:
    """Retrieve historical dependency analysis runs for a repository with deterministic pagination."""
    service = DependencyDiscoveryService(db)
    runs, total = service.list_runs_for_repository(
        repository_id=repository_id,
        page=page,
        page_size=page_size,
    )
    items = [DependencyRunResponse.model_validate(r) for r in runs]
    return DependencyRunListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@dependency_analyses_router.get(
    "/{run_id}",
    response_model=DependencyRunResponse,
    summary="Retrieve status and metrics for a specific dependency analysis run",
)
def get_dependency_analysis_run(
    run_id: str,
    db: Session = Depends(get_db),
) -> DependencyRunResponse:
    """Fetch status, counts, and configuration summary for a dependency analysis run."""
    service = DependencyDiscoveryService(db)
    run = service.get_run_by_id(run_id)
    if not run:
        raise NotFoundError("DependencyRun", run_id)
    return DependencyRunResponse.model_validate(run)


@dependency_analyses_router.get(
    "/{run_id}/dependencies",
    response_model=RepositoryDependencyListResponse,
    summary="Retrieve discovered dependencies inventory for an analysis run",
)
def list_analysis_dependencies(
    run_id: str,
    ecosystem: Optional[str] = Query(None, description="Filter by ecosystem (e.g. pypi, npm)"),
    package: Optional[str] = Query(None, description="Search package name"),
    dependency_type: Optional[str] = Query(None, description="Filter by dependency type (direct, dev, transitive, optional)"),
    is_direct: Optional[bool] = Query(None, description="Filter by direct (true) or transitive (false)"),
    status: Optional[str] = Query(None, description="Filter by resolution status (resolved, unresolved)"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=200, description="Items per page"),
    db: Session = Depends(get_db),
) -> RepositoryDependencyListResponse:
    """Retrieve paginated inventory of discovered dependencies with optional filters."""
    service = DependencyDiscoveryService(db)
    deps, total = service.list_dependencies_for_run(
        run_id=run_id,
        ecosystem=ecosystem,
        package_name=package,
        dependency_type=dependency_type,
        is_direct=is_direct,
        status_filter=status,
        page=page,
        page_size=page_size,
    )
    items = [RepositoryDependencyResponse.model_validate(d) for d in deps]
    return RepositoryDependencyListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@dependency_analyses_router.get(
    "/{run_id}/vulnerabilities",
    response_model=DependencyVulnerabilityListResponse,
    summary="Retrieve vulnerability findings for an analysis run",
)
def list_analysis_vulnerabilities(
    run_id: str,
    severity: Optional[str] = Query(None, description="Filter by severity (CRITICAL, HIGH, MEDIUM, LOW)"),
    ecosystem: Optional[str] = Query(None, description="Filter by ecosystem (pypi, npm)"),
    package: Optional[str] = Query(None, description="Filter by package name"),
    advisory_id: Optional[str] = Query(None, description="Filter by advisory ID (e.g. GHSA-..., CVE-...)"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=200, description="Items per page"),
    db: Session = Depends(get_db),
) -> DependencyVulnerabilityListResponse:
    """Retrieve paginated vulnerability findings matching advisory records with evidence."""
    service = DependencyDiscoveryService(db)
    vulns, total = service.list_vulnerabilities_for_run(
        run_id=run_id,
        severity=severity,
        ecosystem=ecosystem,
        package_name=package,
        advisory_id=advisory_id,
        page=page,
        page_size=page_size,
    )
    items = [DependencyVulnerabilityResponse.model_validate(v) for v in vulns]
    return DependencyVulnerabilityListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )
