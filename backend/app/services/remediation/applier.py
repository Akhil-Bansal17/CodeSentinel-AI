"""Safe Patch Application Service for CodeSentinel AI (Phase 7).

Applies explicitly approved patch proposals to authorized, writable workspaces.
Enforces:
  1. Human approval pre-requisite (APPLY requires APPROVED state)
  2. Workspace containment inside LOCAL_REPOSITORY_ROOTS
  3. Pre-write drift detection (source hash re-verification)
  4. Atomic temporary file swap (os.replace)
  5. Post-write hash verification
  6. Idempotency (prevent double application)
  7. Read-only archive fallback to diff export
  8. Immutable snapshot protection (snapshots are NEVER mutated)
"""

import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.models.base import (
    RemediationAudit,
    RemediationProposal,
    Repository,
)
from backend.app.schemas.remediation import RemediationApplyResponse
from backend.app.services.remediation.patch_engine import (
    PatchConflictError,
    PatchError,
    ProtectedPathError,
    apply_replacement_to_source,
    compute_content_hash,
    validate_path_safety,
)


class SafePatchApplier:
    """Service executing validated and approved patch applications."""

    def resolve_writable_workspace(self, repository: Repository) -> Optional[Path]:
        """Locate authorized local writable workspace for repository, if available."""
        if repository.source_type != "local":
            return None

        candidates = []
        if repository.source_url:
            candidates.append(Path(repository.source_url).resolve())

        raw_ident = repository.source_identifier
        if raw_ident.startswith("local:"):
            raw_ident = raw_ident[6:]
        if raw_ident:
            candidates.append(Path(raw_ident).resolve())

        allowed_roots = settings.get_allowed_local_roots()

        # Check explicit path candidates
        for cand in candidates:
            if cand.exists() and cand.is_dir():
                if not allowed_roots or any(cand == root or root in cand.parents for root in allowed_roots):
                    return cand

        # Check subdirectories within allowed roots
        if allowed_roots:
            for root in allowed_roots:
                if root.name.lower() in {repository.name.lower(), raw_ident.lower()}:
                    return root
                try:
                    for child in root.iterdir():
                        if child.is_dir() and child.name.lower() in {repository.name.lower(), raw_ident.lower()}:
                            return child
                except Exception:
                    pass

        return None

    def apply_patch(
        self,
        db: Session,
        proposal: RemediationProposal,
        user_id: str = "user",
    ) -> RemediationApplyResponse:
        """Safely apply an approved proposal to the authorized repository workspace."""
        # 1. Idempotency check
        if proposal.status == "APPLIED":
            return RemediationApplyResponse(
                status="APPLIED",
                proposal_id=proposal.id,
                file_path=proposal.file_path,
                message="Proposal has already been applied.",
                can_export_diff=True,
                unified_diff=proposal.unified_diff,
                new_file_hash=proposal.target_content_hash,
            )

        # 2. State validation: Must be APPROVED
        if proposal.status != "APPROVED":
            raise ValueError(
                f"Cannot apply proposal in status '{proposal.status}'. "
                "Only proposals explicitly reviewed and APPROVED can be applied."
            )

        # 3. Path safety check
        validate_path_safety(proposal.file_path)

        # 4. Resolve workspace
        repository = db.scalar(select(Repository).where(Repository.id == proposal.repository_id))
        if not repository:
            raise ValueError(f"Repository {proposal.repository_id} not found.")

        workspace_root = self.resolve_writable_workspace(repository)
        if not workspace_root:
            # Fallback for read-only snapshots / remote clones
            return RemediationApplyResponse(
                status="CANNOT_APPLY_READ_ONLY_ARCHIVE",
                proposal_id=proposal.id,
                file_path=proposal.file_path,
                message=(
                    "In-place application is unavailable because the repository is a read-only snapshot "
                    "or no authorized writable workspace path was found in LOCAL_REPOSITORY_ROOTS. "
                    "You can export and apply the unified diff manually."
                ),
                can_export_diff=True,
                unified_diff=proposal.unified_diff,
            )

        target_file = (workspace_root / proposal.file_path).resolve()

        # Strict containment verification
        if workspace_root != target_file and workspace_root not in target_file.parents:
            raise ProtectedPathError(
                f"Path traversal detected: target '{target_file}' is outside workspace '{workspace_root}'."
            )

        if not target_file.exists() or not target_file.is_file():
            proposal.status = "FAILED"
            proposal.failure_reason = f"Target file '{proposal.file_path}' does not exist on disk."
            db.commit()
            return RemediationApplyResponse(
                status="FAILED",
                proposal_id=proposal.id,
                file_path=proposal.file_path,
                message=f"Target file '{proposal.file_path}' does not exist in workspace.",
                can_export_diff=True,
                unified_diff=proposal.unified_diff,
            )

        # 5. Read current disk content and verify pre-write hash (Anti-Drift)
        try:
            current_content = target_file.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            raise PatchError("Cannot patch non-UTF8 encoded or binary file.")

        current_hash = compute_content_hash(current_content)
        if current_hash != proposal.original_content_hash:
            proposal.status = "STALE"
            proposal.failure_reason = (
                f"File on disk changed since proposal was generated. "
                f"Expected hash {proposal.original_content_hash[:8]}, found {current_hash[:8]}."
            )
            # Record audit
            audit = RemediationAudit(
                proposal_id=proposal.id,
                repository_id=proposal.repository_id,
                action="STALE_ABORT",
                actor=user_id,
                details_json={
                    "reason": "Source drift detected prior to write.",
                    "expected_hash": proposal.original_content_hash,
                    "disk_hash": current_hash,
                },
            )
            db.add(audit)
            db.commit()
            return RemediationApplyResponse(
                status="STALE",
                proposal_id=proposal.id,
                file_path=proposal.file_path,
                message=(
                    "File on disk has changed since proposal was generated. "
                    "Proposal marked STALE to prevent overwriting concurrent user changes."
                ),
                can_export_diff=True,
                unified_diff=proposal.unified_diff,
            )

        # 6. Synthesize modified content in memory
        try:
            modified_content, new_hash = apply_replacement_to_source(
                original_content=current_content,
                start_line=proposal.start_line,
                end_line=proposal.end_line,
                expected_original_snippet=proposal.original_code_snippet,
                proposed_snippet=proposal.proposed_code_snippet,
            )
        except PatchConflictError as e:
            proposal.status = "STALE"
            proposal.failure_reason = str(e)
            db.commit()
            return RemediationApplyResponse(
                status="STALE",
                proposal_id=proposal.id,
                file_path=proposal.file_path,
                message="Target region content diverged from proposal coordinates.",
                can_export_diff=True,
                unified_diff=proposal.unified_diff,
            )

        if new_hash != proposal.target_content_hash:
            raise PatchError("Synthesized content hash does not match expected proposal target hash.")

        # 7. Atomic write: write to temp file then os.replace
        temp_file = target_file.with_name(f".{target_file.name}.csai_tmp_{uuid.uuid4().hex[:8]}")
        try:
            temp_file.write_text(modified_content, encoding="utf-8")
            os.replace(temp_file, target_file)
        except Exception as e:
            if temp_file.exists():
                try:
                    temp_file.unlink()
                except Exception:
                    pass
            proposal.status = "FAILED"
            proposal.failure_reason = f"Disk write failed: {e}"
            db.commit()
            raise PatchError(f"Atomic file write failed: {e}")

        # 8. Post-write verification: Re-read disk file and verify hash
        try:
            post_content = target_file.read_text(encoding="utf-8")
            post_hash = compute_content_hash(post_content)
            if post_hash != proposal.target_content_hash:
                # Post write verification failed; attempt rollback
                temp_file.write_text(current_content, encoding="utf-8")
                os.replace(temp_file, target_file)
                proposal.status = "FAILED"
                proposal.failure_reason = "Post-write hash mismatch; rolled back safely."
                db.commit()
                return RemediationApplyResponse(
                    status="FAILED",
                    proposal_id=proposal.id,
                    file_path=proposal.file_path,
                    message="Post-write hash verification failed. Restored original content.",
                    can_export_diff=True,
                    unified_diff=proposal.unified_diff,
                )
        except Exception as e:
            raise PatchError(f"Post-write verification encountered error: {e}")

        # 9. Commit lifecycle changes and audit record
        proposal.status = "APPLIED"
        proposal.applied_at = datetime.now(timezone.utc)
        proposal.applied_by = user_id
        proposal.failure_reason = None

        audit = RemediationAudit(
            proposal_id=proposal.id,
            repository_id=proposal.repository_id,
            action="APPLIED",
            actor=user_id,
            details_json={
                "file_path": proposal.file_path,
                "target_hash": new_hash,
                "applied_at": proposal.applied_at.isoformat(),
            },
        )
        db.add(audit)
        db.commit()

        return RemediationApplyResponse(
            status="APPLIED",
            proposal_id=proposal.id,
            file_path=proposal.file_path,
            message="Patch safely applied to workspace with verified post-write hash.",
            can_export_diff=True,
            unified_diff=proposal.unified_diff,
            new_file_hash=new_hash,
        )


# Global singleton applier
default_patch_applier = SafePatchApplier()
