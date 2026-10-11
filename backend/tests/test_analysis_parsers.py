"""Comprehensive tests for Python and JavaScript/TypeScript AST parsers."""

import pytest
from backend.app.services.analysis.parsers.base import ParserStatus
from backend.app.services.analysis.parsers.js_ts_adapter import JsTsParser
from backend.app.services.analysis.parsers.python_parser import PythonParser


def test_python_parser_valid_syntax():
    """Verify parsing valid Python extracts functions, line counts, complexity, and imports."""
    code = """import os
from sys import path

def simple_calc(x, y):
    if x > 0:
        return x + y
    return y

async def async_worker(items):
    for item in items:
        if item is not None:
            yield item
"""
    result = PythonParser.parse("calc.py", code)
    assert result.status == ParserStatus.SUCCESS
    assert result.total_lines == 13
    assert len(result.diagnostics) == 0

    # Verify functions
    func_names = [f.name for f in result.functions]
    assert "simple_calc" in func_names
    assert "async_worker" in func_names

    calc_func = next(f for f in result.functions if f.name == "simple_calc")
    assert calc_func.coordinates.start_line == 4
    assert calc_func.line_count == 4
    # Complexity: 1 (base) + 1 (if) = 2
    assert calc_func.cyclomatic_complexity == 2

    # Verify imports
    import_names = [i.name for i in result.imports]
    assert "os" in import_names
    assert "path" in import_names


def test_python_parser_syntax_error():
    """Verify Python syntax errors produce structured diagnostics without crashing."""
    code = """def broken_function(:
    return 42
"""
    result = PythonParser.parse("broken.py", code)
    assert result.status == ParserStatus.SYNTAX_ERROR
    assert len(result.diagnostics) == 1
    diag = result.diagnostics[0]
    assert diag.coordinates is not None
    assert diag.coordinates.start_line == 1
    assert "invalid syntax" in diag.message.lower() or "expected" in diag.message.lower()


def test_python_parser_unicode_and_crlf():
    """Verify Unicode identifiers and CRLF line endings parse accurately."""
    crlf_code = "# Unicode test: π = 3.14159\r\ndef compute_area(r):\r\n    return 3.14159 * r * r\r\n"
    result = PythonParser.parse("unicode_test.py", crlf_code)
    assert result.status == ParserStatus.SUCCESS
    assert len(result.functions) == 1
    assert result.functions[0].name == "compute_area"


def test_python_parser_empty_file():
    """Verify empty file parses successfully with 0 functions and 0 imports."""
    result = PythonParser.parse("empty.py", "")
    assert result.status == ParserStatus.SUCCESS
    assert len(result.functions) == 0
    assert len(result.imports) == 0


def test_js_ts_parser_valid_typescript():
    """Verify parsing valid TypeScript produces functions with coordinates and complexity."""
    code = """export function calculateBonus(score: number, years: number): number {
    if (score > 90) {
        if (years > 5) {
            return 5000;
        }
        return 2000;
    }
    return 500;
}
"""
    result = JsTsParser.parse("bonus.ts", code, "TypeScript")
    assert result.status == ParserStatus.SUCCESS
    assert len(result.diagnostics) == 0
    assert len(result.functions) == 1

    fn = result.functions[0]
    assert fn.name == "calculateBonus"
    assert fn.coordinates.start_line == 1
    assert fn.line_count == 9
    # Base 1 + 2 ifs = 3
    assert fn.cyclomatic_complexity == 3


def test_js_ts_parser_valid_javascript():
    """Verify parsing JavaScript ES6 arrow functions and methods."""
    code = """const add = (a, b) => {
    return a + b;
};

class Greeter {
    greet(name) {
        if (name) {
            return `Hello, ${name}`;
        }
        return "Hello, stranger";
    }
}
"""
    result = JsTsParser.parse("app.js", code, "JavaScript")
    assert result.status == ParserStatus.SUCCESS
    func_names = [f.name for f in result.functions]
    assert "add" in func_names
    assert "greet" in func_names


def test_js_ts_parser_valid_tsx():
    """Verify parsing React TSX components with JSX tags."""
    code = """import React from 'react';

export const UserCard = ({ user }: { user: { name: string } }) => {
    if (!user) {
        return <div className="empty">No User</div>;
    }
    return <div className="card"><h1>{user.name}</h1></div>;
};
"""
    result = JsTsParser.parse("UserCard.tsx", code, "TSX")
    assert result.status == ParserStatus.SUCCESS
    assert len(result.functions) == 1
    assert result.functions[0].name == "UserCard"
    assert result.functions[0].cyclomatic_complexity == 2


def test_js_ts_parser_syntax_error():
    """Verify syntax error in TypeScript produces structured coordinates and message."""
    code = "function invalidSyntax( { return true; }"
    result = JsTsParser.parse("invalid.ts", code, "TypeScript")
    assert result.status == ParserStatus.SYNTAX_ERROR
    assert len(result.diagnostics) >= 1
    diag = result.diagnostics[0]
    assert diag.coordinates is not None
    assert diag.coordinates.start_line == 1
