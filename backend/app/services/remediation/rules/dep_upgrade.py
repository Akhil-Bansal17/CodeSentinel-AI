"""Deterministic Dependency Vulnerability Remediation Rule (Phase 7).

Upgrades vulnerable direct dependency specifications in package manifests
(e.g., requirements.txt, package.json) only when authoritative advisory
evidence supplies a validated remediation version.
Zero package-manager execution or external network queries.
"""

import json
import re
from typing import Any, List, Optional, Set

from backend.app.services.remediation.rules.base import (
    BaseRemediationRule,
    RemediationCandidate,
    RemediationConfidence,
    RemediationFeasibility,
    RemediationRisk,
)


class DepUpgradeRemediationRule(BaseRemediationRule):
    """FIX-DEP-UPGRADE-VERSION: Safe dependency manifest version upgrade."""

    @property
    def rule_id(self) -> str:
        return "FIX-DEP-UPGRADE-VERSION"

    @property
    def target_finding_rules(self) -> Set[str]:
        return {"DEP_VULN", "DEPENDENCY_VULNERABILITY", "DEP001", "VULNERABLE_DEPENDENCY"}

    @property
    def name(self) -> str:
        return "Upgrade Vulnerable Dependency Version"

    @property
    def description(self) -> str:
        return (
            "Updates the manifest version constraint to the minimum safe fixed version "
            "documented in authoritative vulnerability advisories."
        )

    @property
    def transformation_strategy(self) -> str:
        return (
            "Parse the manifest (requirements.txt or package.json), identify the vulnerable package "
            "specification, and replace the vulnerable constraint with the recommended fixed version."
        )

    @property
    def risk_level(self) -> RemediationRisk:
        return RemediationRisk.MEDIUM

    @property
    def default_confidence(self) -> RemediationConfidence:
        return RemediationConfidence.HIGH

    @property
    def applicable_languages(self) -> Set[str]:
        return {"Python", "JavaScript", "TypeScript", "JSON", "Text"}

    @property
    def preconditions(self) -> List[str]:
        return [
            "Manifest file must be directly editable text (requirements.txt or package.json).",
            "An authoritative fixed/remediation version must be provided by the advisory dataset.",
            "Lockfiles must not be modified independently without corresponding manifest alignment.",
            "Zero automatic network calls to PyPI, npm, or external package registries.",
        ]

    @property
    def unsupported_cases(self) -> List[str]:
        return [
            "Advisories with no known fixed version (zero-day or unpatched vulnerabilities).",
            "Binary or proprietary lockfile formats (e.g. poetry.lock, Pipfile.lock without manifest).",
            "Transitive dependencies not declared in the root project manifest.",
            "Complex git-url or local-file path dependency declarations.",
        ]

    @property
    def rationale(self) -> str:
        return (
            "Bumping a vulnerable dependency to its validated fixed version removes known CVEs. "
            "Operating strictly on the root manifest prevents lockfile desynchronization and allows "
            "developers to run their standard test and lock-generation workflows safely."
        )

    def _extract_dep_info(self, finding: Any) -> Optional[dict]:
        """Extract package name, fixed version, and manifest details from finding or metadata."""
        # Check direct attributes on finding or DependencyVulnerability model
        pkg_name = (
            getattr(finding, "package_name", None)
            or getattr(finding, "metadata_json", {}).get("package_name")
            or getattr(finding, "metadata_json", {}).get("package")
        )
        remediation_version = (
            getattr(finding, "remediation_version", None)
            or getattr(finding, "metadata_json", {}).get("remediation_version")
            or getattr(finding, "metadata_json", {}).get("fixed_version")
        )
        file_path = getattr(finding, "file_path", None) or getattr(finding, "manifest_path", "")

        if not pkg_name or not remediation_version:
            return None

        return {
            "package_name": pkg_name.strip(),
            "remediation_version": remediation_version.strip(),
            "file_path": file_path,
        }

    def assess_feasibility(
        self,
        finding: Any,
        source_content: str,
    ) -> RemediationFeasibility:
        dep_info = self._extract_dep_info(finding)
        if not dep_info:
            return RemediationFeasibility(
                is_supported=False,
                remediation_rule_id=self.rule_id,
                strategy_name=self.name,
                description=self.description,
                unsupported_reason=(
                    "No authoritative remediation version or package name was found in "
                    "the vulnerability advisory evidence. Manual remediation required."
                ),
                requires_human_review=True,
                suggested_action="MANUAL_REMEDIATION_REQUIRED",
            )

        file_path = dep_info["file_path"].lower()
        if not (file_path.endswith("requirements.txt") or file_path.endswith("package.json")):
            return RemediationFeasibility(
                is_supported=False,
                remediation_rule_id=self.rule_id,
                strategy_name=self.name,
                description=self.description,
                unsupported_reason=(
                    f"Automated manifest upgrade is only supported for requirements.txt and package.json; "
                    f"target file '{dep_info['file_path']}' requires manual update."
                ),
                requires_human_review=True,
                suggested_action="MANUAL_REMEDIATION_REQUIRED",
            )

        candidate = self.generate_candidate(finding, source_content)
        if not candidate:
            return RemediationFeasibility(
                is_supported=False,
                remediation_rule_id=self.rule_id,
                strategy_name=self.name,
                description=self.description,
                unsupported_reason=(
                    f"Could not locate package '{dep_info['package_name']}' in {dep_info['file_path']} "
                    f"or line structure is complex. Manual remediation required."
                ),
                requires_human_review=True,
                suggested_action="MANUAL_REMEDIATION_REQUIRED",
            )

        return RemediationFeasibility(
            is_supported=True,
            remediation_rule_id=self.rule_id,
            strategy_name=self.name,
            description=self.description,
            rationale=(
                f"Upgrade package '{dep_info['package_name']}' to safe fixed version "
                f"'{dep_info['remediation_version']}' based on advisory evidence."
            ),
            confidence=self.default_confidence,
            risk_level=self.risk_level,
            candidate=candidate,
            requires_human_review=True,
            suggested_action="PROPOSE_PATCH",
        )

    def generate_candidate(
        self,
        finding: Any,
        source_content: str,
    ) -> Optional[RemediationCandidate]:
        dep_info = self._extract_dep_info(finding)
        if not dep_info:
            return None

        pkg_name = dep_info["package_name"]
        fixed_version = dep_info["remediation_version"]
        file_path = dep_info["file_path"]

        lines = source_content.splitlines(keepends=True)

        if file_path.lower().endswith("requirements.txt"):
            # Search for requirement line matching package
            # e.g.: requests==2.25.0, urllib3>=1.25,<1.26.5
            pattern = re.compile(
                rf"^\s*{re.escape(pkg_name)}\s*([=><~^!].*?)?(\s*#.*)?$",
                re.IGNORECASE,
            )
            for idx, line in enumerate(lines):
                match = pattern.match(line.rstrip("\r\n"))
                if match:
                    original_line = line.rstrip("\r\n")
                    trailing_comment = match.group(2) or ""
                    # Preserve line ending
                    newline = "\r\n" if line.endswith("\r\n") else ("\n" if line.endswith("\n") else "")
                    new_line_content = f"{pkg_name}>={fixed_version}{trailing_comment}{newline}"
                    return RemediationCandidate(
                        remediation_rule_id=self.rule_id,
                        target_rule_id=getattr(finding, "rule_id", "DEP_VULN"),
                        file_path=file_path,
                        start_line=idx + 1,
                        end_line=idx + 1,
                        original_snippet=line,
                        proposed_snippet=new_line_content,
                        rationale=(
                            f"Update {pkg_name} to safe version >={fixed_version} to resolve vulnerability."
                        ),
                        risk_level=self.risk_level,
                        confidence=self.default_confidence,
                        metadata={
                            "package_name": pkg_name,
                            "fixed_version": fixed_version,
                            "manifest_type": "requirements.txt",
                        },
                    )
            return None

        elif file_path.lower().endswith("package.json"):
            # Match JSON dependency entry
            # "dependencies": { "lodash": "^4.17.15" }
            pattern = re.compile(
                rf'(\s*"{re.escape(pkg_name)}"\s*:\s*")([^"]+)(".*)',
                re.IGNORECASE,
            )
            for idx, line in enumerate(lines):
                match = pattern.match(line.rstrip("\r\n"))
                if match:
                    prefix = match.group(1)
                    suffix = match.group(3)
                    newline = "\r\n" if line.endswith("\r\n") else ("\n" if line.endswith("\n") else "")
                    # Preserve caret or tilde if present
                    old_spec = match.group(2)
                    version_prefix = "^" if old_spec.startswith("^") else ("~" if old_spec.startswith("~") else "")
                    new_line_content = f"{prefix}{version_prefix}{fixed_version}{suffix}{newline}"
                    return RemediationCandidate(
                        remediation_rule_id=self.rule_id,
                        target_rule_id=getattr(finding, "rule_id", "DEP_VULN"),
                        file_path=file_path,
                        start_line=idx + 1,
                        end_line=idx + 1,
                        original_snippet=line,
                        proposed_snippet=new_line_content,
                        rationale=(
                            f"Update {pkg_name} to safe version {version_prefix}{fixed_version} in package.json."
                        ),
                        risk_level=self.risk_level,
                        confidence=self.default_confidence,
                        metadata={
                            "package_name": pkg_name,
                            "fixed_version": fixed_version,
                            "manifest_type": "package.json",
                        },
                    )
            return None

        return None
