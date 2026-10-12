"""Base types and interfaces for ecosystem-aware version range matching."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, List, Optional


@dataclass
class MatchResult:
    """Deterministic result of evaluating a package version against advisory ranges."""

    is_matched: bool
    is_indeterminate: bool = False
    matched_range: Optional[str] = None
    reason: Optional[str] = None
    remediation_version: Optional[str] = None


class BaseVersionMatcher(ABC):
    """Abstract base class for ecosystem version comparison engines."""

    ecosystem: str = "unknown"

    @abstractmethod
    def is_affected(
        self,
        resolved_version: Optional[str],
        affected_ranges: List[Any],
        fixed_versions: Optional[List[str]] = None,
    ) -> MatchResult:
        """Evaluate if the resolved version falls within any of the affected ranges."""
        pass
