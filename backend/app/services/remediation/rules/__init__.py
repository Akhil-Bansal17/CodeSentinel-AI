"""Remediation rules package for CodeSentinel AI (Phase 7)."""

from backend.app.services.remediation.rules.base import (
    BaseRemediationRule,
    RemediationCandidate,
    RemediationConfidence,
    RemediationFeasibility,
    RemediationRisk,
)
from backend.app.services.remediation.rules.dep_upgrade import DepUpgradeRemediationRule
from backend.app.services.remediation.rules.js_dynamic import (
    JsDynamicToSafeParseRule,
    JsRawHtmlToTextContentRule,
)
from backend.app.services.remediation.rules.py_eval import PyEvalToLiteralEvalRule
from backend.app.services.remediation.rules.py_hash import (
    PyAddUsedForSecurityFalseRule,
    PyMigrateToSha256Rule,
)
from backend.app.services.remediation.rules.py_shell import PyShellToSubprocessRule
from backend.app.services.remediation.rules.py_tls import PyRestoreTlsVerificationRule
from backend.app.services.remediation.rules.registry import (
    RemediationRuleRegistry,
    default_remediation_registry,
)

__all__ = [
    "BaseRemediationRule",
    "RemediationRisk",
    "RemediationConfidence",
    "RemediationCandidate",
    "RemediationFeasibility",
    "RemediationRuleRegistry",
    "default_remediation_registry",
    "PyEvalToLiteralEvalRule",
    "PyRestoreTlsVerificationRule",
    "PyMigrateToSha256Rule",
    "PyAddUsedForSecurityFalseRule",
    "PyShellToSubprocessRule",
    "JsDynamicToSafeParseRule",
    "JsRawHtmlToTextContentRule",
    "DepUpgradeRemediationRule",
]
