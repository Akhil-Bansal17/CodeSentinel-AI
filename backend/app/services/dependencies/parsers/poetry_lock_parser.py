"""Deterministic parser for poetry.lock files."""

import os
import tomllib
from typing import Dict, List, Optional

from backend.app.services.dependencies.parsers.base import (
    BaseDependencyParser,
    DiscoveredDependency,
    ParserResult,
    normalize_pypi_name,
)

MAX_POETRY_LOCK_BYTES = 10 * 1024 * 1024  # 10 MB


class PoetryLockParser(BaseDependencyParser):
    """Parses poetry.lock files to extract exact resolved dependency versions."""

    parser_name = "python-poetry-lock"
    parser_version = "1.0.0"
    ecosystem = "pypi"

    def can_parse(self, file_path: str) -> bool:
        norm = file_path.replace("\\", "/").lower()
        return os.path.basename(norm) == "poetry.lock"

    def parse(
        self,
        file_path: str,
        content: str,
        all_files_content: Optional[Dict[str, str]] = None,
    ) -> ParserResult:
        norm_path = file_path.replace("\\", "/")

        if len(content.encode("utf-8")) > MAX_POETRY_LOCK_BYTES:
            return ParserResult(
                dependencies=[],
                manifest_path=norm_path,
                ecosystem=self.ecosystem,
                parser_name=self.parser_name,
                parser_version=self.parser_version,
                status="error",
                errors=[f"File size exceeds limit ({MAX_POETRY_LOCK_BYTES} bytes)"],
            )

        try:
            data = tomllib.loads(content)
        except Exception as exc:
            return ParserResult(
                dependencies=[],
                manifest_path=norm_path,
                ecosystem=self.ecosystem,
                parser_name=self.parser_name,
                parser_version=self.parser_version,
                status="error",
                errors=[f"Invalid poetry.lock TOML: {exc}"],
            )

        dependencies: List[DiscoveredDependency] = []
        errors: List[str] = []
        skipped_items = 0

        packages = data.get("package", [])
        if not isinstance(packages, list):
            return ParserResult(
                dependencies=[],
                manifest_path=norm_path,
                ecosystem=self.ecosystem,
                parser_name=self.parser_name,
                parser_version=self.parser_version,
                status="error",
                errors=["Malformed poetry.lock: 'package' list missing or invalid"],
            )

        for pkg in packages:
            if not isinstance(pkg, dict):
                skipped_items += 1
                continue

            name = pkg.get("name")
            version = pkg.get("version")
            if not name or not version or not isinstance(name, str) or not isinstance(version, str):
                skipped_items += 1
                continue

            category = pkg.get("category", "main")
            optional = bool(pkg.get("optional", False))
            sub_deps = pkg.get("dependencies", {})
            files_info = pkg.get("files", [])

            dep_type = "optional" if optional else ("dev" if category == "dev" else "direct")

            dependencies.append(
                DiscoveredDependency(
                    package_name=normalize_pypi_name(name),
                    original_package_name=name,
                    ecosystem=self.ecosystem,
                    manifest_path=norm_path,
                    lockfile_path=norm_path,
                    version_constraint=None,
                    resolved_version=version.strip(),
                    dependency_type=dep_type,
                    is_direct=None,  # Lockfile alone without pyproject doesn't dictate direct/transitive conclusively
                    scope=category,
                    parser_name=self.parser_name,
                    parser_version=self.parser_version,
                    status="resolved",
                    metadata={
                        "sub_dependencies": list(sub_deps.keys()) if isinstance(sub_deps, dict) else [],
                        "has_checksums": bool(files_info),
                    },
                )
            )

        return ParserResult(
            dependencies=dependencies,
            manifest_path=norm_path,
            ecosystem=self.ecosystem,
            parser_name=self.parser_name,
            parser_version=self.parser_version,
            status="success" if dependencies else ("error" if errors else "success"),
            errors=errors,
            skipped_items=skipped_items,
        )
