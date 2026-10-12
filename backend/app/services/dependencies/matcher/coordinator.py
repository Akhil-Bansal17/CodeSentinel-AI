"""Coordinator dispatching version comparison to ecosystem-specific matchers."""

from typing import Any, Dict, List, Optional

from backend.app.services.dependencies.matcher.base import (
    BaseVersionMatcher,
    MatchResult,
)
from backend.app.services.dependencies.matcher.python_matcher import PythonVersionMatcher
from backend.app.services.dependencies.matcher.semver_matcher import SemverMatcher


class VersionMatchCoordinator:
    """Dispatches version evaluation to the appropriate ecosystem-aware matcher."""

    def __init__(self) -> None:
        self._matchers: Dict[str, BaseVersionMatcher] = {
            "pypi": PythonVersionMatcher(),
            "python": PythonVersionMatcher(),
            "npm": SemverMatcher(),
            "javascript": SemverMatcher(),
            "typescript": SemverMatcher(),
        }

    def evaluate(
        self,
        ecosystem: str,
        resolved_version: Optional[str],
        affected_ranges: List[Any],
        fixed_versions: Optional[List[str]] = None,
    ) -> MatchResult:
        eco = ecosystem.strip().lower()
        matcher = self._matchers.get(eco)
        if not matcher:
            return MatchResult(
                is_matched=False,
                is_indeterminate=True,
                reason=f"Unsupported ecosystem '{ecosystem}' for version range evaluation",
            )
        return matcher.is_affected(
            resolved_version=resolved_version,
            affected_ranges=affected_ranges,
            fixed_versions=fixed_versions,
        )


default_version_coordinator = VersionMatchCoordinator()
