"""Remediation package for CodeSentinel AI (Phase 7)."""

from backend.app.services.remediation.applier import SafePatchApplier, default_patch_applier
from backend.app.services.remediation.patch_engine import (
    PatchConflictError,
    PatchError,
    ProtectedPathError,
    apply_replacement_to_source,
    compute_content_hash,
    generate_unified_diff,
    is_protected_path,
    validate_path_safety,
)
from backend.app.services.remediation.service import (
    RemediationService,
    default_remediation_service,
)
from backend.app.services.remediation.validator import (
    PatchValidator,
    ValidationOutcome,
    default_patch_validator,
)

__all__ = [
    "RemediationService",
    "default_remediation_service",
    "PatchValidator",
    "default_patch_validator",
    "ValidationOutcome",
    "SafePatchApplier",
    "default_patch_applier",
    "compute_content_hash",
    "generate_unified_diff",
    "apply_replacement_to_source",
    "is_protected_path",
    "validate_path_safety",
    "PatchError",
    "PatchConflictError",
    "ProtectedPathError",
]
