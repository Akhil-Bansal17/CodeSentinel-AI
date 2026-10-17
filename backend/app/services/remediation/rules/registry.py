"""Remediation Rule Registry for CodeSentinel AI (Phase 7).

Manages extensible catalog of deterministic remediation rules.
Provides lookup by remediation rule ID, finding rule ID, and automated
feasibility evaluation.
"""

from typing import Any, Dict, List, Optional, Set

from backend.app.services.remediation.rules.base import (
    BaseRemediationRule,
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


class RemediationRuleRegistry:
    """Registry maintaining active deterministic remediation rules."""

    def __init__(self) -> None:
        self._rules_by_id: Dict[str, BaseRemediationRule] = {}
        self._rules_by_finding_rule: Dict[str, List[BaseRemediationRule]] = {}
        self._register_default_rules()

    def _register_default_rules(self) -> None:
        """Register default Phase 7 deterministic remediation rules."""
        rules = [
            PyEvalToLiteralEvalRule(),
            PyRestoreTlsVerificationRule(),
            PyMigrateToSha256Rule(),
            PyAddUsedForSecurityFalseRule(),
            PyShellToSubprocessRule(),
            JsDynamicToSafeParseRule(),
            JsRawHtmlToTextContentRule(),
            DepUpgradeRemediationRule(),
        ]
        for rule in rules:
            self.register(rule)

    def register(self, rule: BaseRemediationRule) -> None:
        """Register a new remediation rule."""
        self._rules_by_id[rule.rule_id] = rule
        for target in rule.target_finding_rules:
            if target not in self._rules_by_finding_rule:
                self._rules_by_finding_rule[target] = []
            if rule not in self._rules_by_finding_rule[target]:
                self._rules_by_finding_rule[target].append(rule)

    def get_by_id(self, rule_id: str) -> Optional[BaseRemediationRule]:
        """Look up a rule by its remediation rule ID."""
        return self._rules_by_id.get(rule_id)

    def get_for_finding_rule(self, finding_rule_id: str) -> List[BaseRemediationRule]:
        """Look up all remediation rules supporting a given finding rule ID."""
        return self._rules_by_finding_rule.get(finding_rule_id, [])

    def list_rules(self) -> List[BaseRemediationRule]:
        """Return all registered remediation rules."""
        return list(self._rules_by_id.values())

    def assess_finding(
        self,
        finding: Any,
        source_content: str,
        preferred_rule_id: Optional[str] = None,
    ) -> RemediationFeasibility:
        """Assess feasibility of fixing a finding.
        
        Returns the best feasible candidate or an honest MANUAL_REMEDIATION_REQUIRED result.
        """
        finding_rule_id = getattr(finding, "rule_id", "")

        # 1. If preferred rule ID is provided, try that first
        if preferred_rule_id:
            rule = self.get_by_id(preferred_rule_id)
            if rule:
                return rule.assess_feasibility(finding, source_content)
            return RemediationFeasibility(
                is_supported=False,
                remediation_rule_id=preferred_rule_id,
                unsupported_reason=f"Remediation rule '{preferred_rule_id}' is not registered.",
                suggested_action="MANUAL_REMEDIATION_REQUIRED",
            )

        # 2. Look up candidate rules for this finding rule
        candidates = self.get_for_finding_rule(finding_rule_id)
        if not candidates:
            return RemediationFeasibility(
                is_supported=False,
                unsupported_reason=(
                    f"No automated remediation strategy currently exists for finding rule '{finding_rule_id}'. "
                    "Automated patching is only permitted for proven safe deterministic transformations."
                ),
                suggested_action="MANUAL_REMEDIATION_REQUIRED",
            )

        # 3. Evaluate each candidate rule until we find one that is feasible
        last_infeasible: Optional[RemediationFeasibility] = None
        for rule in candidates:
            feasibility = rule.assess_feasibility(finding, source_content)
            if feasibility.is_supported and feasibility.candidate is not None:
                return feasibility
            last_infeasible = feasibility

        # If all candidates evaluated as infeasible for this specific code context
        if last_infeasible:
            return last_infeasible

        return RemediationFeasibility(
            is_supported=False,
            unsupported_reason=f"Code context for '{finding_rule_id}' could not be safely transformed.",
            suggested_action="MANUAL_REMEDIATION_REQUIRED",
        )


# Global singleton instance
default_remediation_registry = RemediationRuleRegistry()
