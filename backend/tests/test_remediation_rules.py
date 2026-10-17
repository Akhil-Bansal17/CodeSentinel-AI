"""Unit tests for Phase 7 Deterministic Remediation Rules & Catalog."""

import pytest
from unittest.mock import MagicMock

from backend.app.services.remediation.rules.base import (
    RemediationConfidence,
    RemediationRisk,
)
from backend.app.services.remediation.rules.dep_upgrade import DepUpgradeRemediationRule
from backend.app.services.remediation.rules.js_dynamic import (
    JsDynamicToSafeParseRule,
    JsRawHtmlToTextContentRule,
)
from backend.app.services.remediation.rules.py_eval import PyEvalToLiteralEvalRule
from backend.app.services.remediation.rules.py_hash import (
    PyAddUsedForSecurityFalseRule,
    PyMigrateToSha256Rule,
)
from backend.app.services.remediation.rules.py_shell import PyShellToSubprocessRule
from backend.app.services.remediation.rules.py_tls import PyRestoreTlsVerificationRule
from backend.app.services.remediation.rules.registry import (
    RemediationRuleRegistry,
    default_remediation_registry,
)


from types import SimpleNamespace


def _make_mock_finding(
    rule_id: str,
    file_path: str = "app.py",
    start_line: int = 1,
    end_line: int = None,
    metadata: dict = None,
):
    meta = metadata or {}
    return SimpleNamespace(
        id="f-123",
        rule_id=rule_id,
        file_path=file_path,
        manifest_path=file_path,
        start_line=start_line,
        end_line=end_line if end_line is not None else start_line,
        metadata_json=meta,
        package_name=meta.get("package_name"),
        remediation_version=meta.get("remediation_version"),
    )


class TestRemediationRegistry:
    def test_default_registry_has_rules(self):
        rules = default_remediation_registry.list_rules()
        assert len(rules) >= 7
        rule_ids = [r.rule_id for r in rules]
        assert "FIX-PYSEC001-LITERAL-EVAL" in rule_ids
        assert "FIX-PYSEC005-RESTORE-TLS" in rule_ids
        assert "FIX-PYSEC004-HASH-SHA256" in rule_ids
        assert "FIX-PYSEC003-ARG-LIST" in rule_ids
        assert "FIX-JSSEC001-JSON-PARSE" in rule_ids
        assert "FIX-JSSEC002-TEXT-CONTENT" in rule_ids
        assert "FIX-DEP-UPGRADE-VERSION" in rule_ids

    def test_unsupported_finding_rule_returns_manual_remediation(self):
        finding = _make_mock_finding("UNSUPPORTED_RULE_999")
        feasibility = default_remediation_registry.assess_finding(finding, "def foo(): pass")
        assert not feasibility.is_supported
        assert feasibility.suggested_action == "MANUAL_REMEDIATION_REQUIRED"
        assert "No automated remediation strategy" in feasibility.unsupported_reason


class TestPyEvalRule:
    def test_replaces_simple_eval(self):
        rule = PyEvalToLiteralEvalRule()
        source = "data = eval(raw_input)\n"
        finding = _make_mock_finding("PYSEC001", start_line=1)
        feasibility = rule.assess_feasibility(finding, source)
        assert feasibility.is_supported
        assert feasibility.candidate is not None
        assert "ast.literal_eval" in feasibility.candidate.proposed_snippet
        assert feasibility.risk_level == RemediationRisk.LOW

    def test_rejects_exec_call(self):
        rule = PyEvalToLiteralEvalRule()
        source = "exec('import os; os.system(\"ls\")')\n"
        finding = _make_mock_finding("PYSEC001", start_line=1)
        feasibility = rule.assess_feasibility(finding, source)
        assert not feasibility.is_supported
        assert "exec" in feasibility.unsupported_reason.lower()

    def test_rejects_multi_argument_eval(self):
        rule = PyEvalToLiteralEvalRule()
        source = "val = eval(expr, globals(), locals())\n"
        finding = _make_mock_finding("PYSEC001", start_line=1)
        feasibility = rule.assess_feasibility(finding, source)
        assert not feasibility.is_supported
        assert "globals" in feasibility.unsupported_reason.lower() or "arguments" in feasibility.unsupported_reason.lower()


class TestPyTlsRule:
    def test_replaces_verify_false(self):
        rule = PyRestoreTlsVerificationRule()
        source = "response = requests.get('https://example.com', verify=False)\n"
        finding = _make_mock_finding("PYSEC005", start_line=1)
        feasibility = rule.assess_feasibility(finding, source)
        assert feasibility.is_supported
        assert feasibility.candidate is not None
        assert "verify=True" in feasibility.candidate.proposed_snippet

    def test_replaces_unverified_ssl_context(self):
        rule = PyRestoreTlsVerificationRule()
        source = "ctx = ssl._create_unverified_context()\n"
        finding = _make_mock_finding("PYSEC005", start_line=1)
        feasibility = rule.assess_feasibility(finding, source)
        assert feasibility.is_supported
        assert "create_default_context" in feasibility.candidate.proposed_snippet


class TestPyHashRule:
    def test_replaces_md5_with_sha256(self):
        rule = PyMigrateToSha256Rule()
        source = "h = hashlib.md5(data).hexdigest()\n"
        finding = _make_mock_finding("PYSEC004", start_line=1)
        feasibility = rule.assess_feasibility(finding, source)
        assert feasibility.is_supported
        assert "hashlib.sha256" in feasibility.candidate.proposed_snippet

    def test_adds_usedforsecurity_false(self):
        rule = PyAddUsedForSecurityFalseRule()
        source = "h = hashlib.md5(data)\n"
        finding = _make_mock_finding("PYSEC004", start_line=1)
        feasibility = rule.assess_feasibility(finding, source)
        assert feasibility.is_supported
        assert "usedforsecurity=False" in feasibility.candidate.proposed_snippet


class TestPyShellRule:
    def test_replaces_simple_shell_command(self):
        rule = PyShellToSubprocessRule()
        source = "subprocess.run('ls -la', shell=True)\n"
        finding = _make_mock_finding("PYSEC003", start_line=1)
        feasibility = rule.assess_feasibility(finding, source)
        assert feasibility.is_supported
        assert "shell=False" in feasibility.candidate.proposed_snippet
        assert "['ls', '-la']" in feasibility.candidate.proposed_snippet

    def test_rejects_pipeline_and_redirection(self):
        rule = PyShellToSubprocessRule()
        source = "subprocess.run('cat file.txt | grep secret > out.txt', shell=True)\n"
        finding = _make_mock_finding("PYSEC003", start_line=1)
        feasibility = rule.assess_feasibility(finding, source)
        assert not feasibility.is_supported
        assert "metacharacter" in feasibility.unsupported_reason.lower()


class TestJsDynamicRule:
    def test_replaces_json_eval_with_json_parse(self):
        rule = JsDynamicToSafeParseRule()
        source = "const obj = eval('(' + jsonStr + ')');\n"
        finding = _make_mock_finding("JSSEC001", file_path="index.js", start_line=1)
        feasibility = rule.assess_feasibility(finding, source)
        assert feasibility.is_supported
        assert "JSON.parse" in feasibility.candidate.proposed_snippet

    def test_replaces_inner_html_with_text_content(self):
        rule = JsRawHtmlToTextContentRule()
        source = "element.innerHTML = userName;\n"
        finding = _make_mock_finding("JSSEC002", file_path="index.js", start_line=1)
        feasibility = rule.assess_feasibility(finding, source)
        assert feasibility.is_supported
        assert "textContent" in feasibility.candidate.proposed_snippet


class TestDepUpgradeRule:
    def test_requirements_txt_upgrade(self):
        rule = DepUpgradeRemediationRule()
        source = "requests==2.25.0\nurllib3<1.26.5\n"
        finding = _make_mock_finding(
            "DEP_VULN",
            file_path="requirements.txt",
            start_line=1,
            metadata={"package_name": "requests", "remediation_version": "2.31.0"},
        )
        feasibility = rule.assess_feasibility(finding, source)
        assert feasibility.is_supported
        assert "requests>=2.31.0" in feasibility.candidate.proposed_snippet

    def test_package_json_upgrade(self):
        rule = DepUpgradeRemediationRule()
        source = '{\n  "dependencies": {\n    "lodash": "^4.17.15"\n  }\n}\n'
        finding = _make_mock_finding(
            "DEP_VULN",
            file_path="package.json",
            start_line=3,
            metadata={"package_name": "lodash", "remediation_version": "4.17.21"},
        )
        feasibility = rule.assess_feasibility(finding, source)
        assert feasibility.is_supported
        assert '"lodash": "^4.17.21"' in feasibility.candidate.proposed_snippet

    def test_rejects_missing_remediation_version(self):
        rule = DepUpgradeRemediationRule()
        source = "requests==2.25.0\n"
        finding = _make_mock_finding(
            "DEP_VULN",
            file_path="requirements.txt",
            start_line=1,
            metadata={"package_name": "requests"},  # No fixed version
        )
        feasibility = rule.assess_feasibility(finding, source)
        assert not feasibility.is_supported
        assert feasibility.suggested_action == "MANUAL_REMEDIATION_REQUIRED"
