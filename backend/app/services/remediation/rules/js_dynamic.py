"""Remediation strategies for JavaScript dynamic execution (JSSEC001) and raw HTML sinks (JSSEC002).

Applies narrow, demonstrably safe replacements (e.g. eval() -> JSON.parse() for data parsing,
or innerHTML -> textContent for pure text strings), and returns explicit MANUAL_REMEDIATION_REQUIRED
for complex dynamic code or intended HTML markup.
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


class JsDynamicToSafeParseRule(BaseRemediationRule):
    """FIX-JSSEC001-JSON-PARSE: Replace eval() with JSON.parse() for literal JSON data."""

    @property
    def rule_id(self) -> str:
        return "FIX-JSSEC001-JSON-PARSE"

    @property
    def target_finding_rules(self) -> Set[str]:
        return {"JSSEC001"}

    @property
    def name(self) -> str:
        return "Replace eval() with JSON.parse()"

    @property
    def description(self) -> str:
        return (
            "Replaces eval(payload) with JSON.parse(payload) when evaluating serialized data. "
            "JSON.parse() guarantees zero arbitrary JavaScript execution, preventing XSS and RCE."
        )

    @property
    def transformation_strategy(self) -> str:
        return "Substitute eval(...) with JSON.parse(...)."

    @property
    def risk_level(self) -> RemediationRisk:
        return RemediationRisk.MEDIUM

    @property
    def default_confidence(self) -> RemediationConfidence:
        return RemediationConfidence.MEDIUM

    @property
    def applicable_languages(self) -> Set[str]:
        return {"JavaScript", "TypeScript"}

    @property
    def preconditions(self) -> List[str]:
        return [
            "eval() call site must evaluate structured data or JSON payload.",
            "Must not evaluate executable functions or arbitrary statement blocks.",
        ]

    @property
    def unsupported_cases(self) -> List[str]:
        return [
            "new Function() constructor calls.",
            "Dynamic code execution expecting full JavaScript grammar, variables, or functions.",
        ]

    @property
    def rationale(self) -> str:
        return (
            "Evaluating untrusted strings in JavaScript allows attacker-controlled scripts to access DOM, cookies, "
            "and session state. JSON.parse() enforces strict data format parsing."
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
            return RemediationFeasibility(is_supported=False, unsupported_reason="Line out of range.")

        line_text = lines[start_line - 1]

        # If Function constructor is used, automated rewrite is not provably safe
        if "new Function" in line_text or "Function(" in line_text:
            return RemediationFeasibility(
                is_supported=False,
                unsupported_reason="Function() constructor invocations execute dynamic logic and cannot be converted to JSON.parse(). Manual refactoring to dispatch handlers is required.",
                suggested_action="MANUAL_REMEDIATION_REQUIRED",
            )

        candidate = self.generate_candidate(finding, source_content)
        if not candidate:
            return RemediationFeasibility(
                is_supported=False,
                unsupported_reason="Target line does not contain an unambiguous single-argument eval() invocation.",
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
        if not orig_slice or "eval(" not in orig_slice:
            return None

        # Replace eval( with JSON.parse(
        proposed_slice = re.sub(r"\beval\(", "JSON.parse(", orig_slice)
        if proposed_slice == orig_slice:
            return None

        return RemediationCandidate(
            remediation_rule_id=self.rule_id,
            target_rule_id="JSSEC001",
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
            metadata={"transformation": "eval_to_json_parse"},
        )


class JsRawHtmlToTextContentRule(BaseRemediationRule):
    """FIX-JSSEC002-TEXT-CONTENT: Replace innerHTML with textContent for text content."""

    @property
    def rule_id(self) -> str:
        return "FIX-JSSEC002-TEXT-CONTENT"

    @property
    def target_finding_rules(self) -> Set[str]:
        return {"JSSEC002"}

    @property
    def name(self) -> str:
        return "Replace innerHTML with textContent"

    @property
    def description(self) -> str:
        return (
            "Replaces element.innerHTML with element.textContent when rendering dynamic text strings. "
            "textContent treats strings strictly as text and does not parse HTML elements or execute scripts."
        )

    @property
    def transformation_strategy(self) -> str:
        return "Substitute .innerHTML with .textContent."

    @property
    def risk_level(self) -> RemediationRisk:
        return RemediationRisk.LOW

    @property
    def default_confidence(self) -> RemediationConfidence:
        return RemediationConfidence.HIGH

    @property
    def applicable_languages(self) -> Set[str]:
        return {"JavaScript", "TypeScript"}

    @property
    def preconditions(self) -> List[str]:
        return [
            "Assignment must be to .innerHTML property.",
            "Content being rendered is intended as text, not HTML markup.",
        ]

    @property
    def unsupported_cases(self) -> List[str]:
        return [
            "Cases where rich HTML markup (tags, links, spans) is intentionally constructed (requires DOMPurify).",
            "Third-party HTML sanitizers or templating libraries.",
        ]

    @property
    def rationale(self) -> str:
        return (
            "Assigning unescaped text to innerHTML triggers HTML parsing and XSS if user input contains '<' or '>'. "
            "textContent automatically encodes characters and prevents DOM XSS."
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
                unsupported_reason="Target line does not contain an unambiguous .innerHTML assignment.",
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
        if not orig_slice or ".innerHTML" not in orig_slice:
            return None

        # Replace .innerHTML = with .textContent =
        proposed_slice = re.sub(r"\.innerHTML\s*=", ".textContent =", orig_slice)
        if proposed_slice == orig_slice:
            return None

        return RemediationCandidate(
            remediation_rule_id=self.rule_id,
            target_rule_id="JSSEC002",
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
            metadata={"transformation": "innerhtml_to_textcontent"},
        )
