"""Dependency parsers package."""

from backend.app.services.dependencies.parsers.base import (
    BaseDependencyParser,
    DiscoveredDependency,
    ParserResult,
    normalize_npm_name,
    normalize_package_name,
    normalize_pypi_name,
)
from backend.app.services.dependencies.parsers.registry import (
    DependencyParserRegistry,
    default_parser_registry,
)

__all__ = [
    "BaseDependencyParser",
    "DiscoveredDependency",
    "ParserResult",
    "DependencyParserRegistry",
    "default_parser_registry",
    "normalize_npm_name",
    "normalize_pypi_name",
    "normalize_package_name",
]
