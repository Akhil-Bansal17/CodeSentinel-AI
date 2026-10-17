"""Remediation strategy for Python dynamic code execution (PYSEC001).

Replaces unsafe eval() with ast.literal_eval() strictly for literal data evaluation.
Rejects exec(), multi-argument eval(), and expressions with function calls.
"""

import ast
import re
from typing import Any, List, Optional, Set

from backend.app.services.remediation.rules.base import (
    BaseRemediationRule,
    RemediationCandidate,
    RemediationConfidence,
    RemediationFeasibility,
    RemediationRisk,
)


class PyEvalToLiteralEvalRule(BaseRemediationRule):
    """FIX-PYSEC001-LITERAL-EVAL: Replace eval() with ast.literal_eval()."""

    @property
    def rule_id(self) -> str:
        return "FIX-PYSEC001-LITERAL-EVAL"

    @property
    def target_finding_rules(self) -> Set[str]:
        return {"PYSEC001"}

    @property
    def name(self) -> str:
        return "Replace eval() with ast.literal_eval()"

    @property
    def description(self) -> str:
        return (
            "Replaces unsafe eval() with Python standard library ast.literal_eval(). "
            "ast.literal_eval() safely parses strings containing Python literal data structures "
            "(strings, numbers, tuples, lists, dicts, booleans, and None) without evaluating arbitrary code."
        )

    @property
    def transformation_strategy(self) -> str:
        return "AST-guided substitution of eval(x) to ast.literal_eval(x) with import ast injection if needed."

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
            "Call must be to eval(), not exec().",
            "eval() must be called with a single argument (no globals/locals parameter).",
            "Target file must be valid Python syntax.",
            "Surrounding line must contain unambiguous eval(...) call site.",
        ]

    @property
    def unsupported_cases(self) -> List[str]:
        return [
            "exec() statements or calls (cannot be replaced by literal_eval).",
            "eval() calls passing custom globals or locals namespaces (e.g. eval(code, {'x': 1})).",
            "Dynamic expressions expecting execution of functions, operators, or arbitrary statements.",
            "Obfuscated calls or aliases (e.g. e = eval; e(...)).",
        ]

    @property
    def rationale(self) -> str:
        return (
            "eval() executes arbitrary Python bytecode and exposes the host process to Remote Code Execution (RCE). "
            "ast.literal_eval() only evaluates literal structures and raises ValueError on statements, function calls, "
            "or operators, closing the vulnerability."
        )

    def _extract_line_slice(self, source_content: str, start_line: int, end_line: int) -> Optional[str]:
        lines = source_content.splitlines(keepends=True)
        if 1 <= start_line <= len(lines):
            end_idx = min(end_line, len(lines))
            return "".join(lines[start_line - 1 : end_idx])
        return None

    def assess_feasibility(self, finding: Any, source_content: str) -> RemediationFeasibility:
        # Check rule match
        rule_id = getattr(finding, "rule_id", "")
        if rule_id not in self.target_finding_rules:
            return RemediationFeasibility(
                is_supported=False,
                unsupported_reason=f"Rule {rule_id} is not supported by {self.rule_id}.",
            )

        # Inspect finding metadata or evidence for exec
        metadata = getattr(finding, "metadata_json", {}) or {}
        primitive = metadata.get("primitive", "")
        evidence = getattr(finding, "evidence_summary", "")

        if primitive == "exec" or "exec(" in evidence:
            return RemediationFeasibility(
                is_supported=False,
                unsupported_reason="exec() executes arbitrary statement blocks and cannot be safely replaced with ast.literal_eval(). Manual architectural refactoring to dispatch tables or structured handlers is required.",
                suggested_action="MANUAL_REMEDIATION_REQUIRED",
            )

        # Parse AST to inspect the target call site
        try:
            tree = ast.parse(source_content)
        except SyntaxError as exc:
            return RemediationFeasibility(
                is_supported=False,
                unsupported_reason=f"Target file has syntax errors and cannot be parsed: {exc}",
                suggested_action="MANUAL_REMEDIATION_REQUIRED",
            )

        target_line = getattr(finding, "start_line", 1)
        matching_call = None
        for node in ast.walk(tree):
            if isinstance(node, ast.Call) and getattr(node, "lineno", 0) == target_line:
                if isinstance(node.func, ast.Name) and node.func.id == "eval":
                    matching_call = node
                    break
                elif isinstance(node.func, ast.Attribute) and node.func.attr == "eval":
                    matching_call = node
                    break

        if not matching_call:
            lines = source_content.splitlines()
            if 1 <= target_line <= len(lines):
                line_text = lines[target_line - 1]
                if "exec(" in line_text or "exec " in line_text:
                    return RemediationFeasibility(
                        is_supported=False,
                        unsupported_reason="exec() calls cannot be safely converted to ast.literal_eval(). Manual remediation required.",
                        suggested_action="MANUAL_REMEDIATION_REQUIRED",
                    )
                if "eval(" in line_text:
                    pass
                else:
                    return RemediationFeasibility(
                        is_supported=False,
                        unsupported_reason=f"No eval() call found at line {target_line}.",
                        suggested_action="MANUAL_REMEDIATION_REQUIRED",
                    )
            else:
                return RemediationFeasibility(
                    is_supported=False,
                    unsupported_reason=f"Line {target_line} out of range in source content.",
                    suggested_action="MANUAL_REMEDIATION_REQUIRED",
                )
        else:
            # If matching AST call found, check arguments
            if len(matching_call.args) > 1 or matching_call.keywords:
                return RemediationFeasibility(
                    is_supported=False,
                    unsupported_reason="eval() call passes custom globals or locals namespaces, which ast.literal_eval() does not support.",
                    suggested_action="MANUAL_REMEDIATION_REQUIRED",
                )

        candidate = self.generate_candidate(finding, source_content)
        if not candidate:
            return RemediationFeasibility(
                is_supported=False,
                unsupported_reason="Unable to generate exact deterministic replacement for eval() call site.",
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

        # Inspect the target lines
        orig_slice = "".join(lines[start_line - 1 : min(end_line, len(lines))])
        if not orig_slice:
            return None

        # Check if line contains eval(
        if "eval(" not in orig_slice:
            return None

        # Check if exec is present
        if re.search(r"\bexec\(", orig_slice):
            return None

        # Replace eval( with ast.literal_eval(
        # We handle both standalone eval(...) and builtins.eval(...)
        proposed_slice = re.sub(r"\b(?:builtins\.)?eval\(", "ast.literal_eval(", orig_slice)
        if proposed_slice == orig_slice:
            return None

        # Check if 'import ast' or 'from ast import' is already in source_content
        needs_import = True
        try:
            tree = ast.parse(source_content)
            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    for alias in node.names:
                        if alias.name == "ast":
                            needs_import = False
                            break
                elif isinstance(node, ast.ImportFrom):
                    if node.module == "ast":
                        needs_import = False
                        break
        except Exception:
            if "import ast" in source_content:
                needs_import = False

        metadata = {
            "needs_ast_import": needs_import,
            "original_call": "eval",
            "replacement_call": "ast.literal_eval",
        }

        # If import ast is needed, note it in rationale
        rationale = self.rationale
        if needs_import:
            rationale += " Note: 'import ast' should be present in module imports."

        return RemediationCandidate(
            remediation_rule_id=self.rule_id,
            target_rule_id="PYSEC001",
            file_path=getattr(finding, "file_path", ""),
            start_line=start_line,
            end_line=end_line,
            start_column=getattr(finding, "start_column", None),
            end_column=getattr(finding, "end_column", None),
            original_snippet=orig_slice,
            proposed_snippet=proposed_slice,
            rationale=rationale,
            risk_level=RemediationRisk.LOW,
            confidence=RemediationConfidence.HIGH,
            metadata=metadata,
        )
