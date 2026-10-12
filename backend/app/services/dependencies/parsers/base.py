"""Base parser definitions and data structures for CodeSentinel AI Dependency Intelligence."""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
import re
from typing import Any, Dict, List, Optional


def normalize_pypi_name(name: str) -> str:
    """Normalize Python package name per PEP 503."""
    clean = re.sub(r"[-_.]+", "-", name.strip()).lower()
    return clean


def normalize_npm_name(name: str) -> str:
    """Normalize npm package name (lowercase, preserve scopes)."""
    return name.strip().lower()


def normalize_package_name(ecosystem: str, name: str) -> str:
    """Normalize package name according to ecosystem conventions."""
    eco = ecosystem.strip().lower()
    if eco in {"pypi", "python"}:
        return normalize_pypi_name(name)
    elif eco in {"npm", "javascript", "typescript"}:
        return normalize_npm_name(name)
    return name.strip().lower()


@dataclass
class DiscoveredDependency:
    """Represents a discovered package dependency in a manifest or lockfile."""

    package_name: str
    original_package_name: str
    ecosystem: str
    manifest_path: str
    lockfile_path: Optional[str] = None
    version_constraint: Optional[str] = None
    resolved_version: Optional[str] = None
    dependency_type: str = "direct"  # direct, transitive, dev, optional, peer, unknown
    is_direct: Optional[bool] = True
    scope: Optional[str] = None
    parser_name: str = ""
    parser_version: str = "1.0.0"
    status: str = "resolved"  # resolved, unresolved, unsupported, parse_error
    metadata: Dict[str, Any] = field(default_factory=dict)
    line_number: Optional[int] = None


@dataclass
class ParserResult:
    """Outcome of parsing a manifest or lockfile."""

    dependencies: List[DiscoveredDependency]
    manifest_path: str
    ecosystem: str
    parser_name: str
    parser_version: str = "1.0.0"
    status: str = "success"  # success, partial, unsupported, error
    errors: List[str] = field(default_factory=list)
    skipped_items: int = 0
    metadata: Dict[str, Any] = field(default_factory=dict)


class BaseDependencyParser(ABC):
    """Abstract base class for manifest and lockfile parsers."""

    parser_name: str = "base"
    parser_version: str = "1.0.0"
    ecosystem: str = "unknown"

    @abstractmethod
    def can_parse(self, file_path: str) -> bool:
        """Determine if this parser handles the given file path."""
        pass

    @abstractmethod
    def parse(self, file_path: str, content: str, all_files_content: Optional[Dict[str, str]] = None) -> ParserResult:
        """Parse file content deterministically without executing external code."""
        pass
