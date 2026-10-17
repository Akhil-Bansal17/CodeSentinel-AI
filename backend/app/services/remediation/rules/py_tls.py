"""Remediation strategy for Python TLS verification disabled (PYSEC005).

Restores TLS certificate verification by removing verify=False or replacing with safe default context.
"""

import re
from typing import Any, List, Optional, Set

from backend.app.services.remediation.rules.base import (
    BaseRemediationRule,
    RemediationCandidate,
    RemediationConfidence,
    RemediationFeasibility,
    RemediationRisk,
)


class PyRestoreTlsVerificationRule(BaseRemediationRule):
    """FIX-PYSEC005-RESTORE-TLS: Restore TLS Certificate Verification."""

    @property
    def rule_id(self) -> str:
        return "FIX-PYSEC005-RESTORE-TLS"

    @property
    def target_finding_rules(self) -> Set[str]:
        return {"PYSEC005"}

    @property
    def name(self) -> str:
        return "Restore TLS Certificate Verification"

    @property
    def description(self) -> str:
        return (
            "Restores strict TLS certificate verification by replacing verify=False with verify=True "
            "(or removing it to use standard CA bundles) and replacing ssl._create_unverified_context() "
            "with ssl.create_default_context()."
        )

    @property
    def transformation_strategy(self) -> str:
        return "Replace verify=False with verify=True or replace ssl._create_unverified_context() with ssl.create_default_context()."

    @property
    def risk_level(self) -> RemediationRisk:
        return RemediationRisk.LOW

    @property
    def default_confidence(self) -> RemediationConfidence:
        return RemediationConfidence.HIGH

    @property
    def applicable_languages(self) -> Set[str]:
        return {"Python"}

    @property
    def preconditions(self) -> List[str]:
        return [
            "Call site must explicitly disable TLS verification via verify=False or ssl._create_unverified_context().",
            "Target file must be valid Python syntax.",
        ]

    @property
    def unsupported_cases(self) -> List[str]:
        return [
            "Dynamic verification parameters where verify is passed as a variable (e.g. verify=check_tls).",
            "Complex custom SSLContext subclassing where verification flags are modified dynamically across multiple statements.",
        ]

    @property
    def rationale(self) -> str:
        return (
            "Disabling TLS verification leaves HTTP client requests vulnerable to active Man-in-the-Middle (MitM) "
            "adversaries. Restoring verification ensures traffic is authenticated against trusted Certificate Authorities."
        )

    def assess_feasibility(self, finding: Any, source_content: str) -> RemediationFeasibility:
        rule_id = getattr(finding, "rule_id", "")
        if rule_id not in self.target_finding_rules:
            return RemediationFeasibility(
                is_supported=False,
                unsupported_reason=f"Rule {rule_id} is not supported by {self.rule_id}.",
            )

        candidate = self.generate_candidate(finding, source_content)
        if not candidate:
            return RemediationFeasibility(
                is_supported=False,
                unsupported_reason="Unable to safely identify verify=False or unverified context pattern at finding coordinates.",
                suggested_action="MANUAL_REMEDIATION_REQUIRED",
            )

        return RemediationFeasibility(
            is_supported=True,
            remediation_rule_id=self.rule_id,
            strategy_name=self.name,
            description=self.description,
            rationale=self.rationale,
            confidence=self.default_confidence,
            risk_level=self.risk_level,
            candidate=candidate,
            requires_human_review=True,
            suggested_action="REVIEW_PROPOSAL",
        )

    def generate_candidate(self, finding: Any, source_content: str) -> Optional[RemediationCandidate]:
        start_line = getattr(finding, "start_line", 1)
        end_line = getattr(finding, "end_line", start_line) or start_line
        lines = source_content.splitlines(keepends=True)

        if not (1 <= start_line <= len(lines)):
            return None

        orig_slice = "".join(lines[start_line - 1 : min(end_line, len(lines))])
        if not orig_slice:
            return None

        proposed_slice = orig_slice

        # Case 1: ssl._create_unverified_context() -> ssl.create_default_context()
        if "_create_unverified_context" in proposed_slice:
            proposed_slice = proposed_slice.replace("_create_unverified_context", "create_default_context")

        # Case 2: verify=False -> verify=True
        elif re.search(r"\bverify\s*=\s*False\b", proposed_slice):
            proposed_slice = re.sub(r"\bverify\s*=\s*False\b", "verify=True", proposed_slice)

        if proposed_slice == orig_slice:
            return None

        return RemediationCandidate(
            remediation_rule_id=self.rule_id,
            target_rule_id="PYSEC005",
            file_path=getattr(finding, "file_path", ""),
            start_line=start_line,
            end_line=end_line,
            start_column=getattr(finding, "start_column", None),
            end_column=getattr(finding, "end_column", None),
            original_snippet=orig_slice,
            proposed_snippet=proposed_slice,
            rationale=self.rationale,
            risk_level=RemediationRisk.LOW,
            confidence=RemediationConfidence.HIGH,
            metadata={"transformation": "verify_false_to_true"},
        )
