"""Base abstractions and data structures for language parsers."""

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional


class ParserStatus(str, Enum):
    """Status result of language parsing."""

    SUCCESS = "SUCCESS"
    SYNTAX_ERROR = "SYNTAX_ERROR"
    UNSUPPORTED_LANGUAGE = "UNSUPPORTED_LANGUAGE"
    SKIPPED_LIMIT = "SKIPPED_LIMIT"
    UNAVAILABLE = "UNAVAILABLE"
    INTERNAL_ERROR = "INTERNAL_ERROR"


@dataclass
class SourceCoordinates:
    """1-indexed coordinate ranges for source elements."""

    start_line: int
    start_column: Optional[int] = None
    end_line: Optional[int] = None
    end_column: Optional[int] = None

    def __post_init__(self):
        if self.start_line < 1:
            self.start_line = 1
        if self.start_column is not None and self.start_column < 1:
            self.start_column = 1
        if self.end_line is not None and self.end_line < self.start_line:
            self.end_line = self.start_line


@dataclass
class ParsedFunction:
    """Extracted function or method metadata."""

    name: str
    coordinates: SourceCoordinates
    line_count: int
    cyclomatic_complexity: int


@dataclass
class ParsedImport:
    """Extracted import statement metadata."""

    name: str
    module: Optional[str] = None
    alias: Optional[str] = None
    is_from: bool = False
    coordinates: SourceCoordinates = field(default_factory=lambda: SourceCoordinates(start_line=1))


@dataclass
class ParseDiagnostic:
    """Structured parser diagnostic or syntax error."""

    message: str
    coordinates: Optional[SourceCoordinates] = None
    code: Optional[str] = None


@dataclass
class ParsedSecuritySite:
    """Security-sensitive syntax call site discovered during AST parsing."""

    rule_id: str
    name: str
    severity: str
    confidence: str
    coordinates: SourceCoordinates
    evidence: str
    description: str
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ParseResult:
    """Comprehensive, deterministic result of AST parsing."""

    relative_path: str
    language: str
    status: ParserStatus
    total_lines: int
    diagnostics: List[ParseDiagnostic] = field(default_factory=list)
    functions: List[ParsedFunction] = field(default_factory=list)
    imports: List[ParsedImport] = field(default_factory=list)
    security_sites: List[ParsedSecuritySite] = field(default_factory=list)
    ast_root: Optional[Any] = None
    error_message: Optional[str] = None
