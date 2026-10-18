"""REST API endpoints for Phase 8 CI/CD Workflow Generation, Audits, and PR Synthesis."""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, Response, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.models.base import AuditRun, CIAuditRun, PrPreparation, Repository, RepositorySnapshot
from backend.app.schemas.cicd import (
    AuditRunCreateRequest,
    AuditRunListResponse,
    AuditRunResponse,
    CIIngestRequest,
    CIIngestResponse,
    PrPrepareRequest,
    PrPrepareResponse,
    WorkflowGenerateRequest,
    WorkflowGenerateResponse,
)
from backend.app.services.audit.runner import AuditRunner
from backend.app.services.cicd.ingestion import CIIngestionService
from backend.app.services.cicd.workflow_generator import WorkflowGenerator
from backend.app.services.remediation.pr_synthesizer import PrSynthesizer


router = APIRouter()


# ============================================================================
# 1. CI/CD Workflow Generation
# ============================================================================

@router.post("/workflows/generate", response_model=WorkflowGenerateResponse, summary="Generate secure CI/CD workflow YAML")
def generate_workflow(
    request: WorkflowGenerateRequest,
    db: Session = Depends(get_db),
) -> WorkflowGenerateResponse:
    """Generate a hardened, least-privilege GitHub Actions workflow for the repository."""
    repo = db.query(Repository).filter(Repository.id == request.repository_id).first()
    if not repo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Repository not found: {request.repository_id}")

    # Discover snapshot files for ecosystem detection if available
    latest_snapshot = (
        db.query(RepositorySnapshot)
        .filter(RepositorySnapshot.repository_id == request.repository_id)
        .order_by(RepositorySnapshot.started_at.desc())
        .first()
    )
    file_paths: List[str] = []
    if latest_snapshot and latest_snapshot.files:
        file_paths = [f.relative_path for f in latest_snapshot.files]

    try:
        return WorkflowGenerator.generate(request, file_paths=file_paths)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ============================================================================
# 2. Multi-Pillar Codebase Audit Runner
# ============================================================================

@router.post("/audits/run", response_model=AuditRunResponse, summary="Trigger a multi-pillar codebase audit run")
def run_audit(
    request: AuditRunCreateRequest,
    db: Session = Depends(get_db),
) -> AuditRunResponse:
    """Execute all supported Phase 1-7 audit checks against a repository snapshot."""
    try:
        return AuditRunner.execute_audit(db, repository_id=request.repository_id, snapshot_id=request.snapshot_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Audit execution failed: {str(e)}")


@router.get("/audits", response_model=AuditRunListResponse, summary="List audit runs for a repository")
def list_audits(
    repository_id: str = Query(..., description="Repository ID"),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> AuditRunListResponse:
    """Retrieve audit history for a repository."""
    runs = (
        db.query(AuditRun)
        .filter(AuditRun.repository_id == repository_id)
        .order_by(AuditRun.created_at.desc())
        .limit(limit)
        .all()
    )

    items = [
        AuditRunResponse(
            id=r.id,
            repository_id=r.repository_id,
            snapshot_id=r.snapshot_id,
            status=r.status,
            overall_status=r.overall_status,
            summary=r.summary_json,
            checks=r.checks_json,
            findings=r.findings_json,
            markdown_report=r.markdown_report,
            sarif_json=r.sarif_json,
            started_at=r.started_at,
            completed_at=r.completed_at,
        )
        for r in runs
    ]
    return AuditRunListResponse(total=len(items), items=items)


@router.get("/audits/{audit_id}", response_model=AuditRunResponse, summary="Get details of a specific audit run")
def get_audit(
    audit_id: str,
    db: Session = Depends(get_db),
) -> AuditRunResponse:
    """Retrieve a specific audit run by ID."""
    r = db.query(AuditRun).filter(AuditRun.id == audit_id).first()
    if not r:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Audit run not found: {audit_id}")

    return AuditRunResponse(
        id=r.id,
        repository_id=r.repository_id,
        snapshot_id=r.snapshot_id,
        status=r.status,
        overall_status=r.overall_status,
        summary=r.summary_json,
        checks=r.checks_json,
        findings=r.findings_json,
        markdown_report=r.markdown_report,
        sarif_json=r.sarif_json,
        started_at=r.started_at,
        completed_at=r.completed_at,
    )


@router.get("/audits/{audit_id}/sarif", summary="Download SARIF 2.1.0 report for an audit run")
def download_sarif(
    audit_id: str,
    db: Session = Depends(get_db),
) -> Any:
    """Export SARIF 2.1.0 standard JSON document."""
    r = db.query(AuditRun).filter(AuditRun.id == audit_id).first()
    if not r:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Audit run not found: {audit_id}")

    return r.sarif_json


@router.get("/audits/{audit_id}/markdown", summary="Download Markdown report for an audit run")
def download_markdown(
    audit_id: str,
    db: Session = Depends(get_db),
) -> Response:
    """Export readable Markdown audit report."""
    r = db.query(AuditRun).filter(AuditRun.id == audit_id).first()
    if not r:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Audit run not found: {audit_id}")

    return Response(
        content=r.markdown_report or "# No report content generated",
        media_type="text/markdown",
        headers={"Content-Disposition": f"attachment; filename=codesentinel-audit-{audit_id[:8]}.md"},
    )


# ============================================================================
# 3. Secure CI Result Ingestion Webhook
# ============================================================================

@router.post("/ingest", response_model=CIIngestResponse, summary="Ingest external CI audit outcomes via webhook")
async def ingest_ci_result(
    request: Request,
    payload: CIIngestRequest,
    x_codesentinel_signature: Optional[str] = Header(None, alias="X-CodeSentinel-Signature"),
    db: Session = Depends(get_db),
) -> CIIngestResponse:
    """Ingest CI audit payload with HMAC signature verification and replay prevention."""
    body_bytes = await request.body()
    try:
        return CIIngestionService.ingest_ci_result(
            db,
            request=payload,
            raw_payload_bytes=body_bytes,
            signature_header=x_codesentinel_signature,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ============================================================================
# 4. Safe Pull Request Preparation & Patch Export
# ============================================================================

@router.post("/pr/prepare", response_model=PrPrepareResponse, summary="Synthesize PR change set from approved proposals")
def prepare_pull_request(
    request: PrPrepareRequest,
    db: Session = Depends(get_db),
) -> PrPrepareResponse:
    """Validate and combine selected proposals into a reviewable PR change set."""
    try:
        return PrSynthesizer.prepare_pr(db, request)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"PR preparation failed: {str(e)}")


@router.get("/pr/{pr_id}", response_model=PrPrepareResponse, summary="Get PR preparation details")
def get_pr_preparation(
    pr_id: str,
    db: Session = Depends(get_db),
) -> PrPrepareResponse:
    """Retrieve details of a prepared PR change set."""
    p = db.query(PrPreparation).filter(PrPreparation.id == pr_id).first()
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"PR preparation not found: {pr_id}")

    return PrPrepareResponse(
        id=p.id,
        repository_id=p.repository_id,
        snapshot_id=p.snapshot_id,
        title=p.title,
        description=p.description,
        status=p.status,
        proposal_count=len(p.proposal_ids_json),
        proposal_ids=p.proposal_ids_json,
        combined_diff=p.combined_diff,
        patch_bundle=p.patch_bundle,
        has_conflicts=(p.status == "CONFLICT_DETECTED"),
        conflict_details=p.conflict_details_json,
        risk_summary=p.risk_summary,
        created_at=p.created_at,
    )


@router.get("/pr/{pr_id}/patch", summary="Download patch bundle for manual review/application")
def download_patch_bundle(
    pr_id: str,
    db: Session = Depends(get_db),
) -> Response:
    """Download exportable .patch bundle file."""
    p = db.query(PrPreparation).filter(PrPreparation.id == pr_id).first()
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"PR preparation not found: {pr_id}")

    return Response(
        content=p.patch_bundle,
        media_type="text/x-patch",
        headers={"Content-Disposition": f"attachment; filename=codesentinel-{pr_id[:8]}.patch"},
    )
