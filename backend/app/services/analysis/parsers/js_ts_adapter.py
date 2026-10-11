"""Python adapter for invoking the Node.js TypeScript/JavaScript AST parser.

Safely communicates with js_ts_parser.cjs over standard input/output with
bounded execution timeouts and strict error isolation.
Never executes target source files.
"""

import json
from pathlib import Path
import shutil
import subprocess
from typing import Optional

from backend.app.core.logging import logger
from backend.app.services.analysis.parsers.base import (
    ParsedFunction,
    ParseDiagnostic,
    ParseResult,
    ParserStatus,
    SourceCoordinates,
)

PARSER_SCRIPT_PATH = Path(__file__).parent / "js_ts_parser.cjs"


class JsTsParser:
    """Invokes the deterministic Node.js TypeScript/JavaScript parser."""

    _node_path: Optional[str] = None
    _checked_node: bool = False

    @classmethod
    def _get_node_executable(cls) -> Optional[str]:
        """Check if Node.js executable is available in PATH."""
        if not cls._checked_node:
            cls._node_path = shutil.which("node")
            cls._checked_node = True
        return cls._node_path

    @classmethod
    def parse(cls, relative_path: str, source_code: str, language: str = "TypeScript") -> ParseResult:
        """Parse JS/TS/TSX source code through the TypeScript compiler API runner."""
        lines = source_code.split("\n")
        total_lines = len(lines)

        node_bin = cls._get_node_executable()
        if not node_bin:
            return ParseResult(
                relative_path=relative_path,
                language=language,
                status=ParserStatus.UNAVAILABLE,
                total_lines=total_lines,
                error_message="Node.js runtime is not available on host system.",
            )

        if not PARSER_SCRIPT_PATH.exists():
            return ParseResult(
                relative_path=relative_path,
                language=language,
                status=ParserStatus.INTERNAL_ERROR,
                total_lines=total_lines,
                error_message="js_ts_parser.cjs script is missing.",
            )

        payload = json.dumps({
            "relativePath": relative_path,
            "sourceCode": source_code,
            "language": language,
        })

        try:
            proc = subprocess.run(
                [node_bin, str(PARSER_SCRIPT_PATH)],
                input=payload,
                capture_output=True,
                text=True,
                timeout=5,
                shell=False,
            )
        except subprocess.TimeoutExpired:
            return ParseResult(
                relative_path=relative_path,
                language=language,
                status=ParserStatus.INTERNAL_ERROR,
                total_lines=total_lines,
                error_message="Parser process timed out after 5 seconds.",
            )
        except Exception as exc:
            return ParseResult(
                relative_path=relative_path,
                language=language,
                status=ParserStatus.INTERNAL_ERROR,
                total_lines=total_lines,
                error_message=f"Failed to execute parser process: {exc}",
            )

        if proc.returncode != 0:
            err_msg = proc.stderr.strip() if proc.stderr else f"Parser exited with code {proc.returncode}"
            return ParseResult(
                relative_path=relative_path,
                language=language,
                status=ParserStatus.INTERNAL_ERROR,
                total_lines=total_lines,
                error_message=err_msg,
            )

        try:
            data = json.loads(proc.stdout)
        except json.JSONDecodeError as exc:
            return ParseResult(
                relative_path=relative_path,
                language=language,
                status=ParserStatus.INTERNAL_ERROR,
                total_lines=total_lines,
                error_message=f"Invalid JSON returned by JS/TS parser: {exc}",
            )

        status_str = data.get("status", "INTERNAL_ERROR")
        try:
            status = ParserStatus(status_str)
        except ValueError:
            status = ParserStatus.INTERNAL_ERROR

        diagnostics = []
        for d in data.get("diagnostics", []):
            start_line = max(1, min(d.get("startLine", 1), total_lines or 1))
            end_line = max(start_line, min(d.get("endLine", start_line), total_lines or 1))
            diagnostics.append(
                ParseDiagnostic(
                    message=d.get("message", "Syntax error"),
                    coordinates=SourceCoordinates(
                        start_line=start_line,
                        start_column=d.get("startColumn"),
                        end_line=end_line,
                        end_column=d.get("endColumn"),
                    ),
                    code=d.get("code"),
                )
            )

        functions = []
        for f in data.get("functions", []):
            start_line = max(1, min(f.get("startLine", 1), total_lines or 1))
            end_line = max(start_line, min(f.get("endLine", start_line), total_lines or 1))
            coords = SourceCoordinates(
                start_line=start_line,
                start_column=f.get("startColumn"),
                end_line=end_line,
                end_column=f.get("endColumn"),
            )
            functions.append(
                ParsedFunction(
                    name=f.get("name", "anonymous"),
                    coordinates=coords,
                    line_count=f.get("lineCount", end_line - start_line + 1),
                    cyclomatic_complexity=f.get("cyclomaticComplexity", 1),
                )
            )

        return ParseResult(
            relative_path=relative_path,
            language=language,
            status=status,
            total_lines=data.get("totalLines", total_lines),
            diagnostics=diagnostics,
            functions=functions,
            error_message=data.get("errorMessage"),
        )
