"""Deterministic parser for Yarn lockfiles (Yarn v1 Classic and v2+ Berry detection)."""

import os
import re
from typing import Dict, List, Optional

from backend.app.services.dependencies.parsers.base import (
    BaseDependencyParser,
    DiscoveredDependency,
    ParserResult,
    normalize_npm_name,
)

MAX_YARN_LOCK_BYTES = 10 * 1024 * 1024  # 10 MB


class YarnLockParser(BaseDependencyParser):
    """Parses Yarn Classic v1 lockfiles and flags unsupported Berry formats explicitly."""

    parser_name = "npm-yarn-lock"
    parser_version = "1.0.0"
    ecosystem = "npm"

    def can_parse(self, file_path: str) -> bool:
        norm = file_path.replace("\\", "/").lower()
        return os.path.basename(norm) == "yarn.lock"

    def parse(
        self,
        file_path: str,
        content: str,
        all_files_content: Optional[Dict[str, str]] = None,
    ) -> ParserResult:
        norm_path = file_path.replace("\\", "/")

        if len(content.encode("utf-8")) > MAX_YARN_LOCK_BYTES:
            return ParserResult(
                dependencies=[],
                manifest_path=norm_path,
                ecosystem=self.ecosystem,
                parser_name=self.parser_name,
                parser_version=self.parser_version,
                status="error",
                errors=[f"File size exceeds limit ({MAX_YARN_LOCK_BYTES} bytes)"],
            )

        # Detect Yarn Berry (v2+)
        if "__metadata" in content or re.search(r"^version:\s+[2-8]", content, re.MULTILINE):
            return ParserResult(
                dependencies=[],
                manifest_path=norm_path,
                ecosystem=self.ecosystem,
                parser_name=self.parser_name,
                parser_version=self.parser_version,
                status="unsupported",
                errors=["Yarn v2+ (Berry) lockfile format is not currently supported; Yarn v1 Classic is required."],
            )

        dependencies: List[DiscoveredDependency] = []
        errors: List[str] = []
        skipped_items = 0

        # Yarn v1 parser:
        # Blocks are separated by blank lines.
        # Header has one or more specifiers separated by commas:
        # "foo@^1.0.0", foo@~1.2.0:
        #   version "1.2.3"
        #   resolved "https://..."
        blocks = content.split("\n\n")

        for block in blocks:
            lines = [ln.strip() for ln in block.splitlines() if ln.strip() and not ln.strip().startswith("#")]
            if not lines:
                continue

            header_line = lines[0]
            if not header_line.endswith(":"):
                continue

            specifiers_part = header_line[:-1]
            raw_specifiers = [s.strip().strip('"').strip("'") for s in specifiers_part.split(",")]

            version: Optional[str] = None
            resolved_url: Optional[str] = None

            for line in lines[1:]:
                if line.startswith("version "):
                    version = line.split("version ", 1)[1].strip().strip('"').strip("'")
                elif line.startswith("resolved "):
                    resolved_url = line.split("resolved ", 1)[1].strip().strip('"').strip("'")

            if not version:
                skipped_items += 1
                continue

            # Extract package name from first specifier
            first_spec = raw_specifiers[0] if raw_specifiers else ""
            pkg_name = ""
            if first_spec.startswith("@"):
                at_idx = first_spec.find("@", 1)
                pkg_name = first_spec[:at_idx] if at_idx != -1 else first_spec
            elif "@" in first_spec:
                pkg_name = first_spec.split("@", 1)[0]
            else:
                pkg_name = first_spec

            if not pkg_name:
                skipped_items += 1
                continue

            norm_name = normalize_npm_name(pkg_name)

            dependencies.append(
                DiscoveredDependency(
                    package_name=norm_name,
                    original_package_name=pkg_name,
                    ecosystem=self.ecosystem,
                    manifest_path=norm_path,
                    lockfile_path=norm_path,
                    version_constraint=None,
                    resolved_version=version,
                    dependency_type="direct",  # Without package.json, assume resolved
                    is_direct=None,
                    scope="production",
                    parser_name=self.parser_name,
                    parser_version=self.parser_version,
                    status="resolved",
                    metadata={
                        "requested_specifiers": raw_specifiers,
                        "resolved_url": resolved_url,
                    },
                )
            )

        return ParserResult(
            dependencies=dependencies,
            manifest_path=norm_path,
            ecosystem=self.ecosystem,
            parser_name=self.parser_name,
            parser_version=self.parser_version,
            status="success" if dependencies else "error",
            errors=errors,
            skipped_items=skipped_items,
        )
