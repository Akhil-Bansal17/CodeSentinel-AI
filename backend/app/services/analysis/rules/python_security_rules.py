"""Deterministic Python Application Security Intelligence Rules for CodeSentinel AI (Phase 4).

All rules operate strictly on static AST representations.
Zero runtime code execution or evaluation.
"""

import ast
from typing import Any, Dict, List, Optional, Set

from backend.app.services.analysis.parsers.base import ParseResult, ParserStatus, SourceCoordinates
from backend.app.services.analysis.rules.base import (
    BaseRule,
    Confidence,
    FindingDraft,
    RuleCategory,
    Severity,
)


def _get_call_coordinates(node: ast.Call) -> SourceCoordinates:
    """Extract 1-indexed coordinates from an AST Call node."""
    start_line = node.lineno
    start_col = (node.col_offset or 0) + 1
    end_line = getattr(node, "end_lineno", start_line) or start_line
    end_col = getattr(node, "end_col_offset", None)
    if end_col is not None:
        end_col = end_col + 1
    return SourceCoordinates(
        start_line=start_line,
        start_column=start_col,
        end_line=end_line,
        end_column=end_col,
    )


def _get_source_line(source_content: str, line_no: int) -> str:
    """Extract a single trimmed line from source code for evidence summary."""
    lines = source_content.split("\n")
    if 1 <= line_no <= len(lines):
        line_text = lines[line_no - 1].strip()
        if len(line_text) > 160:
            return line_text[:157] + "..."
        return line_text
    return ""


class PyDynamicCodeRule(BaseRule):
    """PYSEC001: Dynamic Code Execution via eval() or exec()."""

    @property
    def rule_id(self) -> str:
        return "PYSEC001"

    @property
    def name(self) -> str:
        return "Dynamic Code Execution"

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
        return "Python"

    @property
    def description(self) -> str:
        return (
            "Detected call to dynamic code execution primitive (eval or exec). "
            "Executing strings as code allows arbitrary Python statement or expression "
            "evaluation if untrusted input reaches the call."
        )

    @property
    def why_it_matters(self) -> str:
        return (
            "Dynamic code execution primitives bypass language safety boundaries. If an attacker "
            "can influence the string passed to eval() or exec(), it can result in full Remote Code "
            "Execution (RCE) with the privileges of the running application."
        )

    @property
    def remediation(self) -> str:
        return (
            "For parsing data literals, use ast.literal_eval() instead of eval(). For dynamic behavior, "
            "refactor to use dictionaries, function dispatch tables, or dedicated parser libraries."
        )

    @property
    def limitations(self) -> str:
        return (
            "Detects direct calls to eval() and exec() or builtins.eval/exec. Does not detect indirect "
            "calls via aliases (e.g. e = eval; e(...)), reflection (getattr(builtins, 'eval')), or "
            "obfuscated identifiers."
        )

    def analyze(
        self,
        parse_result: ParseResult,
        source_content: str,
        config: Optional[Dict[str, Any]] = None,
    ) -> List[FindingDraft]:
        if not parse_result.ast_root or parse_result.status != ParserStatus.SUCCESS:
            return []

        findings: List[FindingDraft] = []
        for node in ast.walk(parse_result.ast_root):
            if not isinstance(node, ast.Call):
                continue

            target_func = None
            if isinstance(node.func, ast.Name) and node.func.id in {"eval", "exec"}:
                target_func = node.func.id
            elif isinstance(node.func, ast.Attribute) and node.func.attr in {"eval", "exec"}:
                if isinstance(node.func.value, ast.Name) and node.func.value.id in {"builtins", "__builtins__"}:
                    target_func = f"{node.func.value.id}.{node.func.attr}"

            if not target_func:
                continue

            coords = _get_call_coordinates(node)
            evidence = _get_source_line(source_content, coords.start_line) or f"{target_func}(...)"

            # Check if argument is a constant string literal
            has_literal_arg = False
            if node.args and isinstance(node.args[0], ast.Constant) and isinstance(node.args[0].value, str):
                has_literal_arg = True

            confidence = Confidence.MEDIUM if has_literal_arg else Confidence.HIGH
            severity = Severity.MEDIUM if has_literal_arg else Severity.HIGH

            findings.append(
                FindingDraft(
                    rule_id=self.rule_id,
                    rule_name=self.name,
                    rule_version=self.version,
                    title=f"Dynamic code execution via {target_func}() on line {coords.start_line}",
                    description=self.description,
                    severity=severity,
                    confidence=confidence,
                    category=self.category,
                    file_path=parse_result.relative_path,
                    coordinates=coords,
                    evidence_summary=evidence,
                    why_it_matters=self.why_it_matters,
                    remediation=self.remediation,
                    limitations=self.limitations,
                    metadata={
                        "primitive": target_func,
                        "is_literal_argument": has_literal_arg,
                        "line_number": coords.start_line,
                    },
                )
            )

        return findings


class PyUnsafeDeserializationRule(BaseRule):
    """PYSEC002: Unsafe Object Deserialization via pickle or shelve."""

    @property
    def rule_id(self) -> str:
        return "PYSEC002"

    @property
    def name(self) -> str:
        return "Unsafe Deserialization"

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
        return "Python"

    @property
    def description(self) -> str:
        return (
            "Detected call to pickle or shelve deserialization API. Python's pickle format is "
            "inherently unsafe for untrusted data because serialized bytecode can invoke arbitrary "
            "callables upon object reconstruction."
        )

    @property
    def why_it_matters(self) -> str:
        return (
            "An attacker who controls a pickle byte stream can execute arbitrary code by supplying "
            "a payload implementing __reduce__ or __reduce_ex__, resulting in immediate system compromise."
        )

    @property
    def remediation(self) -> str:
        return (
            "Replace pickle with safe serialization formats such as JSON, Protocol Buffers, or CBOR. "
            "If pickle must be used in a trusted environment, cryptographically sign and verify the payload "
            "using HMAC before unpickling."
        )

    @property
    def limitations(self) -> str:
        return (
            "Detects pickle.load, pickle.loads, _pickle.load, _pickle.loads, and shelve.open. Does not detect "
            "third-party picklers (e.g. cloudpickle, dill) unless imported through supported names, nor "
            "aliased unpickle helper functions."
        )

    def analyze(
        self,
        parse_result: ParseResult,
        source_content: str,
        config: Optional[Dict[str, Any]] = None,
    ) -> List[FindingDraft]:
        if not parse_result.ast_root or parse_result.status != ParserStatus.SUCCESS:
            return []

        # Track pickle-related imports in this module
        pickle_aliases: Set[str] = {"pickle", "_pickle"}
        pickle_func_names: Set[str] = set()

        for imp in parse_result.imports:
            if imp.name in {"pickle", "_pickle"}:
                pickle_aliases.add(imp.alias or imp.name)
            elif imp.module in {"pickle", "_pickle"} and imp.name in {"load", "loads", "Unpickler"}:
                pickle_func_names.add(imp.alias or imp.name)

        findings: List[FindingDraft] = []
        for node in ast.walk(parse_result.ast_root):
            if not isinstance(node, ast.Call):
                continue

            matched_api = None
            if isinstance(node.func, ast.Attribute) and node.func.attr in {"load", "loads", "Unpickler"}:
                if isinstance(node.func.value, ast.Name) and node.func.value.id in pickle_aliases:
                    matched_api = f"{node.func.value.id}.{node.func.attr}"
            elif isinstance(node.func, ast.Attribute) and node.func.attr == "open":
                if isinstance(node.func.value, ast.Name) and node.func.value.id == "shelve":
                    matched_api = f"shelve.{node.func.attr}"
            elif isinstance(node.func, ast.Name) and node.func.id in pickle_func_names:
                matched_api = f"pickle.{node.func.id}"

            if not matched_api:
                continue

            coords = _get_call_coordinates(node)
            evidence = _get_source_line(source_content, coords.start_line) or f"{matched_api}(...)"

            # Check if deserializing a constant literal vs variable
            has_literal_arg = False
            if node.args and isinstance(node.args[0], ast.Constant) and isinstance(node.args[0].value, (bytes, str)):
                has_literal_arg = True

            confidence = Confidence.MEDIUM if has_literal_arg else Confidence.HIGH
            severity = Severity.HIGH if has_literal_arg else Severity.CRITICAL

            findings.append(
                FindingDraft(
                    rule_id=self.rule_id,
                    rule_name=self.name,
                    rule_version=self.version,
                    title=f"Unsafe deserialization call to {matched_api}() on line {coords.start_line}",
                    description=self.description,
                    severity=severity,
                    confidence=confidence,
                    category=self.category,
                    file_path=parse_result.relative_path,
                    coordinates=coords,
                    evidence_summary=evidence,
                    why_it_matters=self.why_it_matters,
                    remediation=self.remediation,
                    limitations=self.limitations,
                    metadata={
                        "api": matched_api,
                        "is_literal_argument": has_literal_arg,
                        "line_number": coords.start_line,
                    },
                )
            )

        return findings


class PyShellExecutionRule(BaseRule):
    """PYSEC003: Shell Command Execution Risk."""

    @property
    def rule_id(self) -> str:
        return "PYSEC003"

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
        return "Python"

    @property
    def description(self) -> str:
        return (
            "Detected call to process-execution API with shell invocation enabled (shell=True or os.system/popen). "
            "Executing commands through the shell enables command injection if arguments contain shell metacharacters."
        )

    @property
    def why_it_matters(self) -> str:
        return (
            "When shell=True or os.system() is used, the command string is evaluated by the system shell (/bin/sh or cmd.exe). "
            "Unsanitized input containing characters like ';', '&&', '|', '`', or '$()' can execute arbitrary commands."
        )

    @property
    def remediation(self) -> str:
        return (
            "Pass command arguments as a list of strings (e.g. subprocess.run(['cmd', 'arg1', 'arg2'])) with shell=False. "
            "Avoid os.system() and os.popen(). If shell features are mandatory, strictly validate inputs against an allowlist."
        )

    @property
    def limitations(self) -> str:
        return (
            "Detects subprocess calls with shell=True, os.system(), and os.popen(). Does not flag safe list-argument "
            "subprocess calls with shell=False to minimize noise. Cannot verify whether dynamic strings are sanitized upstream."
        )

    def analyze(
        self,
        parse_result: ParseResult,
        source_content: str,
        config: Optional[Dict[str, Any]] = None,
    ) -> List[FindingDraft]:
        if not parse_result.ast_root or parse_result.status != ParserStatus.SUCCESS:
            return []

        findings: List[FindingDraft] = []
        for node in ast.walk(parse_result.ast_root):
            if not isinstance(node, ast.Call):
                continue

            matched_api = None
            is_shell_true = False
            is_os_shell = False

            # 1. os.system or os.popen
            if isinstance(node.func, ast.Attribute) and node.func.attr in {"system", "popen"}:
                if isinstance(node.func.value, ast.Name) and node.func.value.id == "os":
                    matched_api = f"os.{node.func.attr}"
                    is_os_shell = True

            # 2. subprocess calls
            elif isinstance(node.func, ast.Attribute) and node.func.attr in {
                "run", "call", "check_call", "check_output", "Popen"
            }:
                if isinstance(node.func.value, ast.Name) and node.func.value.id == "subprocess":
                    # Check for shell=True keyword argument
                    for kw in node.keywords:
                        if kw.arg == "shell":
                            if isinstance(kw.value, ast.Constant) and bool(kw.value.value):
                                is_shell_true = True
                                matched_api = f"subprocess.{node.func.attr}(..., shell=True)"
                            elif isinstance(kw.value, ast.Name) and kw.value.id == "True":
                                is_shell_true = True
                                matched_api = f"subprocess.{node.func.attr}(..., shell=True)"

            if not matched_api:
                continue

            coords = _get_call_coordinates(node)
            evidence = _get_source_line(source_content, coords.start_line) or matched_api

            # Check if command argument is dynamic or literal
            is_dynamic_cmd = True
            if node.args and isinstance(node.args[0], ast.Constant) and isinstance(node.args[0].value, str):
                is_dynamic_cmd = False

            if is_os_shell or is_shell_true:
                severity = Severity.HIGH if is_dynamic_cmd else Severity.MEDIUM
                confidence = Confidence.HIGH if is_dynamic_cmd else Confidence.MEDIUM
            else:
                severity = Severity.LOW
                confidence = Confidence.LOW

            findings.append(
                FindingDraft(
                    rule_id=self.rule_id,
                    rule_name=self.name,
                    rule_version=self.version,
                    title=f"Shell command execution via {matched_api} on line {coords.start_line}",
                    description=self.description,
                    severity=severity,
                    confidence=confidence,
                    category=self.category,
                    file_path=parse_result.relative_path,
                    coordinates=coords,
                    evidence_summary=evidence,
                    why_it_matters=self.why_it_matters,
                    remediation=self.remediation,
                    limitations=self.limitations,
                    metadata={
                        "api": matched_api,
                        "is_dynamic_command": is_dynamic_cmd,
                        "line_number": coords.start_line,
                    },
                )
            )

        return findings


class PyWeakHashRule(BaseRule):
    """PYSEC004: Weak Cryptographic Hash Usage (MD5 / SHA-1)."""

    @property
    def rule_id(self) -> str:
        return "PYSEC004"

    @property
    def name(self) -> str:
        return "Weak Cryptographic Hash Usage"

    @property
    def category(self) -> RuleCategory:
        return RuleCategory.SECURITY

    @property
    def default_severity(self) -> Severity:
        return Severity.MEDIUM

    @property
    def default_confidence(self) -> Confidence:
        return Confidence.MEDIUM

    @property
    def language(self) -> str:
        return "Python"

    @property
    def description(self) -> str:
        return (
            "Detected use of broken cryptographic hashing algorithm (MD5 or SHA-1). "
            "These algorithms suffer from practical collision attacks and must not be used "
            "for digital signatures, cryptographic integrity, password hashing, or authentication."
        )

    @property
    def why_it_matters(self) -> str:
        return (
            "Collision vulnerabilities in MD5 and SHA-1 allow attackers to forge certificates, signatures, "
            "or file digests. While acceptable for non-security checksums or cache keys, usage in security contexts "
            "compromises integrity."
        )

    @property
    def remediation(self) -> str:
        return (
            "For cryptographic hashing, migrate to SHA-256 (hashlib.sha256) or SHA-3. For non-security checksums "
            "in Python 3.9+, explicitly pass usedforsecurity=False (e.g. hashlib.md5(data, usedforsecurity=False)) "
            "to document intent."
        )

    @property
    def limitations(self) -> str:
        return (
            "Detects standard library hashlib.md5(), hashlib.sha1(), hashlib.new('md5'), and hashlib.new('sha1'). "
            "Recognizes usedforsecurity=False to reduce severity and confidence for benign non-security usages."
        )

    def analyze(
        self,
        parse_result: ParseResult,
        source_content: str,
        config: Optional[Dict[str, Any]] = None,
    ) -> List[FindingDraft]:
        if not parse_result.ast_root or parse_result.status != ParserStatus.SUCCESS:
            return []

        findings: List[FindingDraft] = []
        for node in ast.walk(parse_result.ast_root):
            if not isinstance(node, ast.Call):
                continue

            matched_algo = None
            has_usedforsecurity_false = False

            # Check keywords for usedforsecurity=False
            for kw in node.keywords:
                if kw.arg == "usedforsecurity":
                    if isinstance(kw.value, ast.Constant) and kw.value.value is False:
                        has_usedforsecurity_false = True

            # 1. hashlib.md5 or hashlib.sha1
            if isinstance(node.func, ast.Attribute) and node.func.attr in {"md5", "sha1"}:
                if isinstance(node.func.value, ast.Name) and node.func.value.id == "hashlib":
                    matched_algo = f"hashlib.{node.func.attr}"

            # 2. hashlib.new("md5") or hashlib.new("sha1")
            elif isinstance(node.func, ast.Attribute) and node.func.attr == "new":
                if isinstance(node.func.value, ast.Name) and node.func.value.id == "hashlib":
                    if node.args and isinstance(node.args[0], ast.Constant) and isinstance(node.args[0].value, str):
                        algo_name = node.args[0].value.lower()
                        if algo_name in {"md5", "sha1"}:
                            matched_algo = f"hashlib.new('{algo_name}')"

            # 3. Direct from hashlib import md5, sha1
            elif isinstance(node.func, ast.Name) and node.func.id in {"md5", "sha1"}:
                for imp in parse_result.imports:
                    if imp.module == "hashlib" and imp.name == node.func.id:
                        matched_algo = f"hashlib.{node.func.id}"
                        break

            if not matched_algo:
                continue

            coords = _get_call_coordinates(node)
            evidence = _get_source_line(source_content, coords.start_line) or matched_algo

            # If explicitly marked with usedforsecurity=False, emit INFO / LOW confidence
            if has_usedforsecurity_false:
                severity = Severity.INFO
                confidence = Confidence.LOW
            else:
                severity = Severity.MEDIUM
                confidence = Confidence.MEDIUM

            findings.append(
                FindingDraft(
                    rule_id=self.rule_id,
                    rule_name=self.name,
                    rule_version=self.version,
                    title=f"Weak hash algorithm ({matched_algo}) on line {coords.start_line}",
                    description=self.description,
                    severity=severity,
                    confidence=confidence,
                    category=self.category,
                    file_path=parse_result.relative_path,
                    coordinates=coords,
                    evidence_summary=evidence,
                    why_it_matters=self.why_it_matters,
                    remediation=self.remediation,
                    limitations=self.limitations,
                    metadata={
                        "algorithm": matched_algo,
                        "usedforsecurity_false": has_usedforsecurity_false,
                        "line_number": coords.start_line,
                    },
                )
            )

        return findings


class PyTlsVerifyDisabledRule(BaseRule):
    """PYSEC005: TLS Certificate Verification Disabled (verify=False)."""

    @property
    def rule_id(self) -> str:
        return "PYSEC005"

    @property
    def name(self) -> str:
        return "TLS Certificate Verification Disabled"

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
        return "Python"

    @property
    def description(self) -> str:
        return (
            "Detected HTTP client call or SSL context creation explicitly disabling TLS certificate verification (verify=False). "
            "Disabling verification permits connections to hosts with untrusted, expired, or spoofed SSL/TLS certificates."
        )

    @property
    def why_it_matters(self) -> str:
        return (
            "Without certificate validation, network adversaries can intercept, decrypt, and manipulate sensitive traffic "
            "via Man-in-the-Middle (MitM) attacks, capturing API tokens, credentials, and business data in plaintext."
        )

    @property
    def remediation(self) -> str:
        return (
            "Remove verify=False and rely on default trusted CA certificates. In corporate or private environments "
            "with custom certificate authorities, provide the path to the internal CA certificate bundle instead (e.g. verify='/path/to/ca.crt')."
        )

    @property
    def limitations(self) -> str:
        return (
            "Detects verify=False keyword in requests, httpx, and urllib3 calls, as well as ssl._create_unverified_context(). "
            "Does not detect TLS verification disabled through environment variables (e.g. PYTHONHTTPSVERIFY=0) or external proxies."
        )

    def analyze(
        self,
        parse_result: ParseResult,
        source_content: str,
        config: Optional[Dict[str, Any]] = None,
    ) -> List[FindingDraft]:
        if not parse_result.ast_root or parse_result.status != ParserStatus.SUCCESS:
            return []

        findings: List[FindingDraft] = []
        http_method_names = {"get", "post", "put", "delete", "patch", "head", "options", "request"}

        for node in ast.walk(parse_result.ast_root):
            if not isinstance(node, ast.Call):
                continue

            matched_sink = None

            # 1. ssl._create_unverified_context()
            if isinstance(node.func, ast.Attribute) and node.func.attr == "_create_unverified_context":
                if isinstance(node.func.value, ast.Name) and node.func.value.id == "ssl":
                    matched_sink = "ssl._create_unverified_context"

            # 2. Check for verify=False in HTTP client calls
            elif isinstance(node.func, ast.Attribute) and node.func.attr in http_method_names:
                for kw in node.keywords:
                    if kw.arg == "verify":
                        if isinstance(kw.value, ast.Constant) and kw.value.value is False:
                            matched_sink = f"{node.func.attr}(..., verify=False)"
                        elif isinstance(kw.value, ast.Name) and kw.value.id == "False":
                            matched_sink = f"{node.func.attr}(..., verify=False)"

            # 3. Direct request call (e.g. client.request(..., verify=False))
            elif isinstance(node.func, ast.Name) and node.func.id in {"get", "post", "request"}:
                for kw in node.keywords:
                    if kw.arg == "verify":
                        if isinstance(kw.value, ast.Constant) and kw.value.value is False:
                            matched_sink = f"{node.func.id}(..., verify=False)"

            if not matched_sink:
                continue

            coords = _get_call_coordinates(node)
            evidence = _get_source_line(source_content, coords.start_line) or matched_sink

            findings.append(
                FindingDraft(
                    rule_id=self.rule_id,
                    rule_name=self.name,
                    rule_version=self.version,
                    title=f"TLS verification disabled on line {coords.start_line}",
                    description=self.description,
                    severity=self.default_severity,
                    confidence=self.default_confidence,
                    category=self.category,
                    file_path=parse_result.relative_path,
                    coordinates=coords,
                    evidence_summary=evidence,
                    why_it_matters=self.why_it_matters,
                    remediation=self.remediation,
                    limitations=self.limitations,
                    metadata={
                        "sink": matched_sink,
                        "line_number": coords.start_line,
                    },
                )
            )

        return findings


class PySqlQueryConstructionRule(BaseRule):
    """PYSEC006: SQL Query Construction Risk via String Concatenation/Interpolation."""

    @property
    def rule_id(self) -> str:
        return "PYSEC006"

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
        return "Python"

    @property
    def description(self) -> str:
        return (
            "Detected SQL query constructed via string concatenation, f-string interpolation, or % formatting "
            "passed directly to a database execution API. This pattern is vulnerable to SQL injection."
        )

    @property
    def why_it_matters(self) -> str:
        return (
            "Dynamically concatenating input into SQL strings allows attackers to alter query logic, bypass authentication, "
            "read unauthorized data, modify records, or execute administrative database commands (SQL Injection)."
        )

    @property
    def remediation(self) -> str:
        return (
            "Use parameterized queries with placeholders (e.g. cursor.execute('SELECT * FROM users WHERE id = %s', (user_id,))) "
            "or use an Object-Relational Mapper (ORM) with query builder abstractions."
        )

    @property
    def limitations(self) -> str:
        return (
            "Detects inline string concatenation, f-strings, and .format() calls passed as first argument to execute(), "
            "executemany(), raw(), or query() methods containing SQL keywords. Does not track multi-step cross-function data flow."
        )

    def analyze(
        self,
        parse_result: ParseResult,
        source_content: str,
        config: Optional[Dict[str, Any]] = None,
    ) -> List[FindingDraft]:
        if not parse_result.ast_root or parse_result.status != ParserStatus.SUCCESS:
            return []

        findings: List[FindingDraft] = []
        sql_keywords = {"select", "insert", "update", "delete", "drop", "alter", "from", "where", "table"}

        def _contains_sql_keyword(text: str) -> bool:
            lower = text.lower()
            return any(kw in lower for kw in sql_keywords)

        def _is_interpolated_or_concatenated(arg_node: ast.AST) -> bool:
            if isinstance(arg_node, ast.JoinedStr):
                # f-string: check if it contains expressions (not just raw constant text)
                has_expr = any(isinstance(v, ast.FormattedValue) for v in arg_node.values)
                return has_expr
            elif isinstance(arg_node, ast.BinOp):
                # + or % operator
                if isinstance(arg_node.op, (ast.Add, ast.Mod)):
                    return True
            elif isinstance(arg_node, ast.Call):
                # .format() call
                if isinstance(arg_node.func, ast.Attribute) and arg_node.func.attr == "format":
                    return True
            return False

        for node in ast.walk(parse_result.ast_root):
            if not isinstance(node, ast.Call):
                continue

            if not isinstance(node.func, ast.Attribute):
                continue

            method_name = node.func.attr
            if method_name not in {"execute", "executemany", "raw", "execute_query"}:
                continue

            if not node.args:
                continue

            query_arg = node.args[0]
            if not _is_interpolated_or_concatenated(query_arg):
                continue

            coords = _get_call_coordinates(node)
            evidence = _get_source_line(source_content, coords.start_line) or f"{method_name}(...)"

            # Verify SQL keyword presence in evidence or argument constants
            evidence_has_sql = _contains_sql_keyword(evidence)

            # Determine confidence based on SQL keyword evidence
            confidence = Confidence.HIGH if evidence_has_sql else Confidence.MEDIUM
            severity = Severity.HIGH if evidence_has_sql else Severity.MEDIUM

            findings.append(
                FindingDraft(
                    rule_id=self.rule_id,
                    rule_name=self.name,
                    rule_version=self.version,
                    title=f"SQL query construction risk in {method_name}() on line {coords.start_line}",
                    description=self.description,
                    severity=severity,
                    confidence=confidence,
                    category=self.category,
                    file_path=parse_result.relative_path,
                    coordinates=coords,
                    evidence_summary=evidence,
                    why_it_matters=self.why_it_matters,
                    remediation=self.remediation,
                    limitations=self.limitations,
                    metadata={
                        "method": method_name,
                        "has_sql_keyword": evidence_has_sql,
                        "line_number": coords.start_line,
                    },
                )
            )

        return findings
