"""Deterministic parser for Node.js package.json files."""

import json
import os
import re
from typing import Dict, List, Optional

from backend.app.services.dependencies.parsers.base import (
    BaseDependencyParser,
    DiscoveredDependency,
    ParserResult,
    normalize_npm_name,
)

MAX_PACKAGE_JSON_BYTES = 2 * 1024 * 1024  # 2 MB


class PackageJsonParser(BaseDependencyParser):
    """Parses package.json to extract declared version constraints."""

    parser_name = "npm-package-json"
    parser_version = "1.0.0"
    ecosystem = "npm"

    def can_parse(self, file_path: str) -> bool:
        norm = file_path.replace("\\", "/").lower()
        return os.path.basename(norm) == "package.json"

    def parse(
        self,
        file_path: str,
        content: str,
        all_files_content: Optional[Dict[str, str]] = None,
    ) -> ParserResult:
        norm_path = file_path.replace("\\", "/")

        if len(content.encode("utf-8")) > MAX_PACKAGE_JSON_BYTES:
            return ParserResult(
                dependencies=[],
                manifest_path=norm_path,
                ecosystem=self.ecosystem,
                parser_name=self.parser_name,
                parser_version=self.parser_version,
                status="error",
                errors=[f"File size exceeds maximum limit ({MAX_PACKAGE_JSON_BYTES} bytes)"],
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
                errors=[f"Invalid package.json JSON: {exc}"],
            )

        if not isinstance(data, dict):
            return ParserResult(
                dependencies=[],
                manifest_path=norm_path,
                ecosystem=self.ecosystem,
                parser_name=self.parser_name,
                parser_version=self.parser_version,
                status="error",
                errors=["Root of package.json must be a JSON object"],
            )

        # Build line number lookup map for keys
        line_lookup: Dict[str, int] = {}
        for line_idx, line in enumerate(content.splitlines(), 1):
            match = re.search(r'"([^"]+)"\s*:', line)
            if match:
                k = match.group(1)
                if k not in line_lookup:
                    line_lookup[k] = line_idx

        dependencies: List[DiscoveredDependency] = []
        errors: List[str] = []
        skipped_items = 0

        dependency_sections = [
            ("dependencies", "direct", "production"),
            ("devDependencies", "dev", "development"),
            ("optionalDependencies", "optional", "optional"),
            ("peerDependencies", "peer", "peer"),
        ]

        for sec_key, dep_type, scope in dependency_sections:
            sec_dict = data.get(sec_key)
            if not isinstance(sec_dict, dict):
                continue

            for raw_name, raw_version in sec_dict.items():
                if not isinstance(raw_name, str) or not isinstance(raw_version, str):
                    skipped_items += 1
                    continue

                norm_name = normalize_npm_name(raw_name)
                line_no = line_lookup.get(raw_name)

                # Never invent a resolved version from a package.json range!
                # Even if raw_version is exact like "1.2.3", in package.json it's a declared constraint,
                # not verified installation unless confirmed by lockfile.
                # However, if it has no operator/prefix (=, ^, ~, >, <, *), record clean constraint.
                dependencies.append(
                    DiscoveredDependency(
                        package_name=norm_name,
                        original_package_name=raw_name,
                        ecosystem=self.ecosystem,
                        manifest_path=norm_path,
                        version_constraint=raw_version.strip(),
                        resolved_version=None,  # Never fabricate resolved version from package.json alone
                        dependency_type=dep_type,
                        is_direct=True,
                        scope=scope,
                        parser_name=self.parser_name,
                        parser_version=self.parser_version,
                        status="unresolved",
                        metadata={"section": sec_key},
                        line_number=line_no,
                    )
                )

        return ParserResult(
            dependencies=dependencies,
            manifest_path=norm_path,
            ecosystem=self.ecosystem,
            parser_name=self.parser_name,
            parser_version=self.parser_version,
            status="success",
            errors=errors,
            skipped_items=skipped_items,
        )
