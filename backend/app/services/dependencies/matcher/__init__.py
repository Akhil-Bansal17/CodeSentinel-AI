"""Version matching package."""

from backend.app.services.dependencies.matcher.base import (
    BaseVersionMatcher,
    MatchResult,
)
from backend.app.services.dependencies.matcher.coordinator import (
    VersionMatchCoordinator,
    default_version_coordinator,
)
from backend.app.services.dependencies.matcher.python_matcher import PythonVersionMatcher
from backend.app.services.dependencies.matcher.semver_matcher import Semver, SemverMatcher

__all__ = [
    "BaseVersionMatcher",
    "MatchResult",
    "PythonVersionMatcher",
    "SemverMatcher",
    "Semver",
    "VersionMatchCoordinator",
    "default_version_coordinator",
]
