"""Deterministic Python static analysis rules."""

from typing import Any, Dict, List, Optional, Set, Tuple

from backend.app.core.config import settings
from backend.app.services.analysis.parsers.base import ParseResult, ParserStatus, SourceCoordinates
from backend.app.services.analysis.rules.base import (
    BaseRule,
    FindingDraft,
    RuleCategory,
    Severity,
)


class PySyntaxRule(BaseRule):
    """Rule PY-SYNTAX-001: Detects Python syntax errors preventing parsing."""

    @property
    def rule_id(self) -> str:
        return "PY-SYNTAX-001"

    @property
    def name(self) -> str:
        return "Python Syntax Error"

    @property
    def category(self) -> RuleCategory:
        return RuleCategory.SYNTAX

    @property
    def default_severity(self) -> Severity:
        return Severity.CRITICAL

    @property
    def description(self) -> str:
        return (
            "Detected a syntax error that prevents the Python interpreter and static "
            "analyzers from parsing the module."
        )

    @property
    def language(self) -> str:
        return "Python"

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
                        title=f"Python syntax error on line {coords.start_line}",
                        description=diag.message,
                        severity=self.default_severity,
                        category=self.category,
                        file_path=parse_result.relative_path,
                        coordinates=coords,
                        evidence_summary=f"Parser reported syntax error: {diag.message}",
                        metadata={"error_message": diag.message},
                    )
                )
        return findings


class PyComplexityRule(BaseRule):
    """Rule PY-COMPLEXITY-001: Detects high cyclomatic complexity in Python functions."""

    @property
    def rule_id(self) -> str:
        return "PY-COMPLEXITY-001"

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
            "High complexity indicates multiple branching control paths that are "
            "difficult to test and reason about."
        )

    @property
    def language(self) -> str:
        return "Python"

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


class PyFunctionLengthRule(BaseRule):
    """Rule PY-FUNCTION-001: Detects excessively long Python functions."""

    @property
    def rule_id(self) -> str:
        return "PY-FUNCTION-001"

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
            "Function or method body exceeds the recommended source line count threshold. "
            "Long functions often violate the Single Responsibility Principle."
        )

    @property
    def language(self) -> str:
        return "Python"

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


class PyImportRule(BaseRule):
    """Rule PY-IMPORT-001: Detects duplicate import statements within a module."""

    @property
    def rule_id(self) -> str:
        return "PY-IMPORT-001"

    @property
    def name(self) -> str:
        return "Repeated Import Statement"

    @property
    def category(self) -> RuleCategory:
        return RuleCategory.CODE_SMELL

    @property
    def default_severity(self) -> Severity:
        return Severity.LOW

    @property
    def description(self) -> str:
        return (
            "An identical module or imported identifier is imported multiple times. "
            "Duplicate imports create redundant statements and code clutter."
        )

    @property
    def language(self) -> str:
        return "Python"

    def analyze(
        self,
        parse_result: ParseResult,
        source_content: str,
        config: Optional[Dict[str, Any]] = None,
    ) -> List[FindingDraft]:
        seen_imports: Dict[Tuple[str, str, Optional[str]], int] = {}
        findings = []

        for imp in parse_result.imports:
            key = (imp.module or "", imp.name, imp.alias)
            if key in seen_imports:
                first_line = seen_imports[key]
                import_display = f"from {imp.module} import {imp.name}" if imp.is_from else f"import {imp.name}"
                findings.append(
                    FindingDraft(
                        rule_id=self.rule_id,
                        rule_name=self.name,
                        rule_version=self.version,
                        title=f"Duplicate import of '{imp.name}' on line {imp.coordinates.start_line}",
                        description=(
                            f"The statement '{import_display}' duplicates an identical import "
                            f"previously declared on line {first_line}."
                        ),
                        severity=self.default_severity,
                        category=self.category,
                        file_path=parse_result.relative_path,
                        coordinates=imp.coordinates,
                        evidence_summary=(
                            f"Duplicate import of '{imp.name}' (first imported on line {first_line})"
                        ),
                        metadata={
                            "import_name": imp.name,
                            "module": imp.module,
                            "first_line": first_line,
                        },
                    )
                )
            else:
                seen_imports[key] = imp.coordinates.start_line

        return findings
