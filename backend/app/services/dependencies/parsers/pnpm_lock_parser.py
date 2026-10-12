"""Deterministic parser for pnpm-lock.yaml files."""

import os
import re
from typing import Any, Dict, List, Optional, Set
import yaml

from backend.app.services.dependencies.parsers.base import (
    BaseDependencyParser,
    DiscoveredDependency,
    ParserResult,
    normalize_npm_name,
)

MAX_PNPM_LOCK_BYTES = 10 * 1024 * 1024  # 10 MB


class PnpmLockParser(BaseDependencyParser):
    """Parses pnpm-lock.yaml safely with strict size limits."""

    parser_name = "npm-pnpm-lock-yaml"
    parser_version = "1.0.0"
    ecosystem = "npm"

    def can_parse(self, file_path: str) -> bool:
        norm = file_path.replace("\\", "/").lower()
        return os.path.basename(norm) == "pnpm-lock.yaml"

    def parse(
        self,
        file_path: str,
        content: str,
        all_files_content: Optional[Dict[str, str]] = None,
    ) -> ParserResult:
        norm_path = file_path.replace("\\", "/")

        if len(content.encode("utf-8")) > MAX_PNPM_LOCK_BYTES:
            return ParserResult(
                dependencies=[],
                manifest_path=norm_path,
                ecosystem=self.ecosystem,
                parser_name=self.parser_name,
                parser_version=self.parser_version,
                status="error",
                errors=[f"File size exceeds limit ({MAX_PNPM_LOCK_BYTES} bytes)"],
            )

        try:
            data = yaml.safe_load(content)
        except Exception as exc:
            return ParserResult(
                dependencies=[],
                manifest_path=norm_path,
                ecosystem=self.ecosystem,
                parser_name=self.parser_name,
                parser_version=self.parser_version,
                status="error",
                errors=[f"Invalid pnpm-lock.yaml YAML: {exc}"],
            )

        if not isinstance(data, dict):
            return ParserResult(
                dependencies=[],
                manifest_path=norm_path,
                ecosystem=self.ecosystem,
                parser_name=self.parser_name,
                parser_version=self.parser_version,
                status="error",
                errors=["Root of pnpm-lock.yaml must be a mapping"],
            )

        dependencies: List[DiscoveredDependency] = []
        errors: List[str] = []
        skipped_items = 0

        # Collect root direct dependencies from 'dependencies' / 'devDependencies' or 'importers'
        direct_names: Set[str] = set()
        dev_names: Set[str] = set()

        if "dependencies" in data and isinstance(data["dependencies"], dict):
            direct_names.update(data["dependencies"].keys())
        if "devDependencies" in data and isinstance(data["devDependencies"], dict):
            dev_names.update(data["devDependencies"].keys())

        # In pnpm v6+, root declarations are under importers['.']
        importers = data.get("importers", {})
        if isinstance(importers, dict):
            root_importer = importers.get(".", {})
            if isinstance(root_importer, dict):
                if "dependencies" in root_importer and isinstance(root_importer["dependencies"], dict):
                    direct_names.update(root_importer["dependencies"].keys())
                if "devDependencies" in root_importer and isinstance(root_importer["devDependencies"], dict):
                    dev_names.update(root_importer["devDependencies"].keys())

        packages = data.get("packages", {})
        if isinstance(packages, dict):
            for raw_key, pkg_info in packages.items():
                if not isinstance(raw_key, str):
                    continue

                # Key format varies:
                # v5: "/lodash/4.17.21" or "/@types/node/18.0.0"
                # v6/9: "/lodash@4.17.21" or "@babel/core@7.12.3" or "/@babel/core@7.12.3"
                clean_key = raw_key.lstrip("/")

                pkg_name = ""
                version = ""

                if "@" in clean_key:
                    # Scope handling: if starts with @scope/name@version
                    if clean_key.startswith("@"):
                        second_at = clean_key.find("@", 1)
                        if second_at != -1:
                            pkg_name = clean_key[:second_at]
                            version = clean_key[second_at + 1 :]
                    else:
                        first_at = clean_key.find("@")
                        pkg_name = clean_key[:first_at]
                        version = clean_key[first_at + 1 :]
                elif "/" in clean_key:
                    parts = clean_key.split("/")
                    if len(parts) == 2:
                        pkg_name = parts[0]
                        version = parts[1]
                    elif len(parts) >= 3 and parts[0].startswith("@"):
                        pkg_name = f"{parts[0]}/{parts[1]}"
                        version = parts[2]

                # Strip peer dependency suffixes, e.g. "4.17.21(react@18.0.0)"
                if "(" in version:
                    version = version.split("(", 1)[0]
                # Strip hash or query parameter
                if "_" in version:
                    version = version.split("_", 1)[0]

                if not pkg_name or not version:
                    skipped_items += 1
                    continue

                norm_name = normalize_npm_name(pkg_name)
                is_direct = norm_name in direct_names or norm_name in dev_names
                is_dev = norm_name in dev_names or bool(isinstance(pkg_info, dict) and pkg_info.get("dev"))
                dep_type = "transitive" if not is_direct else ("dev" if is_dev else "direct")

                dependencies.append(
                    DiscoveredDependency(
                        package_name=norm_name,
                        original_package_name=pkg_name,
                        ecosystem=self.ecosystem,
                        manifest_path=norm_path,
                        lockfile_path=norm_path,
                        version_constraint=None,
                        resolved_version=version.strip(),
                        dependency_type=dep_type,
                        is_direct=is_direct,
                        scope="development" if is_dev else "production",
                        parser_name=self.parser_name,
                        parser_version=self.parser_version,
                        status="resolved",
                        metadata={"raw_key": raw_key},
                    )
                )

        return ParserResult(
            dependencies=dependencies,
            manifest_path=norm_path,
            ecosystem=self.ecosystem,
            parser_name=self.parser_name,
            parser_version=self.parser_version,
            status="success" if dependencies else "partial",
            errors=errors,
            skipped_items=skipped_items,
        )
