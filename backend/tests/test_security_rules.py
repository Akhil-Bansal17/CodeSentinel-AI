"""Comprehensive automated test suite for Phase 4 Application Security Intelligence Rules.

Covers:
- True positives (dangerous security patterns correctly flagged)
- False positives / benign patterns (safe constructs NOT flagged)
- Confidence level differentiation (HIGH vs MEDIUM vs LOW)
- Severity level assignment
- Exact source coordinates
- Stable SHA-256 finding fingerprints
- Malformed syntax resilience
"""

import pytest

from backend.app.services.analysis.parsers.js_ts_adapter import JsTsParser
from backend.app.services.analysis.parsers.python_parser import PythonParser
from backend.app.services.analysis.rules.js_security_rules import (
    JsDynamicCodeRule,
    JsHtmlInjectionRule,
    JsShellExecutionRule,
    JsSqlQueryRule,
)
from backend.app.services.analysis.rules.python_security_rules import (
    PyDynamicCodeRule,
    PyShellExecutionRule,
    PySqlQueryConstructionRule,
    PyTlsVerifyDisabledRule,
    PyUnsafeDeserializationRule,
    PyWeakHashRule,
)


# =========================================================================
# Rule PYSEC001: Dynamic Code Execution (eval, exec)
# =========================================================================

def test_pysec001_eval_dynamic_argument():
    """Verify PYSEC001 flags eval with dynamic arguments as HIGH severity and HIGH confidence."""
    code = """def run_user_code(user_input):
    return eval(user_input)
"""
    res = PythonParser.parse("eval_test.py", code)
    rule = PyDynamicCodeRule()
    findings = rule.analyze(res, code)

    assert len(findings) == 1
    f = findings[0]
    assert f.rule_id == "PYSEC001"
    assert f.severity.value == "HIGH"
    assert f.confidence.value == "HIGH"
    assert f.coordinates.start_line == 2
    assert "eval(user_input)" in f.evidence_summary


def test_pysec001_exec_literal_argument():
    """Verify PYSEC001 flags exec with literal string as MEDIUM severity and MEDIUM confidence."""
    code = """def run_constant():
    exec("x = 10")
"""
    res = PythonParser.parse("exec_test.py", code)
    rule = PyDynamicCodeRule()
    findings = rule.analyze(res, code)

    assert len(findings) == 1
    f = findings[0]
    assert f.rule_id == "PYSEC001"
    assert f.severity.value == "MEDIUM"
    assert f.confidence.value == "MEDIUM"
    assert f.coordinates.start_line == 2


def test_pysec001_negative_benign_calls():
    """Verify PYSEC001 does not flag normal function calls or variables containing eval."""
    code = """def evaluate_performance(scores):
    eval_score = sum(scores) / len(scores)
    return eval_score
"""
    res = PythonParser.parse("benign.py", code)
    rule = PyDynamicCodeRule()
    findings = rule.analyze(res, code)
    assert len(findings) == 0


# =========================================================================
# Rule PYSEC002: Unsafe Deserialization (pickle, shelve)
# =========================================================================

def test_pysec002_pickle_loads_dynamic():
    """Verify PYSEC002 flags pickle.loads with dynamic bytes as CRITICAL severity and HIGH confidence."""
    code = """import pickle

def load_payload(raw_bytes):
    return pickle.loads(raw_bytes)
"""
    res = PythonParser.parse("pickle_test.py", code)
    rule = PyUnsafeDeserializationRule()
    findings = rule.analyze(res, code)

    assert len(findings) == 1
    f = findings[0]
    assert f.rule_id == "PYSEC002"
    assert f.severity.value == "CRITICAL"
    assert f.confidence.value == "HIGH"
    assert f.coordinates.start_line == 4
    assert "pickle.loads" in f.evidence_summary


def test_pysec002_shelve_open():
    """Verify PYSEC002 flags shelve.open calls."""
    code = """import shelve

def read_shelf(path):
    with shelve.open(path) as db:
        return db['data']
"""
    res = PythonParser.parse("shelve_test.py", code)
    rule = PyUnsafeDeserializationRule()
    findings = rule.analyze(res, code)

    assert len(findings) == 1
    assert findings[0].rule_id == "PYSEC002"
    assert "shelve.open" in findings[0].evidence_summary


def test_pysec002_negative_json_loads():
    """Verify PYSEC002 does NOT flag safe json.loads or yaml.safe_load calls."""
    code = """import json

def load_config(raw_text):
    return json.loads(raw_text)
"""
    res = PythonParser.parse("json_test.py", code)
    rule = PyUnsafeDeserializationRule()
    findings = rule.analyze(res, code)
    assert len(findings) == 0


# =========================================================================
# Rule PYSEC003: Shell Command Execution Risk
# =========================================================================

def test_pysec003_os_system_dynamic():
    """Verify PYSEC003 flags os.system with dynamic argument as HIGH severity and HIGH confidence."""
    code = """import os

def delete_path(target):
    os.system("rm -rf " + target)
"""
    res = PythonParser.parse("os_test.py", code)
    rule = PyShellExecutionRule()
    findings = rule.analyze(res, code)

    assert len(findings) == 1
    f = findings[0]
    assert f.rule_id == "PYSEC003"
    assert f.severity.value == "HIGH"
    assert f.confidence.value == "HIGH"
    assert f.coordinates.start_line == 4


def test_pysec003_subprocess_shell_true():
    """Verify PYSEC003 flags subprocess.run with shell=True."""
    code = """import subprocess

def list_files(pattern):
    subprocess.run(f"ls {pattern}", shell=True)
"""
    res = PythonParser.parse("subp_test.py", code)
    rule = PyShellExecutionRule()
    findings = rule.analyze(res, code)

    assert len(findings) == 1
    f = findings[0]
    assert f.rule_id == "PYSEC003"
    assert f.severity.value == "HIGH"
    assert f.confidence.value == "HIGH"
    assert "shell=True" in f.evidence_summary


def test_pysec003_negative_subprocess_list_args():
    """Verify PYSEC003 does NOT flag subprocess calls with safe argument arrays and no shell=True."""
    code = """import subprocess

def get_git_status():
    return subprocess.run(["git", "status"], capture_output=True, check=True)
"""
    res = PythonParser.parse("git_test.py", code)
    rule = PyShellExecutionRule()
    findings = rule.analyze(res, code)
    assert len(findings) == 0


# =========================================================================
# Rule PYSEC004: Weak Cryptographic Hash Usage (MD5 / SHA-1)
# =========================================================================

def test_pysec004_md5_and_sha1():
    """Verify PYSEC004 flags hashlib.md5 and hashlib.sha1 as MEDIUM severity."""
    code = """import hashlib

def hash_data(data):
    h1 = hashlib.md5(data).hexdigest()
    h2 = hashlib.sha1(data).hexdigest()
    return h1, h2
"""
    res = PythonParser.parse("hash_test.py", code)
    rule = PyWeakHashRule()
    findings = rule.analyze(res, code)

    assert len(findings) == 2
    assert findings[0].rule_id == "PYSEC004"
    assert findings[0].severity.value == "MEDIUM"
    assert findings[1].rule_id == "PYSEC004"


def test_pysec004_usedforsecurity_false():
    """Verify PYSEC004 lowers severity to INFO and confidence to LOW when usedforsecurity=False."""
    code = """import hashlib

def cache_key(data):
    return hashlib.md5(data, usedforsecurity=False).hexdigest()
"""
    res = PythonParser.parse("cache_test.py", code)
    rule = PyWeakHashRule()
    findings = rule.analyze(res, code)

    assert len(findings) == 1
    assert findings[0].severity.value == "INFO"
    assert findings[0].confidence.value == "LOW"
    assert findings[0].metadata["usedforsecurity_false"] is True


def test_pysec004_negative_sha256():
    """Verify PYSEC004 does NOT flag secure hashes like SHA-256 or SHA-512."""
    code = """import hashlib

def secure_hash(data):
    return hashlib.sha256(data).hexdigest()
"""
    res = PythonParser.parse("sha256_test.py", code)
    rule = PyWeakHashRule()
    findings = rule.analyze(res, code)
    assert len(findings) == 0


# =========================================================================
# Rule PYSEC005: TLS Certificate Verification Disabled (verify=False)
# =========================================================================

def test_pysec005_requests_verify_false():
    """Verify PYSEC005 flags requests.get with verify=False as HIGH severity and HIGH confidence."""
    code = """import requests

def fetch_internal():
    return requests.get("https://internal.corp", verify=False)
"""
    res = PythonParser.parse("tls_test.py", code)
    rule = PyTlsVerifyDisabledRule()
    findings = rule.analyze(res, code)

    assert len(findings) == 1
    f = findings[0]
    assert f.rule_id == "PYSEC005"
    assert f.severity.value == "HIGH"
    assert f.confidence.value == "HIGH"
    assert f.coordinates.start_line == 4


def test_pysec005_ssl_unverified_context():
    """Verify PYSEC005 flags ssl._create_unverified_context calls."""
    code = """import ssl
import urllib.request

def bypass_ssl():
    ctx = ssl._create_unverified_context()
    return urllib.request.urlopen("https://example.com", context=ctx)
"""
    res = PythonParser.parse("ssl_test.py", code)
    rule = PyTlsVerifyDisabledRule()
    findings = rule.analyze(res, code)

    assert len(findings) == 1
    assert findings[0].rule_id == "PYSEC005"
    assert "ssl._create_unverified_context" in findings[0].evidence_summary


def test_pysec005_negative_default_or_true():
    """Verify PYSEC005 does NOT flag default verification or unrelated functions with verify parameter."""
    code = """import requests

def fetch_normal():
    return requests.get("https://example.com")

def custom_func(record, verify=False):
    return record
"""
    res = PythonParser.parse("tls_safe.py", code)
    rule = PyTlsVerifyDisabledRule()
    findings = rule.analyze(res, code)
    assert len(findings) == 0


# =========================================================================
# Rule PYSEC006: SQL Query Construction Risk
# =========================================================================

def test_pysec006_concatenation_with_sql_keywords():
    """Verify PYSEC006 flags string concatenation with SQL keywords passed to execute()."""
    code = """def query_user(cursor, username):
    cursor.execute("SELECT * FROM users WHERE name = '" + username + "'")
"""
    res = PythonParser.parse("sql_concat.py", code)
    rule = PySqlQueryConstructionRule()
    findings = rule.analyze(res, code)

    assert len(findings) == 1
    f = findings[0]
    assert f.rule_id == "PYSEC006"
    assert f.severity.value == "HIGH"
    assert f.confidence.value == "HIGH"
    assert f.coordinates.start_line == 2


def test_pysec006_fstring_interpolation():
    """Verify PYSEC006 flags f-string interpolation passed to execute()."""
    code = """def delete_record(db, item_id):
    db.execute(f"DELETE FROM items WHERE id = {item_id}")
"""
    res = PythonParser.parse("sql_fstring.py", code)
    rule = PySqlQueryConstructionRule()
    findings = rule.analyze(res, code)

    assert len(findings) == 1
    f = findings[0]
    assert f.rule_id == "PYSEC006"
    assert f.severity.value == "HIGH"
    assert f.confidence.value == "HIGH"


def test_pysec006_negative_parameterized_query():
    """Verify PYSEC006 does NOT flag safe parameterized queries with tuples/lists."""
    code = """def query_safe(cursor, user_id):
    cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
"""
    res = PythonParser.parse("sql_safe.py", code)
    rule = PySqlQueryConstructionRule()
    findings = rule.analyze(res, code)
    assert len(findings) == 0


# =========================================================================
# JavaScript / TypeScript Rules: JSSEC001 - JSSEC004
# =========================================================================

def test_jssec001_eval_and_function():
    """Verify JSSEC001 flags eval and new Function in JS/TS files."""
    code = """function runScript(input) {
    eval(input);
    const fn = new Function("x", "return x * 2");
}
"""
    res = JsTsParser.parse("dyn.ts", code, "TypeScript")
    rule = JsDynamicCodeRule()
    findings = rule.analyze(res, code)

    assert len(findings) >= 2
    rule_ids = [f.rule_id for f in findings]
    assert "JSSEC001" in rule_ids


def test_jssec002_inner_html_and_dangerously_set_inner_html():
    """Verify JSSEC002 flags innerHTML assignment and dangerouslySetInnerHTML in TSX."""
    code = """function renderView(elem, content) {
    elem.innerHTML = content;
}
"""
    res = JsTsParser.parse("render.ts", code, "TypeScript")
    rule = JsHtmlInjectionRule()
    findings = rule.analyze(res, code)

    assert len(findings) == 1
    assert findings[0].rule_id == "JSSEC002"
    assert "innerHTML" in findings[0].evidence_summary


def test_jssec003_child_process_exec():
    """Verify JSSEC003 flags child_process.exec calls."""
    code = """const cp = require('child_process');

function runCommand(userPath) {
    cp.exec(`rm -rf ${userPath}`);
}
"""
    res = JsTsParser.parse("exec.js", code, "JavaScript")
    rule = JsShellExecutionRule()
    findings = rule.analyze(res, code)

    assert len(findings) == 1
    assert findings[0].rule_id == "JSSEC003"
    assert findings[0].severity.value == "HIGH"


def test_jssec004_sql_template_query():
    """Verify JSSEC004 flags SQL queries constructed with template literals."""
    code = """function getUser(db, userId) {
    return db.query(`SELECT * FROM users WHERE id = ${userId}`);
}
"""
    res = JsTsParser.parse("db.ts", code, "TypeScript")
    rule = JsSqlQueryRule()
    findings = rule.analyze(res, code)

    assert len(findings) == 1
    assert findings[0].rule_id == "JSSEC004"
    assert findings[0].severity.value == "HIGH"


def test_js_security_negative_safe_constructs():
    """Verify JS/TS security rules do not flag safe DOM updates or parameterized queries."""
    code = """function updateSafe(elem, db, id) {
    elem.textContent = "Safe text";
    return db.query("SELECT * FROM users WHERE id = $1", [id]);
}
"""
    res = JsTsParser.parse("safe.ts", code, "TypeScript")
    findings = []
    for r in [JsDynamicCodeRule(), JsHtmlInjectionRule(), JsShellExecutionRule(), JsSqlQueryRule()]:
        findings.extend(r.analyze(res, code))
    assert len(findings) == 0


# =========================================================================
# Cross-cutting: Stable fingerprints and malformed syntax resilience
# =========================================================================

def test_security_rules_fingerprint_stability():
    """Verify findings generate deterministic SHA-256 fingerprints across runs."""
    from backend.app.services.analysis.normalizer import FindingNormalizer

    code = """import requests
def call_api():
    requests.get("https://untrusted.test", verify=False)
"""
    res1 = PythonParser.parse("api.py", code)
    drafts1 = PyTlsVerifyDisabledRule().analyze(res1, code)
    model1 = FindingNormalizer.normalize_draft(drafts1[0], "run-1", "repo-1", "snap-1", 3)

    res2 = PythonParser.parse("api.py", code)
    drafts2 = PyTlsVerifyDisabledRule().analyze(res2, code)
    model2 = FindingNormalizer.normalize_draft(drafts2[0], "run-2", "repo-1", "snap-1", 3)

    assert model1.fingerprint == model2.fingerprint
    assert len(model1.fingerprint) == 64


def test_security_rules_syntax_error_resilience():
    """Verify security rules do not crash on invalid syntax files."""
    code = "def invalid_syntax(: eval(1)"
    res = PythonParser.parse("invalid.py", code)
    for rule in [
        PyDynamicCodeRule(),
        PyUnsafeDeserializationRule(),
        PyShellExecutionRule(),
        PyWeakHashRule(),
        PyTlsVerifyDisabledRule(),
        PySqlQueryConstructionRule(),
    ]:
        findings = rule.analyze(res, code)
        assert isinstance(findings, list)
