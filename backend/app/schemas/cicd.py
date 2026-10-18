"""Pydantic schemas for Phase 8 CI/CD, Audit, and PR Synthesis."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# ============================================================================
# CI/CD Workflow Generation Schemas
# ============================================================================

class WorkflowGenerateRequest(BaseModel):
    """Configuration request for generating a secure CI workflow."""

    repository_id: str = Field(..., description="Target repository ID")
    ecosystem: Optional[str] = Field(None, description="Ecosystem override ('python', 'node', 'mixed')")
    include_lint: bool = Field(True, description="Include code linting step")
    include_test: bool = Field(True, description="Include automated test suite")
    include_typecheck: bool = Field(True, description="Include static type checking")
    include_build: bool = Field(False, description="Include production build step")
    include_security_audit: bool = Field(True, description="Include CodeSentinel static security audit")
    include_artifact_upload: bool = Field(True, description="Upload audit reports and test logs as artifacts")
    python_version: str = Field("3.12", description="Target Python runtime version")
    node_version: str = Field("20", description="Target Node.js runtime version")
    runner_os: str = Field("ubuntu-latest", description="GitHub Actions runner OS")
    workflow_name: str = Field("CodeSentinel CI", description="Workflow name")
    trigger_branches: List[str] = Field(default_factory=lambda: ["main"], description="Branches that trigger the workflow")


class WorkflowGenerateResponse(BaseModel):
    """Generated workflow output and security disclosures."""

    yaml_content: str = Field(..., description="Hardened GitHub Actions YAML file contents")
    filename: str = Field(".github/workflows/codesentinel-ci.yml", description="Recommended destination path")
    ecosystem_detected: str = Field(..., description="Detected repository ecosystem")
    permissions_summary: Dict[str, str] = Field(..., description="Declared least-privilege GitHub permissions")
    security_warnings: List[str] = Field(default_factory=list, description="Security trade-offs and recommendations")
    inferred_options: Dict[str, Any] = Field(default_factory=dict, description="Inferred repository parameters")


# ============================================================================
# Reusable Audit Runner Schemas
# ============================================================================

class AuditCheckItem(BaseModel):
    """Individual verification check result in an audit run."""

    check_id: str = Field(..., description="Stable check identifier (e.g. AUDIT-STATIC-001)")
    category: str = Field(..., description="Audit pillar category")
    name: str = Field(..., description="Human-readable check title")
    status: str = Field(..., description="Check status: PASSED, FAILED, WARNING, SKIPPED, UNSUPPORTED, ERROR")
    description: str = Field(..., description="Check scope and purpose")
    details: Dict[str, Any] = Field(default_factory=dict, description="Diagnostic and metric data")
    duration_ms: int = Field(0, description="Execution time in milliseconds")
    error_message: Optional[str] = Field(None, description="Diagnostic error trace if failed")


class AuditRunSummary(BaseModel):
    """Aggregated outcome metrics across all audit checks."""

    total_checks: int = 0
    passed: int = 0
    failed: int = 0
    warning: int = 0
    skipped: int = 0
    unsupported: int = 0
    error: int = 0
    total_findings: int = 0
    findings_by_severity: Dict[str, int] = Field(default_factory=dict)


class AuditRunCreateRequest(BaseModel):
    """Request to initiate a multi-pillar audit run on a repository snapshot."""

    repository_id: str = Field(..., description="Target repository ID")
    snapshot_id: Optional[str] = Field(None, description="Optional snapshot ID (defaults to latest)")


class AuditRunResponse(BaseModel):
    """Complete audit run result with summary, checklist, findings, and reports."""

    id: str
    repository_id: str
    snapshot_id: str
    status: str
    overall_status: str
    summary: AuditRunSummary
    checks: List[AuditCheckItem]
    findings: List[Dict[str, Any]]
    markdown_report: Optional[str] = None
    sarif_json: Optional[Dict[str, Any]] = None
    started_at: datetime
    completed_at: Optional[datetime] = None


class AuditRunListResponse(BaseModel):
    """List of audit runs for a repository."""

    total: int
    items: List[AuditRunResponse]


# ============================================================================
# CI Result Ingestion Schemas
# ============================================================================

class CIIngestRequest(BaseModel):
    """Payload sent by an external CI runner to report audit outcomes."""

    repository_id: str = Field(..., description="Target repository ID")
    idempotency_key: str = Field(..., description="Unique client run identifier for replay prevention")
    ci_provider: str = Field("github_actions", description="CI orchestrator identifier")
    commit_sha: Optional[str] = Field(None, description="Git commit hash")
    branch: Optional[str] = Field(None, description="Target branch name")
    event_name: str = Field("push", description="Trigger event name")
    workflow_name: Optional[str] = Field(None, description="Workflow name")
    status: str = Field("SUCCESS", description="CI status: SUCCESS, FAILURE, WARNING")
    payload: Dict[str, Any] = Field(default_factory=dict, description="Normalized audit findings and telemetry")


class CIIngestResponse(BaseModel):
    """Ingestion confirmation receipt."""

    id: str
    repository_id: str
    status: str
    signature_verified: bool
    message: str
    is_duplicate: bool


# ============================================================================
# Pull Request Preparation & Patch Bundle Schemas
# ============================================================================

class PrPrepareRequest(BaseModel):
    """Request to compose approved remediation proposals into a PR change set."""

    repository_id: str = Field(..., description="Target repository ID")
    snapshot_id: Optional[str] = Field(None, description="Optional snapshot ID (defaults to latest)")
    proposal_ids: List[str] = Field(..., min_length=1, description="List of approved remediation proposal IDs to include")
    target_branch: str = Field("main", description="Target base branch")
    custom_title: Optional[str] = Field(None, description="Optional custom pull request title")


class PrPrepareResponse(BaseModel):
    """Synthesized pull request bundle and safety review metadata."""

    id: str
    repository_id: str
    snapshot_id: str
    title: str
    description: str
    status: str
    proposal_count: int
    proposal_ids: List[str]
    combined_diff: str
    patch_bundle: str
    has_conflicts: bool
    conflict_details: Dict[str, Any] = Field(default_factory=dict)
    risk_summary: Optional[str] = None
    created_at: datetime
