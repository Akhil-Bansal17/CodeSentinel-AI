"""Deterministic parser for Node.js package-lock.json files supporting lockfileVersion 1, 2, and 3."""

import json
import os
from typing import Any, Dict, List, Optional, Set

from backend.app.services.dependencies.parsers.base import (
    BaseDependencyParser,
    DiscoveredDependency,
    ParserResult,
    normalize_npm_name,
)

MAX_PACKAGE_LOCK_BYTES = 15 * 1024 * 1024  # 15 MB


class PackageLockJsonParser(BaseDependencyParser):
    """Parses package-lock.json to extract exact resolved dependency versions."""

    parser_name = "npm-package-lock-json"
    parser_version = "1.0.0"
    ecosystem = "npm"

    def can_parse(self, file_path: str) -> bool:
        norm = file_path.replace("\\", "/").lower()
        return os.path.basename(norm) == "package-lock.json"

    def parse(
        self,
        file_path: str,
        content: str,
        all_files_content: Optional[Dict[str, str]] = None,
    ) -> ParserResult:
        norm_path = file_path.replace("\\", "/")

        if len(content.encode("utf-8")) > MAX_PACKAGE_LOCK_BYTES:
            return ParserResult(
                dependencies=[],
                manifest_path=norm_path,
                ecosystem=self.ecosystem,
                parser_name=self.parser_name,
                parser_version=self.parser_version,
                status="error",
                errors=[f"File size exceeds limit ({MAX_PACKAGE_LOCK_BYTES} bytes)"],
            )

        try:
            data = json.loads(content)
        except Exception as exc:
            return ParserResult(
                dependencies=[],
                manifest_path=norm_path,
                ecosystem=self.ecosystem,
                parser_name=self.parser_name,
                parser_version=self.parser_version,
                status="error",
                errors=[f"Invalid package-lock.json JSON: {exc}"],
            )

        if not isinstance(data, dict):
            return ParserResult(
                dependencies=[],
                manifest_path=norm_path,
                ecosystem=self.ecosystem,
                parser_name=self.parser_name,
                parser_version=self.parser_version,
                status="error",
                errors=["Root of package-lock.json must be a JSON object"],
            )

        lock_version = data.get("lockfileVersion", 1)
        dependencies: List[DiscoveredDependency] = []
        errors: List[str] = []
        skipped_items = 0

        # Lockfile v2 and v3 have 'packages' map
        if lock_version in (2, 3) and "packages" in data and isinstance(data["packages"], dict):
            packages_map: Dict[str, Any] = data["packages"]
            root_entry = packages_map.get("", {})
            root_direct: Set[str] = set()
            root_dev: Set[str] = set()

            if isinstance(root_entry, dict):
                root_direct.update(root_entry.get("dependencies", {}).keys())
                root_dev.update(root_entry.get("devDependencies", {}).keys())

            for pkg_path, pkg_info in packages_map.items():
                if not pkg_path or not isinstance(pkg_info, dict):
                    continue

                # Package path typically starts with node_modules/
                # e.g. "node_modules/lodash" or "node_modules/@scope/pkg"
                # or nested "node_modules/a/node_modules/b"
                parts = pkg_path.split("node_modules/")
                if len(parts) < 2:
                    skipped_items += 1
                    continue

                raw_name = pkg_info.get("name")
                if not raw_name:
                    # Deriving from last part
                    raw_name = parts[-1].rstrip("/")
                if not raw_name:
                    skipped_items += 1
                    continue

                raw_ver = pkg_info.get("version")
                if not raw_ver or not isinstance(raw_ver, str):
                    skipped_items += 1
                    continue

                norm_name = normalize_npm_name(raw_name)

                # Determine direct vs transitive
                # If only 1 node_modules/ occurrence and matches root direct or dev
                is_nested = len(parts) > 2
                is_direct: bool
                dep_type: str

                if not is_nested and (raw_name in root_direct or norm_name in root_direct):
                    is_direct = True
                    dep_type = "direct"
                elif not is_nested and (raw_name in root_dev or norm_name in root_dev):
                    is_direct = True
                    dep_type = "dev"
                elif not is_nested and not root_direct and not root_dev:
                    # In some lockfiles without root entry declarations, top-level is direct
                    is_direct = not bool(pkg_info.get("dev", False))
                    dep_type = "dev" if pkg_info.get("dev") else "direct"
                else:
                    is_direct = False
                    dep_type = "transitive"

                dependencies.append(
                    DiscoveredDependency(
                        package_name=norm_name,
                        original_package_name=raw_name,
                        ecosystem=self.ecosystem,
                        manifest_path=norm_path,
                        lockfile_path=norm_path,
                        version_constraint=None,
                        resolved_version=raw_ver.strip(),
                        dependency_type=dep_type,
                        is_direct=is_direct,
                        scope="development" if pkg_info.get("dev") else "production",
                        parser_name=self.parser_name,
                        parser_version=self.parser_version,
                        status="resolved",
                        metadata={
                            "lockfile_path_key": pkg_path,
                            "resolved_url": pkg_info.get("resolved"),
                            "integrity": pkg_info.get("integrity"),
                        },
                    )
                )

        # Fallback or v1 format: parse recursive 'dependencies' tree
        elif "dependencies" in data and isinstance(data["dependencies"], dict):
            self._parse_v1_dependencies(
                deps_dict=data["dependencies"],
                manifest_path=norm_path,
                is_root=True,
                dependencies=dependencies,
                skipped_items=skipped_items,
            )
        else:
            errors.append(f"Unsupported or unrecognizable package-lock.json format (lockfileVersion: {lock_version})")

        return ParserResult(
            dependencies=dependencies,
            manifest_path=norm_path,
            ecosystem=self.ecosystem,
            parser_name=self.parser_name,
            parser_version=self.parser_version,
            status="success" if dependencies else ("error" if errors else "success"),
            errors=errors,
            skipped_items=skipped_items,
            metadata={"lockfileVersion": lock_version},
        )

    def _parse_v1_dependencies(
        self,
        deps_dict: Dict[str, Any],
        manifest_path: str,
        is_root: bool,
        dependencies: List[DiscoveredDependency],
        skipped_items: int,
    ) -> None:
        for raw_name, pkg_info in deps_dict.items():
            if not isinstance(pkg_info, dict):
                skipped_items += 1
                continue

            raw_ver = pkg_info.get("version")
            if not raw_ver or not isinstance(raw_ver, str):
                skipped_items += 1
                continue

            is_dev = bool(pkg_info.get("dev", False))
            is_direct = is_root
            dep_type = "transitive" if not is_root else ("dev" if is_dev else "direct")

            dependencies.append(
                DiscoveredDependency(
                    package_name=normalize_npm_name(raw_name),
                    original_package_name=raw_name,
                    ecosystem=self.ecosystem,
                    manifest_path=manifest_path,
                    lockfile_path=manifest_path,
                    version_constraint=None,
                    resolved_version=raw_ver.strip(),
                    dependency_type=dep_type,
                    is_direct=is_direct,
                    scope="development" if is_dev else "production",
                    parser_name=self.parser_name,
                    parser_version=self.parser_version,
                    status="resolved",
                    metadata={
                        "resolved_url": pkg_info.get("resolved"),
                        "integrity": pkg_info.get("integrity"),
                    },
                )
            )

            # Recurse for nested dependencies (transitive)
            nested = pkg_info.get("dependencies")
            if isinstance(nested, dict):
                self._parse_v1_dependencies(
                    deps_dict=nested,
                    manifest_path=manifest_path,
                    is_root=False,
                    dependencies=dependencies,
                    skipped_items=skipped_items,
                )
