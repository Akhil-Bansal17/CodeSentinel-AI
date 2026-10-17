"""Remediation strategy for Python shell execution risk (PYSEC003).

Provides argument-list subprocess transformation for simple literal commands with shell=False,
and returns explicit MANUAL_REMEDIATION_REQUIRED for complex shell features (pipes, redirects, substitutions).
"""

import ast
import re
import shlex
from typing import Any, List, Optional, Set

from backend.app.services.remediation.rules.base import (
    BaseRemediationRule,
    RemediationCandidate,
    RemediationConfidence,
    RemediationFeasibility,
    RemediationRisk,
)


class PyShellToSubprocessRule(BaseRemediationRule):
    """FIX-PYSEC003-ARG-LIST: Convert simple shell command to argument-list subprocess call."""

    @property
    def rule_id(self) -> str:
        return "FIX-PYSEC003-ARG-LIST"

    @property
    def target_finding_rules(self) -> Set[str]:
        return {"PYSEC003"}

    @property
    def name(self) -> str:
        return "Convert to Argument-List Subprocess Call (shell=False)"

    @property
    def description(self) -> str:
        return (
            "Converts simple shell=True subprocess calls or os.system() to list-based argument arrays "
            "with shell=False. Bypassing the system shell prevents shell injection vulnerabilities."
        )

    @property
    def transformation_strategy(self) -> str:
        return "Parse command string into list array and set shell=False."

    @property
    def risk_level(self) -> RemediationRisk:
        return RemediationRisk.MEDIUM

    @property
    def default_confidence(self) -> RemediationConfidence:
        return RemediationConfidence.MEDIUM

    @property
    def applicable_languages(self) -> Set[str]:
        return {"Python"}

    @property
    def preconditions(self) -> List[str]:
        return [
            "Command must be a simple, static string without shell pipelines, redirects, or environment expansions.",
            "Subprocess call must use subprocess.run, subprocess.call, or os.system.",
        ]

    @property
    def unsupported_cases(self) -> List[str]:
        return [
            "Pipes (|), redirects (>, <, >>), or multiple chained commands (;, &&, ||).",
            "Shell builtins (cd, export, source, echo, set).",
            "Variable expansions ($VAR, %VAR%) or command substitutions ($(cmd), `cmd`).",
            "Dynamic runtime formatted strings where commands cannot be statically parsed.",
        ]

    @property
    def rationale(self) -> str:
        return (
            "Passing an argument list directly to the OS kernel without an intermediate shell prevents metacharacter "
            "interpretation and command injection attacks."
        )

    def assess_feasibility(self, finding: Any, source_content: str) -> RemediationFeasibility:
        rule_id = getattr(finding, "rule_id", "")
        if rule_id not in self.target_finding_rules:
            return RemediationFeasibility(
                is_supported=False,
                unsupported_reason=f"Rule {rule_id} is not supported by {self.rule_id}.",
            )

        start_line = getattr(finding, "start_line", 1)
        lines = source_content.splitlines()
        if not (1 <= start_line <= len(lines)):
            return RemediationFeasibility(
                is_supported=False,
                unsupported_reason=f"Line {start_line} out of range.",
            )

        target_line_text = lines[start_line - 1]

        # Check for complex shell metacharacters
        shell_metachars = ["|", ">", "<", "&&", ";", "||", "$(", "`"]
        if any(char in target_line_text for char in shell_metachars):
            return RemediationFeasibility(
                is_supported=False,
                unsupported_reason=(
                    "Command contains shell metacharacters (pipelines, redirects, or compound operators). "
                    "Automatic translation to argument lists is unsafe. Manual refactoring using Python standard library "
                    "modules (e.g. shutil, os, pathlib) or an explicit pipeline architecture is required."
                ),
                suggested_action="MANUAL_REMEDIATION_REQUIRED",
            )

        candidate = self.generate_candidate(finding, source_content)
        if not candidate:
            return RemediationFeasibility(
                is_supported=False,
                unsupported_reason=(
                    "Command string is dynamic or complex. Manual verification of argument boundaries and shell=False "
                    "invocation is required."
                ),
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

        # Check if shell=True is in line
        if "shell=True" in orig_slice:
            # Match subprocess call with literal string: subprocess.run("cmd arg", shell=True)
            match = re.search(r'subprocess\.(run|call|Popen)\(\s*(["\'])(.*?)\2\s*,\s*shell\s*=\s*True', orig_slice)
            if match:
                method = match.group(1)
                cmd_str = match.group(3)
                try:
                    args = shlex.split(cmd_str)
                    args_repr = repr(args)
                    proposed_slice = orig_slice.replace(
                        match.group(0),
                        f"subprocess.{method}({args_repr}, shell=False",
                    )
                    return RemediationCandidate(
                        remediation_rule_id=self.rule_id,
                        target_rule_id="PYSEC003",
                        file_path=getattr(finding, "file_path", ""),
                        start_line=start_line,
                        end_line=end_line,
                        start_column=getattr(finding, "start_column", None),
                        end_column=getattr(finding, "end_column", None),
                        original_snippet=orig_slice,
                        proposed_snippet=proposed_slice,
                        rationale=self.rationale,
                        risk_level=RemediationRisk.MEDIUM,
                        confidence=RemediationConfidence.MEDIUM,
                        metadata={"parsed_args": args},
                    )
                except Exception:
                    return None

        # Check for os.system("cmd arg")
        match_os = re.search(r'os\.system\(\s*(["\'])(.*?)\1\s*\)', orig_slice)
        if match_os:
            cmd_str = match_os.group(2)
            try:
                args = shlex.split(cmd_str)
                args_repr = repr(args)
                proposed_slice = orig_slice.replace(
                    match_os.group(0),
                    f"subprocess.run({args_repr}, check=True)",
                )
                return RemediationCandidate(
                    remediation_rule_id=self.rule_id,
                    target_rule_id="PYSEC003",
                    file_path=getattr(finding, "file_path", ""),
                    start_line=start_line,
                    end_line=end_line,
                    start_column=getattr(finding, "start_column", None),
                    end_column=getattr(finding, "end_column", None),
                    original_snippet=orig_slice,
                    proposed_snippet=proposed_slice,
                    rationale=self.rationale,
                    risk_level=RemediationRisk.MEDIUM,
                    confidence=RemediationConfidence.MEDIUM,
                    metadata={"parsed_args": args, "replaced": "os.system"},
                )
            except Exception:
                return None

        return None
