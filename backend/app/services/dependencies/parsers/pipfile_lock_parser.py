"""Deterministic parser for Pipfile.lock files."""

import json
import os
from typing import Dict, List, Optional

from backend.app.services.dependencies.parsers.base import (
    BaseDependencyParser,
    DiscoveredDependency,
    ParserResult,
    normalize_pypi_name,
)

MAX_PIPFILE_LOCK_BYTES = 10 * 1024 * 1024  # 10 MB


class PipfileLockParser(BaseDependencyParser):
    """Parses Pipfile.lock files to extract exact resolved dependency versions."""

    parser_name = "python-pipfile-lock"
    parser_version = "1.0.0"
    ecosystem = "pypi"

    def can_parse(self, file_path: str) -> bool:
        norm = file_path.replace("\\", "/").lower()
        return os.path.basename(norm) == "pipfile.lock"

    def parse(
        self,
        file_path: str,
        content: str,
        all_files_content: Optional[Dict[str, str]] = None,
    ) -> ParserResult:
        norm_path = file_path.replace("\\", "/")

        if len(content.encode("utf-8")) > MAX_PIPFILE_LOCK_BYTES:
            return ParserResult(
                dependencies=[],
                manifest_path=norm_path,
                ecosystem=self.ecosystem,
                parser_name=self.parser_name,
                parser_version=self.parser_version,
                status="error",
                errors=[f"File size exceeds limit ({MAX_PIPFILE_LOCK_BYTES} bytes)"],
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
                errors=[f"Invalid Pipfile.lock JSON: {exc}"],
            )

        dependencies: List[DiscoveredDependency] = []
        errors: List[str] = []
        skipped_items = 0

        # Sections: 'default' and 'develop'
        for section_name, dep_type in [("default", "direct"), ("develop", "dev")]:
            sec = data.get(section_name, {})
            if isinstance(sec, dict):
                for pkg_name, pkg_info in sec.items():
                    if not isinstance(pkg_info, dict):
                        skipped_items += 1
                        continue

                    raw_ver = pkg_info.get("version", "")
                    clean_ver = raw_ver.lstrip("=").strip() if isinstance(raw_ver, str) else ""

                    dependencies.append(
                        DiscoveredDependency(
                            package_name=normalize_pypi_name(pkg_name),
                            original_package_name=pkg_name,
                            ecosystem=self.ecosystem,
                            manifest_path=norm_path,
                            lockfile_path=norm_path,
                            version_constraint=raw_ver if raw_ver else None,
                            resolved_version=clean_ver if clean_ver else None,
                            dependency_type=dep_type,
                            is_direct=True,
                            scope=section_name,
                            parser_name=self.parser_name,
                            parser_version=self.parser_version,
                            status="resolved" if clean_ver else "unresolved",
                            metadata={"hashes": pkg_info.get("hashes", [])},
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
