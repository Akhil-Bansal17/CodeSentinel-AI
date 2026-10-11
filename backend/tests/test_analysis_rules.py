"""Comprehensive unit tests for all 7 deterministic static analysis rules.

Tests:
- Positive cases (triggers when criterion met)
- Negative cases (does not trigger when criterion not met)
- Exact boundary thresholds (e.g. threshold = 10 -> complexity 10 does NOT trigger, complexity 11 triggers)
- Multiple findings in single file
- Deterministic fingerprints
- Stable output ordering
"""

import pytest

from backend.app.services.analysis.parsers.js_ts_adapter import JsTsParser
from backend.app.services.analysis.parsers.python_parser import PythonParser
from backend.app.services.analysis.rules.js_rules import (
    JsComplexityRule,
    JsFunctionLengthRule,
    JsSyntaxRule,
)
from backend.app.services.analysis.rules.python_rules import (
    PyComplexityRule,
    PyFunctionLengthRule,
    PyImportRule,
    PySyntaxRule,
)


# =========================================================================
# Rule 1: PY-SYNTAX-001 (Python Syntax Error)
# =========================================================================

def test_py_syntax_rule_positive():
    """Verify PY-SYNTAX-001 triggers on invalid Python syntax."""
    code = "def foo(: pass"
    res = PythonParser.parse("foo.py", code)
    rule = PySyntaxRule()
    findings = rule.analyze(res, code)
    assert len(findings) == 1
    assert findings[0].rule_id == "PY-SYNTAX-001"
    assert findings[0].coordinates.start_line == 1
    assert findings[0].severity.value == "CRITICAL"


def test_py_syntax_rule_negative():
    """Verify PY-SYNTAX-001 produces no findings on valid Python code."""
    code = "def foo(): pass"
    res = PythonParser.parse("foo.py", code)
    rule = PySyntaxRule()
    findings = rule.analyze(res, code)
    assert len(findings) == 0


# =========================================================================
# Rule 2: PY-COMPLEXITY-001 (High Cyclomatic Complexity)
# =========================================================================

def test_py_complexity_rule_boundary():
    """Verify PY-COMPLEXITY-001 boundary behavior against exact threshold.

    Threshold = 3:
    Complexity = 3 -> NO finding.
    Complexity = 4 -> 1 finding.
    """
    rule = PyComplexityRule()

    # Complexity 3 (base 1 + 2 ifs)
    code_exact = """def func_at_threshold(a, b):
    if a:
        return 1
    if b:
        return 2
    return 0
"""
    res_exact = PythonParser.parse("exact.py", code_exact)
    findings_exact = rule.analyze(res_exact, code_exact, config={"complexity_threshold": 3})
    assert len(findings_exact) == 0

    # Complexity 4 (base 1 + 3 ifs)
    code_exceed = """def func_exceeds(a, b, c):
    if a:
        return 1
    if b:
        return 2
    if c:
        return 3
    return 0
"""
    res_exceed = PythonParser.parse("exceed.py", code_exceed)
    findings_exceed = rule.analyze(res_exceed, code_exceed, config={"complexity_threshold": 3})
    assert len(findings_exceed) == 1
    assert findings_exceed[0].rule_id == "PY-COMPLEXITY-001"
    assert findings_exceed[0].metadata["complexity"] == 4
    assert findings_exceed[0].metadata["threshold"] == 3


# =========================================================================
# Rule 3: PY-FUNCTION-001 (Excessively Long Function)
# =========================================================================

def test_py_function_length_rule_boundary():
    """Verify PY-FUNCTION-001 boundary behavior.

    Threshold = 5 lines:
    Function with 5 lines -> NO finding.
    Function with 6 lines -> 1 finding.
    """
    rule = PyFunctionLengthRule()

    # Function spanning exactly 5 lines (lines 1 to 5)
    code_5_lines = """def f5():
    a = 1
    b = 2
    c = 3
    return a + b + c
"""
    res_5 = PythonParser.parse("f5.py", code_5_lines)
    findings_5 = rule.analyze(res_5, code_5_lines, config={"function_length_threshold": 5})
    assert len(findings_5) == 0

    # Function spanning 6 lines (lines 1 to 6)
    code_6_lines = """def f6():
    a = 1
    b = 2
    c = 3
    d = 4
    return a + b + c + d
"""
    res_6 = PythonParser.parse("f6.py", code_6_lines)
    findings_6 = rule.analyze(res_6, code_6_lines, config={"function_length_threshold": 5})
    assert len(findings_6) == 1
    assert findings_6[0].rule_id == "PY-FUNCTION-001"
    assert findings_6[0].metadata["line_count"] == 6
    assert findings_6[0].metadata["threshold"] == 5


# =========================================================================
# Rule 4: PY-IMPORT-001 (Repeated Import Statement)
# =========================================================================

def test_py_import_rule_positive_and_negative():
    """Verify PY-IMPORT-001 detects duplicate imports referencing the original line."""
    rule = PyImportRule()

    code = """import sys
import os
import sys
from os import path
from os import path
"""
    res = PythonParser.parse("imports.py", code)
    findings = rule.analyze(res, code)
    assert len(findings) == 2

    # First duplicate is sys on line 3 (original on line 1)
    f_sys = findings[0]
    assert f_sys.rule_id == "PY-IMPORT-001"
    assert f_sys.coordinates.start_line == 3
    assert f_sys.metadata["first_line"] == 1

    # Second duplicate is path on line 5 (original on line 4)
    f_path = findings[1]
    assert f_path.coordinates.start_line == 5
    assert f_path.metadata["first_line"] == 4


# =========================================================================
# Rule 5: JS-SYNTAX-001 (JavaScript/TypeScript Syntax Error)
# =========================================================================

def test_js_syntax_rule_positive_and_negative():
    """Verify JS-SYNTAX-001 detects syntax errors and stays silent on valid code."""
    rule = JsSyntaxRule()

    broken_code = "const x = ;"
    res_broken = JsTsParser.parse("broken.ts", broken_code, "TypeScript")
    findings_broken = rule.analyze(res_broken, broken_code)
    assert len(findings_broken) >= 1
    assert findings_broken[0].rule_id == "JS-SYNTAX-001"

    valid_code = "const x = 42;"
    res_valid = JsTsParser.parse("valid.ts", valid_code, "TypeScript")
    findings_valid = rule.analyze(res_valid, valid_code)
    assert len(findings_valid) == 0


# =========================================================================
# Rule 6: JS-FUNCTION-001 (Excessively Long JS/TS Function)
# =========================================================================

def test_js_function_length_boundary():
    """Verify JS-FUNCTION-001 boundary behavior.

    Threshold = 4 lines.
    4 lines -> NO finding.
    5 lines -> 1 finding.
    """
    rule = JsFunctionLengthRule()

    code_4 = """function f4() {
    const a = 1;
    return a;
}"""
    res_4 = JsTsParser.parse("f4.js", code_4, "JavaScript")
    findings_4 = rule.analyze(res_4, code_4, config={"function_length_threshold": 4})
    assert len(findings_4) == 0

    code_5 = """function f5() {
    const a = 1;
    const b = 2;
    return a + b;
}"""
    res_5 = JsTsParser.parse("f5.js", code_5, "JavaScript")
    findings_5 = rule.analyze(res_5, code_5, config={"function_length_threshold": 4})
    assert len(findings_5) == 1
    assert findings_5[0].rule_id == "JS-FUNCTION-001"
    assert findings_5[0].metadata["line_count"] == 5


# =========================================================================
# Rule 7: JS-COMPLEXITY-001 (High Cyclomatic Complexity)
# =========================================================================

def test_js_complexity_boundary():
    """Verify JS-COMPLEXITY-001 boundary behavior.

    Threshold = 2.
    Complexity 2 -> NO finding.
    Complexity 3 -> 1 finding.
    """
    rule = JsComplexityRule()

    # Complexity 2 (base 1 + 1 if)
    code_2 = """function c2(a) {
    if (a) return 1;
    return 0;
}"""
    res_2 = JsTsParser.parse("c2.js", code_2, "JavaScript")
    findings_2 = rule.analyze(res_2, code_2, config={"complexity_threshold": 2})
    assert len(findings_2) == 0

    # Complexity 3 (base 1 + 2 ifs)
    code_3 = """function c3(a, b) {
    if (a) return 1;
    if (b) return 2;
    return 0;
}"""
    res_3 = JsTsParser.parse("c3.js", code_3, "JavaScript")
    findings_3 = rule.analyze(res_3, code_3, config={"complexity_threshold": 2})
    assert len(findings_3) == 1
    assert findings_3[0].rule_id == "JS-COMPLEXITY-001"
    assert findings_3[0].metadata["complexity"] == 3


def test_repeated_rule_execution_is_deterministic():
    """Verify repeated execution produces identical findings with equivalent order and metadata."""
    rule = PyComplexityRule()
    code = """def complex_function(a, b, c):
    if a:
        if b:
            if c:
                return 1
    return 0
"""
    res = PythonParser.parse("comp.py", code)
    run1 = rule.analyze(res, code, config={"complexity_threshold": 2})
    run2 = rule.analyze(res, code, config={"complexity_threshold": 2})

    assert len(run1) == len(run2) == 1
    assert run1[0].rule_id == run2[0].rule_id
    assert run1[0].metadata == run2[0].metadata
    assert run1[0].evidence_summary == run2[0].evidence_summary
