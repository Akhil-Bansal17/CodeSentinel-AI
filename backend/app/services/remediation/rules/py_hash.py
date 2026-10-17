"""Remediation strategies for Python weak cryptographic hash usage (PYSEC004).

Provides two distinct strategies:
1. FIX-PYSEC004-HASH-SHA256: Migrates broken algorithms (MD5, SHA-1) to SHA-256 for cryptographic usage.
2. FIX-PYSEC004-NONSEC-FLAG: Adds usedforsecurity=False for non-security checksums / cache-keys (Python 3.9+).
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


class PyMigrateToSha256Rule(BaseRemediationRule):
    """FIX-PYSEC004-HASH-SHA256: Migrate broken hash algorithm to SHA-256."""

    @property
    def rule_id(self) -> str:
        return "FIX-PYSEC004-HASH-SHA256"

    @property
    def target_finding_rules(self) -> Set[str]:
        return {"PYSEC004"}

    @property
    def name(self) -> str:
        return "Migrate Hash Algorithm to SHA-256"

    @property
    def description(self) -> str:
        return (
            "Replaces broken hash algorithms (hashlib.md5, hashlib.sha1) with hashlib.sha256. "
            "MD5 and SHA-1 suffer from collision attacks and must not be used for security-sensitive digests."
        )

    @property
    def transformation_strategy(self) -> str:
        return "Substitute hashlib.md5 or hashlib.sha1 calls with hashlib.sha256."

    @property
    def risk_level(self) -> RemediationRisk:
        return RemediationRisk.MEDIUM

    @property
    def default_confidence(self) -> RemediationConfidence:
        return RemediationConfidence.HIGH

    @property
    def applicable_languages(self) -> Set[str]:
        return {"Python"}

    @property
    def preconditions(self) -> List[str]:
        return [
            "Call site must invoke hashlib.md5 or hashlib.sha1.",
            "Target file must be valid Python syntax.",
        ]

    @property
    def unsupported_cases(self) -> List[str]:
        return [
            "Third-party C crypto libraries or external native bindings.",
            "Workflows requiring strict protocol backward compatibility (e.g. legacy NTLM, Git SHA-1, HMAC-MD5 tokens).",
        ]

    @property
    def rationale(self) -> str:
        return (
            "MD5 and SHA-1 have proven collision vulnerabilities. Migrating to SHA-256 restores 128-bit collision "
            "resistance. Warning: Migrating algorithms produces different digests; ensure external consumers or stored hashes are updated."
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
                unsupported_reason="Unable to safely identify hashlib.md5 or hashlib.sha1 pattern at finding coordinates.",
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

        # Pattern 1: hashlib.md5( -> hashlib.sha256(
        # Pattern 2: hashlib.sha1( -> hashlib.sha256(
        proposed_slice = re.sub(r"\bhashlib\.(?:md5|sha1)\b", "hashlib.sha256", proposed_slice)

        # Pattern 3: hashlib.new(['"]md5['"]) -> hashlib.new('sha256')
        proposed_slice = re.sub(r"\bhashlib\.new\(\s*['\"](?:md5|sha1)['\"]", "hashlib.sha256(", proposed_slice)

        if proposed_slice == orig_slice:
            return None

        return RemediationCandidate(
            remediation_rule_id=self.rule_id,
            target_rule_id="PYSEC004",
            file_path=getattr(finding, "file_path", ""),
            start_line=start_line,
            end_line=end_line,
            start_column=getattr(finding, "start_column", None),
            end_column=getattr(finding, "end_column", None),
            original_snippet=orig_slice,
            proposed_snippet=proposed_slice,
            rationale=self.rationale,
            risk_level=RemediationRisk.MEDIUM,
            confidence=RemediationConfidence.HIGH,
            metadata={"transformation": "hash_to_sha256"},
        )


class PyAddUsedForSecurityFalseRule(BaseRemediationRule):
    """FIX-PYSEC004-NONSEC-FLAG: Mark non-security hash usage with usedforsecurity=False."""

    @property
    def rule_id(self) -> str:
        return "FIX-PYSEC004-NONSEC-FLAG"

    @property
    def target_finding_rules(self) -> Set[str]:
        return {"PYSEC004"}

    @property
    def name(self) -> str:
        return "Add usedforsecurity=False Flag for Non-Security Checksums"

    @property
    def description(self) -> str:
        return (
            "Appends usedforsecurity=False to hashlib.md5() or hashlib.sha1() calls in Python 3.9+. "
            "This documents intent that the digest is for non-security checksums, cache keys, or deduplication, "
            "satisfying FIPS compliance and static analysis tools without breaking existing hash compatibility."
        )

    @property
    def transformation_strategy(self) -> str:
        return "Add usedforsecurity=False keyword argument to hashlib call."

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
            "Call site must invoke hashlib.md5 or hashlib.sha1 without existing usedforsecurity parameter.",
            "Target environment must be Python 3.9+.",
        ]

    @property
    def unsupported_cases(self) -> List[str]:
        return [
            "Security-sensitive workflows (signatures, password verification).",
            "Python runtime versions older than 3.9.",
        ]

    @property
    def rationale(self) -> str:
        return (
            "When MD5 or SHA-1 is required for file deduplication, cache indexing, or data chunk partitioning, "
            "usedforsecurity=False documents that cryptographic collision resistance is not required."
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
                unsupported_reason="Unable to safely insert usedforsecurity=False parameter at finding coordinates.",
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
        if not orig_slice or "usedforsecurity" in orig_slice:
            return None

        # Insert usedforsecurity=False inside hashlib.md5(...) or hashlib.sha1(...)
        # e.g. hashlib.md5(data) -> hashlib.md5(data, usedforsecurity=False)
        # e.g. hashlib.md5() -> hashlib.md5(usedforsecurity=False)
        def _add_flag(match: re.Match) -> str:
            prefix = match.group(1)  # e.g. hashlib.md5(
            inner = match.group(2).strip()  # e.g. data or empty
            if inner:
                return f"{prefix}{inner}, usedforsecurity=False)"
            else:
                return f"{prefix}usedforsecurity=False)"

        proposed_slice = re.sub(
            r"(\bhashlib\.(?:md5|sha1)\()([^)]*)\)",
            _add_flag,
            orig_slice,
            count=1,
        )

        if proposed_slice == orig_slice:
            return None

        return RemediationCandidate(
            remediation_rule_id=self.rule_id,
            target_rule_id="PYSEC004",
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
            metadata={"transformation": "add_usedforsecurity_false"},
        )
