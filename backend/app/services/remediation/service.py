"""Remediation Orchestration Service for CodeSentinel AI (Phase 7).

Coordinates the end-to-end lifecycle:
  Finding -> Supported Strategy -> Patch Proposal -> In-Memory Validation ->
  Human Review -> Explicit Approval -> Safe Application -> Audit Trail.
"""

import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session, selectinload

from backend.app.core.config import settings
from backend.app.models.base import (
    AnalysisFinding,
    DependencyVulnerability,
    RemediationAudit,
    RemediationProposal,
    RemediationValidation,
    Repository,
    RepositoryFile,
    RepositorySnapshot,
)
from backend.app.schemas.remediation import (
    RemediationApplyResponse,
    RemediationAvailabilityResponse,
    RemediationProposalCreateRequest,
    RemediationRuleResponse,
)
from backend.app.services.analysis.source_provider import SourceInputProvider
from backend.app.services.remediation.applier import default_patch_applier
from backend.app.services.remediation.patch_engine import (
    compute_content_hash,
    generate_unified_diff,
    validate_path_safety,
)
from backend.app.services.remediation.rules.base import RemediationFeasibility
from backend.app.services.remediation.rules.registry import default_remediation_registry
from backend.app.services.remediation.validator import default_patch_validator

logger = logging.getLogger(__name__)


class RemediationService:
    """Orchestration service for patch proposal synthesis, review, and application."""

    def __init__(self) -> None:
        self.registry = default_remediation_registry
        self.validator = default_patch_validator
        self.applier = default_patch_applier

    def list_rules(self) -> List[RemediationRuleResponse]:
        """List all registered deterministic remediation rules in the catalog."""
        rules = self.registry.list_rules()
        return [
            RemediationRuleResponse(
                remediation_rule_id=r.rule_id,
                target_rule_ids=list(r.target_finding_rules),
                name=r.name,
                description=r.description,
                transformation_strategy=r.transformation_strategy,
                risk_level=r.risk_level.value,
                default_confidence=r.default_confidence.value,
                applicable_languages=list(r.applicable_languages),
                preconditions=r.preconditions,
                unsupported_cases=r.unsupported_cases,
                rationale=r.rationale,
            )
            for r in rules
        ]

    async def get_source_content(
        self,
        db: Session,
        repository: Repository,
        snapshot: RepositorySnapshot,
        file_path: str,
    ) -> Optional[str]:
        """Retrieve source file content safely from snapshot provider or local workspace."""
        validate_path_safety(file_path)

        # 1. Try reading via SourceInputProvider
        try:
            norm_path = file_path.replace("\\", "/").lstrip("/")
            file_rec = db.scalar(
                select(RepositoryFile).where(
                    RepositoryFile.snapshot_id == snapshot.id,
                    func.lower(RepositoryFile.relative_path) == norm_path.lower(),
                )
            )
            if file_rec:
                async with SourceInputProvider(repository=repository, snapshot=snapshot) as provider:
                    sfc = provider.read_file_content(file_rec)
                    if sfc.is_available and sfc.content:
                        return sfc.content
        except Exception as e:
            logger.debug("SourceInputProvider read failed for %s: %s", file_path, e)

        # 2. Try direct read from authorized local workspace
        workspace_root = self.applier.resolve_writable_workspace(repository)
        if workspace_root:
            target_path = (workspace_root / file_path).resolve()
            if workspace_root in target_path.parents or workspace_root == target_path:
                if target_path.exists() and target_path.is_file():
                    try:
                        return target_path.read_text(encoding="utf-8")
                    except Exception:
                        pass

        return None

    async def check_availability(
        self,
        db: Session,
        finding_id: str,
    ) -> RemediationAvailabilityResponse:
        """Assess whether a specific finding can be safely remediated."""
        # 1. Query finding (check AnalysisFinding first, then DependencyVulnerability)
        finding = db.scalar(select(AnalysisFinding).where(AnalysisFinding.id == finding_id))
        is_dep = False
        if not finding:
            finding = db.scalar(select(DependencyVulnerability).where(DependencyVulnerability.id == finding_id))
            if not finding:
                raise ValueError(f"Finding with ID '{finding_id}' not found.")
            is_dep = True

        repository = db.scalar(select(Repository).where(Repository.id == finding.repository_id))
        snapshot = db.scalar(select(RepositorySnapshot).where(RepositorySnapshot.id == finding.snapshot_id))
        if not repository or not snapshot:
            raise ValueError("Repository or snapshot record missing for finding.")

        file_path = getattr(finding, "file_path", None) or getattr(finding, "manifest_path", "")
        source_content = await self.get_source_content(db, repository, snapshot, file_path)
        if not source_content:
            return RemediationAvailabilityResponse(
                finding_id=finding_id,
                is_supported=False,
                unsupported_reason=f"Source file '{file_path}' content is unavailable or unreadable.",
                suggested_action="MANUAL_REMEDIATION_REQUIRED",
            )

        feasibility: RemediationFeasibility = self.registry.assess_finding(finding, source_content)
        return RemediationAvailabilityResponse(
            finding_id=finding_id,
            is_supported=feasibility.is_supported,
            remediation_rule_id=feasibility.remediation_rule_id,
            strategy_name=feasibility.strategy_name,
            description=feasibility.description,
            rationale=feasibility.rationale,
            confidence=feasibility.confidence.value if feasibility.confidence else None,
            risk_level=feasibility.risk_level.value if feasibility.risk_level else None,
            unsupported_reason=feasibility.unsupported_reason,
            requires_human_review=feasibility.requires_human_review,
            suggested_action=feasibility.suggested_action,
        )

    async def create_proposal(
        self,
        db: Session,
        req: RemediationProposalCreateRequest,
        user_id: str = "user",
    ) -> RemediationProposal:
        """Synthesize a new remediation patch proposal for a finding and run validation."""
        # 1. Fetch finding
        finding = db.scalar(
            select(AnalysisFinding).where(
                AnalysisFinding.id == req.finding_id,
                AnalysisFinding.repository_id == req.repository_id,
            )
        )
        finding_type = "STATIC_ANALYSIS"
        if not finding:
            finding = db.scalar(
                select(DependencyVulnerability).where(
                    DependencyVulnerability.id == req.finding_id,
                    DependencyVulnerability.repository_id == req.repository_id,
                )
            )
            finding_type = "DEPENDENCY_VULNERABILITY"
            if not finding:
                raise ValueError(
                    f"Finding '{req.finding_id}' not found for repository '{req.repository_id}'."
                )

        repository = db.scalar(select(Repository).where(Repository.id == req.repository_id))
        snapshot_id = req.snapshot_id or finding.snapshot_id
        snapshot = db.scalar(select(RepositorySnapshot).where(RepositorySnapshot.id == snapshot_id))
        if not repository or not snapshot:
            raise ValueError("Repository or snapshot record missing.")

        file_path = getattr(finding, "file_path", None) or getattr(finding, "manifest_path", "")
        validate_path_safety(file_path)

        # 2. Retrieve source content
        source_content = await self.get_source_content(db, repository, snapshot, file_path)
        if not source_content:
            raise ValueError(f"Could not read source content for file '{file_path}'.")

        # 3. Assess feasibility and generate candidate
        feasibility = self.registry.assess_finding(
            finding=finding,
            source_content=source_content,
            preferred_rule_id=req.override_strategy_id,
        )
        if not feasibility.is_supported or not feasibility.candidate:
            raise ValueError(
                f"Automated remediation unavailable: {feasibility.unsupported_reason or 'No safe strategy found.'}"
            )

        candidate = feasibility.candidate

        # 4. Generate modified content and unified diff in memory
        orig_hash = compute_content_hash(source_content)
        lines = source_content.splitlines(keepends=True)
        before_lines = lines[: candidate.start_line - 1]
        after_lines = lines[candidate.end_line :]
        proposed_lines = [
            line + ("\r\n" if "\r\n" in source_content else "\n")
            for line in candidate.proposed_snippet.splitlines()
        ]
        modified_content = "".join(before_lines + proposed_lines + after_lines)
        target_hash = compute_content_hash(modified_content)

        diff_text = generate_unified_diff(
            file_path=candidate.file_path,
            original_content=source_content,
            modified_content=modified_content,
        )

        # 5. Persist Proposal
        proposal = RemediationProposal(
            repository_id=req.repository_id,
            snapshot_id=snapshot.id,
            finding_id=finding.id,
            finding_type=finding_type,
            remediation_rule_id=candidate.remediation_rule_id,
            status="PROPOSED",
            file_path=candidate.file_path,
            original_content_hash=orig_hash,
            target_content_hash=target_hash,
            start_line=candidate.start_line,
            end_line=candidate.end_line,
            start_column=candidate.start_column,
            end_column=candidate.end_column,
            original_code_snippet=candidate.original_snippet,
            proposed_code_snippet=candidate.proposed_snippet,
            unified_diff=diff_text,
            rationale=candidate.rationale,
            confidence=candidate.confidence.value,
            risk_level=candidate.risk_level.value,
            is_llm_assisted=False,
            metadata_json={
                "notes": req.notes,
                "created_at": datetime.now(timezone.utc).isoformat(),
            },
        )
        db.add(proposal)
        db.flush()

        # 6. Run validation checks immediately
        all_passed, outcomes, _ = self.validator.validate(
            file_path=candidate.file_path,
            original_content=source_content,
            original_hash=orig_hash,
            target_hash=target_hash,
            start_line=candidate.start_line,
            end_line=candidate.end_line,
            original_snippet=candidate.original_snippet,
            proposed_snippet=candidate.proposed_snippet,
            target_rule_id=candidate.target_rule_id,
            remediation_rule_id=candidate.remediation_rule_id,
        )

        # Record validations in DB
        for outcome in outcomes:
            val_rec = RemediationValidation(
                proposal_id=proposal.id,
                check_id=outcome.check_id,
                check_name=outcome.check_name,
                status=outcome.status,
                explanation=outcome.explanation,
                diagnostic_message=outcome.diagnostic_message,
            )
            db.add(val_rec)

        proposal.status = "VALIDATED" if all_passed else "VALIDATION_FAILED"

        # Record Audit
        audit = RemediationAudit(
            proposal_id=proposal.id,
            repository_id=req.repository_id,
            action="PROPOSAL_CREATED",
            actor=user_id,
            details_json={
                "remediation_rule_id": candidate.remediation_rule_id,
                "validation_status": proposal.status,
                "file_path": candidate.file_path,
            },
        )
        db.add(audit)
        db.commit()
        db.refresh(proposal)

        return proposal

    def list_proposals(
        self,
        db: Session,
        repository_id: Optional[str] = None,
        finding_id: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[RemediationProposal], int]:
        """List proposals with optional filtering."""
        query = select(RemediationProposal).options(
            selectinload(RemediationProposal.validations)
        )
        count_query = select(func.count(RemediationProposal.id))

        if repository_id:
            query = query.where(RemediationProposal.repository_id == repository_id)
            count_query = count_query.where(RemediationProposal.repository_id == repository_id)
        if finding_id:
            query = query.where(RemediationProposal.finding_id == finding_id)
            count_query = count_query.where(RemediationProposal.finding_id == finding_id)
        if status:
            query = query.where(RemediationProposal.status == status)
            count_query = count_query.where(RemediationProposal.status == status)

        total = db.scalar(count_query) or 0
        items = db.scalars(
            query.order_by(desc(RemediationProposal.created_at)).limit(limit).offset(offset)
        ).all()
        return list(items), total

    def get_proposal(self, db: Session, proposal_id: str) -> Optional[RemediationProposal]:
        """Get proposal detail by ID with associated validations."""
        return db.scalar(
            select(RemediationProposal)
            .options(
                selectinload(RemediationProposal.validations),
                selectinload(RemediationProposal.audits),
            )
            .where(RemediationProposal.id == proposal_id)
        )

    async def revalidate_proposal(
        self,
        db: Session,
        proposal_id: str,
        user_id: str = "user",
    ) -> RemediationProposal:
        """Re-run the validation pipeline on an existing proposal against current source."""
        proposal = self.get_proposal(db, proposal_id)
        if not proposal:
            raise ValueError(f"Proposal {proposal_id} not found.")

        repository = db.scalar(select(Repository).where(Repository.id == proposal.repository_id))
        snapshot = db.scalar(select(RepositorySnapshot).where(RepositorySnapshot.id == proposal.snapshot_id))
        if not repository or not snapshot:
            raise ValueError("Repository or snapshot missing.")

        source_content = await self.get_source_content(db, repository, snapshot, proposal.file_path)
        if not source_content:
            proposal.status = "STALE"
            proposal.failure_reason = f"Source file '{proposal.file_path}' no longer accessible."
            db.commit()
            return proposal

        # Re-run validations
        all_passed, outcomes, _ = self.validator.validate(
            file_path=proposal.file_path,
            original_content=source_content,
            original_hash=proposal.original_content_hash,
            target_hash=proposal.target_content_hash,
            start_line=proposal.start_line,
            end_line=proposal.end_line,
            original_snippet=proposal.original_code_snippet,
            proposed_snippet=proposal.proposed_code_snippet,
            target_rule_id="PYSEC001",  # default check
            remediation_rule_id=proposal.remediation_rule_id,
        )

        # Remove old validations and persist new ones
        for val in proposal.validations:
            db.delete(val)
        db.flush()

        for outcome in outcomes:
            val_rec = RemediationValidation(
                proposal_id=proposal.id,
                check_id=outcome.check_id,
                check_name=outcome.check_name,
                status=outcome.status,
                explanation=outcome.explanation,
                diagnostic_message=outcome.diagnostic_message,
            )
            db.add(val_rec)

        # Check for drift
        current_hash = compute_content_hash(source_content)
        if current_hash != proposal.original_content_hash:
            proposal.status = "STALE"
            proposal.failure_reason = "Source content has drifted from proposal coordinates."
        else:
            proposal.status = "VALIDATED" if all_passed else "VALIDATION_FAILED"
            proposal.failure_reason = None

        audit = RemediationAudit(
            proposal_id=proposal.id,
            repository_id=proposal.repository_id,
            action="REVALIDATED",
            actor=user_id,
            details_json={"new_status": proposal.status, "checks_passed": all_passed},
        )
        db.add(audit)
        db.commit()
        db.refresh(proposal)
        return proposal

    def approve_proposal(
        self,
        db: Session,
        proposal_id: str,
        notes: Optional[str] = None,
        user_id: str = "user",
    ) -> RemediationProposal:
        """Record explicit user approval of a validated proposal."""
        proposal = self.get_proposal(db, proposal_id)
        if not proposal:
            raise ValueError(f"Proposal {proposal_id} not found.")

        if proposal.status not in ("VALIDATED", "APPROVED"):
            raise ValueError(
                f"Cannot approve proposal in status '{proposal.status}'. "
                "Only successfully VALIDATED proposals can be approved."
            )

        proposal.status = "APPROVED"
        proposal.failure_reason = None

        audit = RemediationAudit(
            proposal_id=proposal.id,
            repository_id=proposal.repository_id,
            action="APPROVED",
            actor=user_id,
            details_json={"notes": notes},
        )
        db.add(audit)
        db.commit()
        db.refresh(proposal)
        return proposal

    def reject_proposal(
        self,
        db: Session,
        proposal_id: str,
        reason: str,
        user_id: str = "user",
    ) -> RemediationProposal:
        """Record explicit user rejection of a proposal without altering files."""
        proposal = self.get_proposal(db, proposal_id)
        if not proposal:
            raise ValueError(f"Proposal {proposal_id} not found.")

        if proposal.status == "APPLIED":
            raise ValueError("Cannot reject a proposal that has already been applied.")

        proposal.status = "REJECTED"
        proposal.failure_reason = f"User rejected: {reason}"

        audit = RemediationAudit(
            proposal_id=proposal.id,
            repository_id=proposal.repository_id,
            action="REJECTED",
            actor=user_id,
            details_json={"reason": reason},
        )
        db.add(audit)
        db.commit()
        db.refresh(proposal)
        return proposal

    def apply_proposal(
        self,
        db: Session,
        proposal_id: str,
        user_id: str = "user",
    ) -> RemediationApplyResponse:
        """Safely apply an approved proposal to the authorized repository workspace."""
        proposal = self.get_proposal(db, proposal_id)
        if not proposal:
            raise ValueError(f"Proposal {proposal_id} not found.")

        return self.applier.apply_patch(db=db, proposal=proposal, user_id=user_id)

    def get_audit_history(self, db: Session, proposal_id: str) -> List[RemediationAudit]:
        """Fetch audit log history for a proposal."""
        return list(
            db.scalars(
                select(RemediationAudit)
                .where(RemediationAudit.proposal_id == proposal_id)
                .order_by(desc(RemediationAudit.created_at))
            ).all()
        )


# Global singleton remediation service
default_remediation_service = RemediationService()
