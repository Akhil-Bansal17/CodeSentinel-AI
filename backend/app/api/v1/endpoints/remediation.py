"""API endpoints for Phase 7 Automated Remediation & Safe Code Patch Synthesis."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.exceptions import NotFoundError, ValidationError
from backend.app.models.base import RemediationProposal
from backend.app.schemas.remediation import (
    RemediationApplyRequest,
    RemediationApplyResponse,
    RemediationApproveRequest,
    RemediationAuditItem,
    RemediationAvailabilityResponse,
    RemediationProposalCreateRequest,
    RemediationProposalListResponse,
    RemediationProposalResponse,
    RemediationRejectRequest,
    RemediationRuleResponse,
    RemediationValidationItem,
)
from backend.app.services.remediation.service import default_remediation_service

remediation_router = APIRouter(prefix="/remediation", tags=["Automated Remediation & Safe Patches"])


def _serialize_proposal(prop: RemediationProposal) -> RemediationProposalResponse:
    """Serialize RemediationProposal model to Pydantic response."""
    return RemediationProposalResponse(
        id=prop.id,
        repository_id=prop.repository_id,
        snapshot_id=prop.snapshot_id,
        finding_id=prop.finding_id,
        finding_type=prop.finding_type,
        remediation_rule_id=prop.remediation_rule_id,
        status=prop.status,
        file_path=prop.file_path,
        original_content_hash=prop.original_content_hash,
        target_content_hash=prop.target_content_hash,
        start_line=prop.start_line,
        end_line=prop.end_line,
        start_column=prop.start_column,
        end_column=prop.end_column,
        original_code_snippet=prop.original_code_snippet,
        proposed_code_snippet=prop.proposed_code_snippet,
        unified_diff=prop.unified_diff,
        rationale=prop.rationale,
        confidence=prop.confidence,
        risk_level=prop.risk_level,
        is_llm_assisted=prop.is_llm_assisted,
        failure_reason=prop.failure_reason,
        applied_at=prop.applied_at,
        applied_by=prop.applied_by,
        metadata_json=prop.metadata_json or {},
        created_at=prop.created_at,
        updated_at=prop.updated_at,
        validations=[
            RemediationValidationItem(
                id=v.id,
                check_id=v.check_id,
                check_name=v.check_name,
                status=v.status,
                explanation=v.explanation,
                diagnostic_message=v.diagnostic_message,
            )
            for v in (prop.validations or [])
        ],
    )


@remediation_router.get(
    "/rules",
    response_model=List[RemediationRuleResponse],
    status_code=status.HTTP_200_OK,
    summary="List all registered remediation rules in catalog",
)
def list_rules() -> List[RemediationRuleResponse]:
    """Retrieve catalog of supported remediation strategies."""
    return default_remediation_service.list_rules()


@remediation_router.get(
    "/findings/{finding_id}/availability",
    response_model=RemediationAvailabilityResponse,
    status_code=status.HTTP_200_OK,
    summary="Check automated remediation availability for a finding",
)
async def check_availability(
    finding_id: str,
    db: Session = Depends(get_db),
) -> RemediationAvailabilityResponse:
    """Assess whether a specific finding has a feasible deterministic fix strategy."""
    try:
        return await default_remediation_service.check_availability(db=db, finding_id=finding_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Availability check failed: {e}")


@remediation_router.post(
    "/proposals",
    response_model=RemediationProposalResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Synthesize a new patch proposal for a finding",
)
async def create_proposal(
    payload: RemediationProposalCreateRequest,
    db: Session = Depends(get_db),
) -> RemediationProposalResponse:
    """Synthesize a reviewable patch proposal with diff and in-memory validation results."""
    try:
        prop = await default_remediation_service.create_proposal(db=db, req=payload)
        return _serialize_proposal(prop)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Proposal creation failed: {e}")


@remediation_router.get(
    "/proposals",
    response_model=RemediationProposalListResponse,
    status_code=status.HTTP_200_OK,
    summary="List remediation proposals with optional filters",
)
def list_proposals(
    repository_id: Optional[str] = Query(None, description="Filter by repository ID"),
    finding_id: Optional[str] = Query(None, description="Filter by finding ID"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by lifecycle status"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
) -> RemediationProposalListResponse:
    """List patch proposals matching query criteria."""
    items, total = default_remediation_service.list_proposals(
        db=db,
        repository_id=repository_id,
        finding_id=finding_id,
        status=status_filter,
        limit=limit,
        offset=offset,
    )
    return RemediationProposalListResponse(
        items=[_serialize_proposal(p) for p in items],
        total=total,
    )


@remediation_router.get(
    "/proposals/{proposal_id}",
    response_model=RemediationProposalResponse,
    status_code=status.HTTP_200_OK,
    summary="Get remediation proposal details and unified diff",
)
def get_proposal(
    proposal_id: str,
    db: Session = Depends(get_db),
) -> RemediationProposalResponse:
    """Retrieve full details of a specific patch proposal."""
    prop = default_remediation_service.get_proposal(db=db, proposal_id=proposal_id)
    if not prop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Proposal '{proposal_id}' not found.")
    return _serialize_proposal(prop)


@remediation_router.post(
    "/proposals/{proposal_id}/validate",
    response_model=RemediationProposalResponse,
    status_code=status.HTTP_200_OK,
    summary="Re-run in-memory validation checks on proposal",
)
async def validate_proposal(
    proposal_id: str,
    db: Session = Depends(get_db),
) -> RemediationProposalResponse:
    """Re-validate an existing proposal against current source content to verify anti-drift."""
    try:
        prop = await default_remediation_service.revalidate_proposal(db=db, proposal_id=proposal_id)
        return _serialize_proposal(prop)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Validation failed: {e}")


@remediation_router.post(
    "/proposals/{proposal_id}/approve",
    response_model=RemediationProposalResponse,
    status_code=status.HTTP_200_OK,
    summary="Explicitly approve a validated proposal for application",
)
def approve_proposal(
    proposal_id: str,
    payload: RemediationApproveRequest = RemediationApproveRequest(),
    db: Session = Depends(get_db),
) -> RemediationProposalResponse:
    """Approve a proposal. Prerequisite for application."""
    try:
        prop = default_remediation_service.approve_proposal(
            db=db,
            proposal_id=proposal_id,
            notes=payload.notes,
        )
        return _serialize_proposal(prop)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Approval failed: {e}")


@remediation_router.post(
    "/proposals/{proposal_id}/reject",
    response_model=RemediationProposalResponse,
    status_code=status.HTTP_200_OK,
    summary="Explicitly reject a proposal without altering files",
)
def reject_proposal(
    proposal_id: str,
    payload: RemediationRejectRequest,
    db: Session = Depends(get_db),
) -> RemediationProposalResponse:
    """Reject a patch proposal."""
    try:
        prop = default_remediation_service.reject_proposal(
            db=db,
            proposal_id=proposal_id,
            reason=payload.reason,
        )
        return _serialize_proposal(prop)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Rejection failed: {e}")


@remediation_router.post(
    "/proposals/{proposal_id}/apply",
    response_model=RemediationApplyResponse,
    status_code=status.HTTP_200_OK,
    summary="Safely apply an approved proposal to workspace",
)
def apply_proposal(
    proposal_id: str,
    payload: RemediationApplyRequest = RemediationApplyRequest(),
    db: Session = Depends(get_db),
) -> RemediationApplyResponse:
    """Apply an approved patch to the repository workspace with pre-write and post-write verification."""
    try:
        return default_remediation_service.apply_proposal(
            db=db,
            proposal_id=proposal_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Application failed: {e}")


@remediation_router.get(
    "/proposals/{proposal_id}/history",
    response_model=List[RemediationAuditItem],
    status_code=status.HTTP_200_OK,
    summary="Get audit log history for a proposal",
)
def get_proposal_history(
    proposal_id: str,
    db: Session = Depends(get_db),
) -> List[RemediationAuditItem]:
    """Retrieve state transitions and audit events for proposal."""
    audits = default_remediation_service.get_audit_history(db=db, proposal_id=proposal_id)
    return [
        RemediationAuditItem(
            id=a.id,
            proposal_id=a.proposal_id,
            repository_id=a.repository_id,
            action=a.action,
            actor=a.actor,
            details_json=a.details_json or {},
            created_at=a.created_at,
        )
        for a in audits
    ]
