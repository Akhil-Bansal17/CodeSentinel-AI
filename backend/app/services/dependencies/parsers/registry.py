"""Parser registry coordinating manifest and lockfile parsers for CodeSentinel AI."""

from typing import List, Optional

from backend.app.services.dependencies.parsers.base import BaseDependencyParser
from backend.app.services.dependencies.parsers.package_json_parser import PackageJsonParser
from backend.app.services.dependencies.parsers.package_lock_parser import PackageLockJsonParser
from backend.app.services.dependencies.parsers.pipfile_lock_parser import PipfileLockParser
from backend.app.services.dependencies.parsers.pnpm_lock_parser import PnpmLockParser
from backend.app.services.dependencies.parsers.poetry_lock_parser import PoetryLockParser
from backend.app.services.dependencies.parsers.pyproject_parser import PyprojectTomlParser
from backend.app.services.dependencies.parsers.requirements_parser import RequirementsTxtParser
from backend.app.services.dependencies.parsers.yarn_lock_parser import YarnLockParser


class DependencyParserRegistry:
    """Registry maintaining available dependency manifest and lockfile parsers."""

    def __init__(self) -> None:
        self._parsers: List[BaseDependencyParser] = [
            RequirementsTxtParser(),
            PyprojectTomlParser(),
            PoetryLockParser(),
            PipfileLockParser(),
            PackageJsonParser(),
            PackageLockJsonParser(),
            PnpmLockParser(),
            YarnLockParser(),
        ]

    def register_parser(self, parser: BaseDependencyParser) -> None:
        self._parsers.append(parser)

    def get_parser_for_file(self, file_path: str) -> Optional[BaseDependencyParser]:
        """Find the matching parser for a relative file path."""
        for parser in self._parsers:
            if parser.can_parse(file_path):
                return parser
        return None

    def is_supported_manifest_or_lockfile(self, file_path: str) -> bool:
        """Check whether a given file path corresponds to a supported dependency file."""
        return self.get_parser_for_file(file_path) is not None

    def get_all_parsers(self) -> List[BaseDependencyParser]:
        return list(self._parsers)


default_parser_registry = DependencyParserRegistry()
