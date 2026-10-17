"""Pydantic schemas for Phase 7 Automated Remediation & Safe Code Patch Synthesis."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class RemediationRuleResponse(BaseModel):
    """Metadata regarding a supported remediation rule strategy in the catalog."""

    remediation_rule_id: str
    target_rule_ids: List[str]
    name: str
    description: str
    transformation_strategy: str
    risk_level: str  # LOW, MEDIUM, HIGH
    default_confidence: str  # HIGH, MEDIUM, LOW
    applicable_languages: List[str]
    preconditions: List[str]
    unsupported_cases: List[str]
    rationale: str


class RemediationAvailabilityResponse(BaseModel):
    """Assessment of whether a finding can be safely and deterministically remediated."""

    finding_id: str
    is_supported: bool
    remediation_rule_id: Optional[str] = None
    strategy_name: Optional[str] = None
    description: Optional[str] = None
    rationale: Optional[str] = None
    confidence: Optional[str] = None
    risk_level: Optional[str] = None
    unsupported_reason: Optional[str] = None
    requires_human_review: bool = True
    suggested_action: str = "MANUAL_REMEDIATION_REQUIRED"


class RemediationProposalCreateRequest(BaseModel):
    """Request payload to synthesize a patch proposal for a finding."""

    repository_id: str
    finding_id: str
    snapshot_id: Optional[str] = None
    override_strategy_id: Optional[str] = None
    notes: Optional[str] = None


class RemediationValidationItem(BaseModel):
    """Individual validation check outcome."""

    id: Optional[str] = None
    check_id: str
    check_name: str
    status: str  # PASSED, FAILED, SKIPPED, UNAVAILABLE
    explanation: str
    diagnostic_message: Optional[str] = None


class RemediationProposalResponse(BaseModel):
    """Detailed remediation proposal and review record."""

    id: str
    repository_id: str
    snapshot_id: str
    finding_id: Optional[str] = None
    finding_type: str = "STATIC_ANALYSIS"
    remediation_rule_id: str
    status: str
    file_path: str
    original_content_hash: str
    target_content_hash: str
    start_line: int
    end_line: int
    start_column: Optional[int] = None
    end_column: Optional[int] = None
    original_code_snippet: str
    proposed_code_snippet: str
    unified_diff: str
    rationale: str
    confidence: str
    risk_level: str
    is_llm_assisted: bool = False
    failure_reason: Optional[str] = None
    applied_at: Optional[datetime] = None
    applied_by: Optional[str] = None
    metadata_json: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime
    validations: List[RemediationValidationItem] = Field(default_factory=list)


class RemediationProposalListResponse(BaseModel):
    """Paginated list of remediation proposals."""

    items: List[RemediationProposalResponse]
    total: int


class RemediationApproveRequest(BaseModel):
    """User approval request."""

    notes: Optional[str] = None


class RemediationRejectRequest(BaseModel):
    """User rejection request."""

    reason: str


class RemediationApplyRequest(BaseModel):
    """Request to safely apply an approved patch to the repository workspace."""

    notes: Optional[str] = None


class RemediationApplyResponse(BaseModel):
    """Result of safe patch application."""

    status: str  # APPLIED, CANNOT_APPLY_READ_ONLY_ARCHIVE, STALE, FAILED
    proposal_id: str
    file_path: str
    message: str
    can_export_diff: bool = True
    unified_diff: Optional[str] = None
    new_file_hash: Optional[str] = None


class RemediationAuditItem(BaseModel):
    """Audit trail event for proposal lifecycle operations."""

    id: str
    proposal_id: str
    repository_id: str
    action: str
    actor: str
    details_json: Dict[str, Any]
    created_at: datetime
