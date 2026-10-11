"""Base abstractions for deterministic static analysis rules."""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional

from backend.app.services.analysis.parsers.base import ParseResult, SourceCoordinates


class Severity(str, Enum):
    """Practical severity classifications for analysis findings."""

    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    INFO = "INFO"


class RuleCategory(str, Enum):
    """Categorization for static analysis rules."""

    SYNTAX = "SYNTAX"
    COMPLEXITY = "COMPLEXITY"
    MAINTAINABILITY = "MAINTAINABILITY"
    CODE_SMELL = "CODE_SMELL"
    SECURITY = "SECURITY"


@dataclass
class FindingDraft:
    """Pre-normalized finding produced by a static analysis rule."""

    rule_id: str
    rule_name: str
    rule_version: str
    title: str
    description: str
    severity: Severity
    category: RuleCategory
    file_path: str
    coordinates: SourceCoordinates
    evidence_summary: str
    metadata: Dict[str, Any] = field(default_factory=dict)


class BaseRule(ABC):
    """Abstract base class for all deterministic static analysis rules."""

    @property
    @abstractmethod
    def rule_id(self) -> str:
        """Stable unique identifier (e.g. PY-SYNTAX-001)."""
        pass

    @property
    @abstractmethod
    def name(self) -> str:
        """Human-readable rule name."""
        pass

    @property
    def version(self) -> str:
        """Rule definition version."""
        return "1.0.0"

    @property
    @abstractmethod
    def category(self) -> RuleCategory:
        """Rule category."""
        pass

    @property
    @abstractmethod
    def default_severity(self) -> Severity:
        """Default finding severity."""
        pass

    @property
    @abstractmethod
    def description(self) -> str:
        """Detailed documentation of detection criteria and rationale."""
        pass

    @property
    @abstractmethod
    def language(self) -> str:
        """Applicable language (e.g. Python, JavaScript, TypeScript, or ALL)."""
        pass

    @abstractmethod
    def analyze(
        self,
        parse_result: ParseResult,
        source_content: str,
        config: Optional[Dict[str, Any]] = None,
    ) -> List[FindingDraft]:
        """Execute deterministic detection against parse results and return findings."""
        pass
