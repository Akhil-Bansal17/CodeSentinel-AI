"""Deterministic JavaScript/TypeScript Application Security Intelligence Rules for CodeSentinel AI (Phase 4).

All rules inspect AST-extracted security call sites from the TypeScript compiler API.
Zero runtime code execution or evaluation.
"""

from typing import Any, Dict, List, Optional

from backend.app.services.analysis.parsers.base import ParseResult, ParserStatus
from backend.app.services.analysis.rules.base import (
    BaseRule,
    Confidence,
    FindingDraft,
    RuleCategory,
    Severity,
)


class JsDynamicCodeRule(BaseRule):
    """JSSEC001: Dynamic Code Execution via eval() or new Function()."""

    @property
    def rule_id(self) -> str:
        return "JSSEC001"

    @property
    def name(self) -> str:
        return "Dynamic Code Execution"

    @property
    def category(self) -> RuleCategory:
        return RuleCategory.SECURITY

    @property
    def default_severity(self) -> Severity:
        return Severity.CRITICAL

    @property
    def default_confidence(self) -> Confidence:
        return Confidence.HIGH

    @property
    def language(self) -> str:
        return "JavaScript"

    @property
    def description(self) -> str:
        return (
            "Detected call to dynamic code execution primitive (eval or Function constructor). "
            "Evaluating dynamic strings as JavaScript code enables arbitrary script execution "
            "if untrusted input reaches the evaluation sink."
        )

    @property
    def why_it_matters(self) -> str:
        return (
            "eval() and new Function() execute strings in the caller's execution context. In browser "
            "environments this facilitates Cross-Site Scripting (XSS) and credential theft; in Node.js "
            "environments it enables Remote Code Execution (RCE) on the server."
        )

    @property
    def remediation(self) -> str:
        return (
            "Avoid dynamic code generation. For JSON parsing, use JSON.parse(). For dynamic math or logic, "
            "use a safe math expression parser or predefined rule engines."
        )

    @property
    def limitations(self) -> str:
        return (
            "Detects direct calls to eval() and direct calls or constructor invocations of Function(). "
            "Does not detect dynamic execution through window['ev' + 'al'] or Web Workers."
        )

    def analyze(
        self,
        parse_result: ParseResult,
        source_content: str,
        config: Optional[Dict[str, Any]] = None,
    ) -> List[FindingDraft]:
        if parse_result.status not in {ParserStatus.SUCCESS, ParserStatus.SYNTAX_ERROR}:
            return []

        findings: List[FindingDraft] = []
        for site in parse_result.security_sites:
            if site.rule_id != self.rule_id:
                continue

            sev = Severity(site.severity) if site.severity in Severity.__members__ else self.default_severity
            conf = Confidence(site.confidence) if site.confidence in Confidence.__members__ else self.default_confidence

            findings.append(
                FindingDraft(
                    rule_id=self.rule_id,
                    rule_name=self.name,
                    rule_version=self.version,
                    title=f"Dynamic code execution via {site.metadata.get('primitive', 'eval')}() on line {site.coordinates.start_line}",
                    description=site.description or self.description,
                    severity=sev,
                    confidence=conf,
                    category=self.category,
                    file_path=parse_result.relative_path,
                    coordinates=site.coordinates,
                    evidence_summary=site.evidence,
                    why_it_matters=self.why_it_matters,
                    remediation=self.remediation,
                    limitations=self.limitations,
                    metadata=site.metadata,
                )
            )

        return findings


class JsHtmlInjectionRule(BaseRule):
    """JSSEC002: Dangerous HTML Injection via innerHTML, outerHTML, or dangerouslySetInnerHTML."""

    @property
    def rule_id(self) -> str:
        return "JSSEC002"

    @property
    def name(self) -> str:
        return "Dangerous HTML Injection"

    @property
    def category(self) -> RuleCategory:
        return RuleCategory.SECURITY

    @property
    def default_severity(self) -> Severity:
        return Severity.HIGH

    @property
    def default_confidence(self) -> Confidence:
        return Confidence.MEDIUM

    @property
    def language(self) -> str:
        return "JavaScript"

    @property
    def description(self) -> str:
        return (
            "Detected use of raw browser HTML injection sink (innerHTML, outerHTML, or React dangerouslySetInnerHTML). "
            "Rendering unescaped HTML content in the DOM enables Cross-Site Scripting (XSS) if input contains user data."
        )

    @property
    def why_it_matters(self) -> str:
        return (
            "Assigning unsanitized content to raw HTML sinks bypasses React's automatic escaping and browser DOM safety, "
            "allowing attackers to execute malicious scripts in victim sessions, steal cookies, or perform actions on their behalf."
        )

    @property
    def remediation(self) -> str:
        return (
            "Use standard safe DOM rendering (e.g. element.textContent, or standard JSX text elements). If raw HTML is "
            "strictly necessary, sanitize the markup using a verified library such as DOMPurify before rendering."
        )

    @property
    def limitations(self) -> str:
        return (
            "Detects innerHTML, outerHTML property assignments, and JSX dangerouslySetInnerHTML attributes. "
            "Does not verify whether the assigned string has already been sanitized by DOMPurify."
        )

    def analyze(
        self,
        parse_result: ParseResult,
        source_content: str,
        config: Optional[Dict[str, Any]] = None,
    ) -> List[FindingDraft]:
        if parse_result.status not in {ParserStatus.SUCCESS, ParserStatus.SYNTAX_ERROR}:
            return []

        findings: List[FindingDraft] = []
        for site in parse_result.security_sites:
            if site.rule_id != self.rule_id:
                continue

            sev = Severity(site.severity) if site.severity in Severity.__members__ else self.default_severity
            conf = Confidence(site.confidence) if site.confidence in Confidence.__members__ else self.default_confidence

            findings.append(
                FindingDraft(
                    rule_id=self.rule_id,
                    rule_name=self.name,
                    rule_version=self.version,
                    title=f"Dangerous HTML sink ({site.metadata.get('sink', 'innerHTML')}) on line {site.coordinates.start_line}",
                    description=site.description or self.description,
                    severity=sev,
                    confidence=conf,
                    category=self.category,
                    file_path=parse_result.relative_path,
                    coordinates=site.coordinates,
                    evidence_summary=site.evidence,
                    why_it_matters=self.why_it_matters,
                    remediation=self.remediation,
                    limitations=self.limitations,
                    metadata=site.metadata,
                )
            )

        return findings


class JsShellExecutionRule(BaseRule):
    """JSSEC003: Shell Command Execution Risk in Node.js child_process."""

    @property
    def rule_id(self) -> str:
        return "JSSEC003"

    @property
    def name(self) -> str:
        return "Shell Command Execution Risk"

    @property
    def category(self) -> RuleCategory:
        return RuleCategory.SECURITY

    @property
    def default_severity(self) -> Severity:
        return Severity.HIGH

    @property
    def default_confidence(self) -> Confidence:
        return Confidence.HIGH

    @property
    def language(self) -> str:
        return "JavaScript"

    @property
    def description(self) -> str:
        return (
            "Detected execution of shell command through Node.js child_process API (exec, execSync, or spawn with shell: true). "
            "Executing commands through the shell enables command injection if arguments contain shell metacharacters."
        )

    @property
    def why_it_matters(self) -> str:
        return (
            "child_process.exec() and spawn() with shell: true invoke the system shell (/bin/sh or cmd.exe) to parse arguments. "
            "If dynamic arguments contain characters such as ';', '&&', '|', or backticks, an attacker can execute arbitrary "
            "commands on the host operating system."
        )

    @property
    def remediation(self) -> str:
        return (
            "Use child_process.execFile() or child_process.spawn() without shell: true, passing arguments as an array of strings. "
            "Never concatenate untrusted input into command strings."
        )

    @property
    def limitations(self) -> str:
        return (
            "Detects exec(), execSync(), and spawn(..., { shell: true }). Does not flag standard safe spawn() calls with argument "
            "arrays to prevent false positives."
        )

    def analyze(
        self,
        parse_result: ParseResult,
        source_content: str,
        config: Optional[Dict[str, Any]] = None,
    ) -> List[FindingDraft]:
        if parse_result.status not in {ParserStatus.SUCCESS, ParserStatus.SYNTAX_ERROR}:
            return []

        findings: List[FindingDraft] = []
        for site in parse_result.security_sites:
            if site.rule_id != self.rule_id:
                continue

            sev = Severity(site.severity) if site.severity in Severity.__members__ else self.default_severity
            conf = Confidence(site.confidence) if site.confidence in Confidence.__members__ else self.default_confidence

            findings.append(
                FindingDraft(
                    rule_id=self.rule_id,
                    rule_name=self.name,
                    rule_version=self.version,
                    title=f"Shell command execution ({site.metadata.get('api', 'exec')}) on line {site.coordinates.start_line}",
                    description=site.description or self.description,
                    severity=sev,
                    confidence=conf,
                    category=self.category,
                    file_path=parse_result.relative_path,
                    coordinates=site.coordinates,
                    evidence_summary=site.evidence,
                    why_it_matters=self.why_it_matters,
                    remediation=self.remediation,
                    limitations=self.limitations,
                    metadata=site.metadata,
                )
            )

        return findings


class JsSqlQueryRule(BaseRule):
    """JSSEC004: SQL Query Construction Risk via String Concatenation or Template Literals."""

    @property
    def rule_id(self) -> str:
        return "JSSEC004"

    @property
    def name(self) -> str:
        return "SQL Query Construction Risk"

    @property
    def category(self) -> RuleCategory:
        return RuleCategory.SECURITY

    @property
    def default_severity(self) -> Severity:
        return Severity.HIGH

    @property
    def default_confidence(self) -> Confidence:
        return Confidence.HIGH

    @property
    def language(self) -> str:
        return "JavaScript"

    @property
    def description(self) -> str:
        return (
            "Detected SQL query constructed via string concatenation (+) or template literal interpolation (`${...}`) "
            "passed directly to database execution methods (query, execute, raw). This pattern is vulnerable to SQL injection."
        )

    @property
    def why_it_matters(self) -> str:
        return (
            "Direct string interpolation of variables into SQL queries enables attackers to break out of data literals "
            "and manipulate query logic, potentially reading unauthorized data, bypassing authentication, or dropping tables."
        )

    @property
    def remediation(self) -> str:
        return (
            "Use parameterized queries with bind variables (e.g. db.query('SELECT * FROM users WHERE id = $1', [userId]) "
            "or 'WHERE id = ?' in MySQL/SQLite), or use an ORM query builder (Prisma, TypeORM, Drizzle, Knex)."
        )

    @property
    def limitations(self) -> str:
        return (
            "Detects template literals with expressions or + concatenation passed to query/execute/raw methods containing SQL keywords. "
            "Does not track multi-step queries constructed in separate helper functions."
        )

    def analyze(
        self,
        parse_result: ParseResult,
        source_content: str,
        config: Optional[Dict[str, Any]] = None,
    ) -> List[FindingDraft]:
        if parse_result.status not in {ParserStatus.SUCCESS, ParserStatus.SYNTAX_ERROR}:
            return []

        findings: List[FindingDraft] = []
        for site in parse_result.security_sites:
            if site.rule_id != self.rule_id:
                continue

            sev = Severity(site.severity) if site.severity in Severity.__members__ else self.default_severity
            conf = Confidence(site.confidence) if site.confidence in Confidence.__members__ else self.default_confidence

            findings.append(
                FindingDraft(
                    rule_id=self.rule_id,
                    rule_name=self.name,
                    rule_version=self.version,
                    title=f"SQL query construction risk on line {site.coordinates.start_line}",
                    description=site.description or self.description,
                    severity=sev,
                    confidence=conf,
                    category=self.category,
                    file_path=parse_result.relative_path,
                    coordinates=site.coordinates,
                    evidence_summary=site.evidence,
                    why_it_matters=self.why_it_matters,
                    remediation=self.remediation,
                    limitations=self.limitations,
                    metadata=site.metadata,
                )
            )

        return findings
