from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.exceptions import NotFoundError
from backend.app.schemas.analysis import (
    AnalysisFindingListResponse,
    AnalysisFindingResponse,
    AnalysisRunCreateRequest,
    AnalysisRunListResponse,
    AnalysisRunResponse,
    RuleMetadataResponse,
)
from backend.app.services.analysis.analysis_service import AnalysisService
from backend.app.services.analysis.rules.registry import default_rule_registry

# Router for repository-scoped analysis execution & listing
repo_analyses_router = APIRouter(prefix="/repositories", tags=["Analysis"])

# Router for run-scoped status & findings retrieval
analyses_router = APIRouter(prefix="/analyses", tags=["Analysis"])


@repo_analyses_router.post(
    "/{repository_id}/analyses",
    response_model=AnalysisRunResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Start static analysis for a repository snapshot",
)
async def start_repository_analysis(
    repository_id: str,
    request: Optional[AnalysisRunCreateRequest] = None,
    db: Session = Depends(get_db),
) -> AnalysisRunResponse:
    """Trigger deterministic AST parsing and static analysis on a repository snapshot."""
    service = AnalysisService(db)
    snapshot_id = request.snapshot_id if request else None
    config = request.config if request else None
    run = await service.execute_analysis_run(
        repository_id=repository_id,
        snapshot_id=snapshot_id,
        config=config,
    )
    return AnalysisRunResponse.model_validate(run)


@repo_analyses_router.get(
    "/{repository_id}/analyses",
    response_model=AnalysisRunListResponse,
    summary="List analysis runs for a repository",
)
def list_repository_analyses(
    repository_id: str,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
) -> AnalysisRunListResponse:
    """Retrieve historical static analysis runs for a repository."""
    service = AnalysisService(db)
    runs, total = service.list_analyses_for_repository(
        repository_id=repository_id,
        page=page,
        page_size=page_size,
    )
    items = [AnalysisRunResponse.model_validate(r) for r in runs]
    return AnalysisRunListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@analyses_router.get(
    "/rules/catalog",
    response_model=List[RuleMetadataResponse],
    summary="List all static analysis and security rules in catalog",
)
def list_rules_catalog() -> List[RuleMetadataResponse]:
    """Retrieve metadata for all registered code quality and application security rules."""
    rules = default_rule_registry.list_rules()
    return [
        RuleMetadataResponse(
            rule_id=r.rule_id,
            name=r.name,
            version=r.version,
            category=r.category.value,
            default_severity=r.default_severity.value,
            default_confidence=r.default_confidence.value,
            language=r.language,
            description=r.description,
            why_it_matters=r.why_it_matters or None,
            remediation=r.remediation or None,
            limitations=r.limitations or None,
        )
        for r in rules
    ]


@analyses_router.get(
    "/{analysis_id}",
    response_model=AnalysisRunResponse,
    summary="Get analysis run status and summary",
)
def get_analysis_run(
    analysis_id: str,
    db: Session = Depends(get_db),
) -> AnalysisRunResponse:
    """Retrieve status, file metrics, and summary findings for an analysis run."""
    service = AnalysisService(db)
    run = service.get_analysis_by_id(analysis_id)
    if not run:
        raise NotFoundError("AnalysisRun", analysis_id)
    return AnalysisRunResponse.model_validate(run)


@analyses_router.get(
    "/{analysis_id}/findings",
    response_model=AnalysisFindingListResponse,
    summary="List paginated findings for an analysis run",
)
def list_analysis_findings(
    analysis_id: str,
    severity: Optional[str] = Query(None, description="Filter by severity (CRITICAL, HIGH, MEDIUM, LOW, INFO)"),
    confidence: Optional[str] = Query(None, description="Filter by confidence (HIGH, MEDIUM, LOW)"),
    category: Optional[str] = Query(None, description="Filter by category (SECURITY, SYNTAX, COMPLEXITY, MAINTAINABILITY, CODE_SMELL)"),
    rule_id: Optional[str] = Query(None, description="Filter by rule ID"),
    file_path: Optional[str] = Query(None, description="Filter by relative file path substring"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
) -> AnalysisFindingListResponse:
    """Retrieve paginated, evidence-backed findings for an analysis run."""
    service = AnalysisService(db)
    findings, total = service.list_analysis_findings(
        analysis_id=analysis_id,
        severity=severity,
        confidence=confidence,
        category=category,
        rule_id=rule_id,
        file_path=file_path,
        page=page,
        page_size=page_size,
    )
    items = [AnalysisFindingResponse.model_validate(f) for f in findings]
    return AnalysisFindingListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@analyses_router.get(
    "/{analysis_id}/findings/{finding_id}",
    response_model=AnalysisFindingResponse,
    summary="Get single finding details",
)
def get_analysis_finding(
    analysis_id: str,
    finding_id: str,
    db: Session = Depends(get_db),
) -> AnalysisFindingResponse:
    """Retrieve full finding details including evidence, remediation, and rule metadata."""
    service = AnalysisService(db)
    finding = service.get_analysis_finding(analysis_id, finding_id)
    if not finding:
        raise NotFoundError("AnalysisFinding", finding_id)
    return AnalysisFindingResponse.model_validate(finding)
