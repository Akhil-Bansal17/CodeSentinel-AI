"""Deterministic JavaScript / TypeScript static analysis rules."""

from typing import Any, Dict, List, Optional

from backend.app.core.config import settings
from backend.app.services.analysis.parsers.base import ParseResult, ParserStatus, SourceCoordinates
from backend.app.services.analysis.rules.base import (
    BaseRule,
    FindingDraft,
    RuleCategory,
    Severity,
)


class JsSyntaxRule(BaseRule):
    """Rule JS-SYNTAX-001: Detects JavaScript/TypeScript syntax errors preventing parsing."""

    @property
    def rule_id(self) -> str:
        return "JS-SYNTAX-001"

    @property
    def name(self) -> str:
        return "JavaScript/TypeScript Syntax Error"

    @property
    def category(self) -> RuleCategory:
        return RuleCategory.SYNTAX

    @property
    def default_severity(self) -> Severity:
        return Severity.CRITICAL

    @property
    def description(self) -> str:
        return (
            "Detected a syntax error that prevents JavaScript / TypeScript parsing. "
            "Invalid syntax prevents transpilation, bundling, and static inspection."
        )

    @property
    def language(self) -> str:
        return "JavaScript"

    def analyze(
        self,
        parse_result: ParseResult,
        source_content: str,
        config: Optional[Dict[str, Any]] = None,
    ) -> List[FindingDraft]:
        findings = []
        if parse_result.status == ParserStatus.SYNTAX_ERROR:
            for diag in parse_result.diagnostics:
                coords = diag.coordinates or SourceCoordinates(start_line=1)
                findings.append(
                    FindingDraft(
                        rule_id=self.rule_id,
                        rule_name=self.name,
                        rule_version=self.version,
                        title=f"JavaScript/TypeScript syntax error on line {coords.start_line}",
                        description=diag.message,
                        severity=self.default_severity,
                        category=self.category,
                        file_path=parse_result.relative_path,
                        coordinates=coords,
                        evidence_summary=f"Parser reported syntax diagnostic: {diag.message}",
                        metadata={"error_message": diag.message, "code": diag.code},
                    )
                )
        return findings


class JsFunctionLengthRule(BaseRule):
    """Rule JS-FUNCTION-001: Detects excessively long JavaScript/TypeScript functions."""

    @property
    def rule_id(self) -> str:
        return "JS-FUNCTION-001"

    @property
    def name(self) -> str:
        return "Excessively Long Function"

    @property
    def category(self) -> RuleCategory:
        return RuleCategory.MAINTAINABILITY

    @property
    def default_severity(self) -> Severity:
        return Severity.LOW

    @property
    def description(self) -> str:
        return (
            "Function, method, or arrow function body exceeds the recommended source line count threshold. "
            "Excessively long functions are difficult to comprehend and maintain."
        )

    @property
    def language(self) -> str:
        return "JavaScript"

    def analyze(
        self,
        parse_result: ParseResult,
        source_content: str,
        config: Optional[Dict[str, Any]] = None,
    ) -> List[FindingDraft]:
        threshold = (
            config.get("function_length_threshold", settings.RULE_FUNCTION_LENGTH_DEFAULT_THRESHOLD)
            if config
            else settings.RULE_FUNCTION_LENGTH_DEFAULT_THRESHOLD
        )

        findings = []
        for func in parse_result.functions:
            # Deterministic boundary: triggers when line_count > threshold
            if func.line_count > threshold:
                findings.append(
                    FindingDraft(
                        rule_id=self.rule_id,
                        rule_name=self.name,
                        rule_version=self.version,
                        title=f"Function '{func.name}' exceeds maximum length ({func.line_count} lines > {threshold})",
                        description=(
                            f"Function '{func.name}' spans {func.line_count} lines of code, "
                            f"exceeding the configured threshold of {threshold} lines."
                        ),
                        severity=self.default_severity,
                        category=self.category,
                        file_path=parse_result.relative_path,
                        coordinates=func.coordinates,
                        evidence_summary=(
                            f"Function '{func.name}' length={func.line_count} lines (threshold={threshold})"
                        ),
                        metadata={
                            "line_count": func.line_count,
                            "threshold": threshold,
                            "function_name": func.name,
                        },
                    )
                )
        return findings


class JsComplexityRule(BaseRule):
    """Rule JS-COMPLEXITY-001: Detects high cyclomatic complexity in JavaScript/TypeScript functions."""

    @property
    def rule_id(self) -> str:
        return "JS-COMPLEXITY-001"

    @property
    def name(self) -> str:
        return "High Cyclomatic Complexity"

    @property
    def category(self) -> RuleCategory:
        return RuleCategory.COMPLEXITY

    @property
    def default_severity(self) -> Severity:
        return Severity.MEDIUM

    @property
    def description(self) -> str:
        return (
            "Function or method exceeds the cyclomatic complexity threshold. "
            "High complexity indicates multiple branching control paths that increase risk of defects."
        )

    @property
    def language(self) -> str:
        return "JavaScript"

    def analyze(
        self,
        parse_result: ParseResult,
        source_content: str,
        config: Optional[Dict[str, Any]] = None,
    ) -> List[FindingDraft]:
        threshold = (
            config.get("complexity_threshold", settings.RULE_COMPLEXITY_DEFAULT_THRESHOLD)
            if config
            else settings.RULE_COMPLEXITY_DEFAULT_THRESHOLD
        )

        findings = []
        for func in parse_result.functions:
            # Deterministic boundary: triggers when complexity > threshold
            if func.cyclomatic_complexity > threshold:
                findings.append(
                    FindingDraft(
                        rule_id=self.rule_id,
                        rule_name=self.name,
                        rule_version=self.version,
                        title=f"High cyclomatic complexity in '{func.name}' ({func.cyclomatic_complexity} > {threshold})",
                        description=(
                            f"Function '{func.name}' has a McCabe cyclomatic complexity of "
                            f"{func.cyclomatic_complexity}, which exceeds the recommended threshold of {threshold}."
                        ),
                        severity=self.default_severity,
                        category=self.category,
                        file_path=parse_result.relative_path,
                        coordinates=func.coordinates,
                        evidence_summary=(
                            f"Function '{func.name}' complexity={func.cyclomatic_complexity} (threshold={threshold})"
                        ),
                        metadata={
                            "complexity": func.cyclomatic_complexity,
                            "threshold": threshold,
                            "function_name": func.name,
                        },
                    )
                )
        return findings
