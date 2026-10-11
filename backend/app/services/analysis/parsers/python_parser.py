"""Deterministic Python AST parser for CodeSentinel AI.

Parses Python source code into abstract syntax trees using Python's standard library
ast module. Calculates cyclomatic complexity, function lengths, and imports without
executing or importing untrusted target files.
"""

import ast
from typing import List, Set

from backend.app.services.analysis.parsers.base import (
    ParsedFunction,
    ParsedImport,
    ParseDiagnostic,
    ParseResult,
    ParserStatus,
    SourceCoordinates,
)


def _compute_python_complexity(function_node: ast.AST) -> int:
    """Compute McCabe cyclomatic complexity for a Python function AST node.

    Base complexity is 1.
    Each decision branching construct adds 1 to the complexity:
    - If, For, AsyncFor, While
    - ExceptHandler
    - With, AsyncWith
    - Assert
    - List/Dict/Set/Generator comprehension (each comprehension loop or 'if' clause)
    - BoolOp: (number of operands - 1)
    """
    complexity = 1

    # Traverse child nodes inside function_node, excluding nested functions/classes
    for node in ast.iter_child_nodes(function_node):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            # Nested function/class has its own independent complexity calculation
            continue

        for child in ast.walk(node):
            # Skip traversing inside nested functions/classes
            if isinstance(child, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                continue

            if isinstance(
                child,
                (
                    ast.If,
                    ast.For,
                    ast.AsyncFor,
                    ast.While,
                    ast.ExceptHandler,
                    ast.With,
                    ast.AsyncWith,
                    ast.Assert,
                ),
            ):
                complexity += 1
            elif isinstance(child, ast.comprehension):
                complexity += 1 + len(child.ifs)
            elif isinstance(child, ast.BoolOp):
                complexity += max(0, len(child.values) - 1)

    return complexity


class PythonParser:
    """Safe, deterministic Python AST parser."""

    @classmethod
    def parse(cls, relative_path: str, source_code: str) -> ParseResult:
        """Parse Python source code into structured AST results."""
        lines = source_code.split("\n")
        total_lines = len(lines)

        try:
            tree = ast.parse(source_code, filename=relative_path)
        except SyntaxError as exc:
            line_no = exc.lineno or 1
            col_no = exc.offset if (exc.offset is not None and exc.offset > 0) else 1
            end_line = getattr(exc, "end_lineno", line_no) or line_no
            end_col = getattr(exc, "end_offset", None)

            # Cap line coordinates at actual source length
            if total_lines > 0 and line_no > total_lines:
                line_no = total_lines
            if total_lines > 0 and end_line > total_lines:
                end_line = total_lines

            diagnostic = ParseDiagnostic(
                message=exc.msg or "Syntax error in Python source file",
                coordinates=SourceCoordinates(
                    start_line=line_no,
                    start_column=col_no,
                    end_line=end_line,
                    end_column=end_col,
                ),
            )
            return ParseResult(
                relative_path=relative_path,
                language="Python",
                status=ParserStatus.SYNTAX_ERROR,
                total_lines=total_lines,
                diagnostics=[diagnostic],
                error_message=f"SyntaxError: {exc.msg} at line {line_no}",
            )
        except Exception as exc:
            return ParseResult(
                relative_path=relative_path,
                language="Python",
                status=ParserStatus.INTERNAL_ERROR,
                total_lines=total_lines,
                error_message=f"Parser error: {type(exc).__name__}: {exc}",
            )

        # Extract functions and imports
        functions: List[ParsedFunction] = []
        imports: List[ParsedImport] = []

        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                start_line = node.lineno
                start_col = (node.col_offset or 0) + 1
                end_line = getattr(node, "end_lineno", node.lineno)
                end_col = getattr(node, "end_col_offset", None)
                if end_col is not None:
                    end_col = end_col + 1

                line_count = end_line - start_line + 1
                complexity = _compute_python_complexity(node)

                coords = SourceCoordinates(
                    start_line=start_line,
                    start_column=start_col,
                    end_line=end_line,
                    end_column=end_col,
                )
                functions.append(
                    ParsedFunction(
                        name=node.name,
                        coordinates=coords,
                        line_count=line_count,
                        cyclomatic_complexity=complexity,
                    )
                )

            elif isinstance(node, ast.Import):
                for alias in node.names:
                    coords = SourceCoordinates(
                        start_line=node.lineno,
                        start_column=(node.col_offset or 0) + 1,
                        end_line=getattr(node, "end_lineno", node.lineno),
                        end_column=(getattr(node, "end_col_offset", 0) or 0) + 1,
                    )
                    imports.append(
                        ParsedImport(
                            name=alias.name,
                            alias=alias.asname,
                            is_from=False,
                            coordinates=coords,
                        )
                    )

            elif isinstance(node, ast.ImportFrom):
                mod = node.module or ""
                for alias in node.names:
                    coords = SourceCoordinates(
                        start_line=node.lineno,
                        start_column=(node.col_offset or 0) + 1,
                        end_line=getattr(node, "end_lineno", node.lineno),
                        end_column=(getattr(node, "end_col_offset", 0) or 0) + 1,
                    )
                    imports.append(
                        ParsedImport(
                            name=alias.name,
                            module=mod,
                            alias=alias.asname,
                            is_from=True,
                            coordinates=coords,
                        )
                    )

        # Sort functions and imports deterministically by start_line
        functions.sort(key=lambda f: (f.coordinates.start_line, f.coordinates.start_column or 0, f.name))
        imports.sort(key=lambda i: (i.coordinates.start_line, i.coordinates.start_column or 0, i.name))

        return ParseResult(
            relative_path=relative_path,
            language="Python",
            status=ParserStatus.SUCCESS,
            total_lines=total_lines,
            functions=functions,
            imports=imports,
            ast_root=tree,
        )
