"""Deterministic parser for Python requirements.txt files."""

import os
import re
from typing import Dict, List, Optional, Set
from packaging.requirements import InvalidRequirement, Requirement

from backend.app.services.dependencies.parsers.base import (
    BaseDependencyParser,
    DiscoveredDependency,
    ParserResult,
    normalize_pypi_name,
)

MAX_REQUIREMENTS_BYTES = 2 * 1024 * 1024  # 2 MB
MAX_RECURSION_DEPTH = 5


class RequirementsTxtParser(BaseDependencyParser):
    """Parses Python requirements.txt files without executing code or external network access."""

    parser_name = "python-requirements-txt"
    parser_version = "1.0.0"
    ecosystem = "pypi"

    def can_parse(self, file_path: str) -> bool:
        norm = file_path.replace("\\", "/").lower()
        base = os.path.basename(norm)
        return base == "requirements.txt" or (base.startswith("requirements") and base.endswith(".txt"))

    def parse(
        self,
        file_path: str,
        content: str,
        all_files_content: Optional[Dict[str, str]] = None,
        depth: int = 0,
        seen_paths: Optional[Set[str]] = None,
    ) -> ParserResult:
        if seen_paths is None:
            seen_paths = set()

        norm_path = file_path.replace("\\", "/")
        if norm_path in seen_paths:
            return ParserResult(
                dependencies=[],
                manifest_path=norm_path,
                ecosystem=self.ecosystem,
                parser_name=self.parser_name,
                parser_version=self.parser_version,
                status="partial",
                errors=[f"Cyclic requirement inclusion detected: {norm_path}"],
            )
        seen_paths.add(norm_path)

        if len(content.encode("utf-8")) > MAX_REQUIREMENTS_BYTES:
            return ParserResult(
                dependencies=[],
                manifest_path=norm_path,
                ecosystem=self.ecosystem,
                parser_name=self.parser_name,
                parser_version=self.parser_version,
                status="error",
                errors=[f"File size exceeds maximum limit ({MAX_REQUIREMENTS_BYTES} bytes)"],
            )

        dependencies: List[DiscoveredDependency] = []
        errors: List[str] = []
        skipped_items = 0

        # Handle line continuations (backslash at end of line)
        raw_lines = content.splitlines()
        consolidated_lines: List[tuple[int, str]] = []  # (start_line_no, line_text)
        current_line = ""
        current_start = 1

        for idx, line in enumerate(raw_lines, 1):
            stripped = line.strip()
            if not current_line:
                current_start = idx

            if stripped.endswith("\\"):
                current_line += " " + stripped[:-1].strip()
            else:
                current_line += " " + stripped
                consolidated_lines.append((current_start, current_line.strip()))
                current_line = ""

        if current_line:
            consolidated_lines.append((current_start, current_line.strip()))

        dir_name = os.path.dirname(norm_path)

        for line_no, raw_line in consolidated_lines:
            line = raw_line.strip()
            if not line or line.startswith("#"):
                continue

            # Check for inclusion flags (-r or --requirement)
            include_match = re.match(r"^(-r|--requirement)\s+([^\s#]+)", line)
            if include_match:
                if depth >= MAX_RECURSION_DEPTH:
                    errors.append(f"Line {line_no}: Maximum inclusion depth ({MAX_RECURSION_DEPTH}) exceeded")
                    skipped_items += 1
                    continue

                included_rel = include_match.group(2).strip()
                # Resolve relative path safely
                if dir_name:
                    target_rel = os.path.normpath(os.path.join(dir_name, included_rel)).replace("\\", "/")
                else:
                    target_rel = os.path.normpath(included_rel).replace("\\", "/")

                if all_files_content and target_rel in all_files_content:
                    sub_res = self.parse(
                        target_rel,
                        all_files_content[target_rel],
                        all_files_content=all_files_content,
                        depth=depth + 1,
                        seen_paths=seen_paths,
                    )
                    dependencies.extend(sub_res.dependencies)
                    errors.extend(sub_res.errors)
                    skipped_items += sub_res.skipped_items
                else:
                    skipped_items += 1
                    # Notice we record included file reference note
                    dependencies.append(
                        DiscoveredDependency(
                            package_name=normalize_pypi_name(included_rel),
                            original_package_name=included_rel,
                            ecosystem=self.ecosystem,
                            manifest_path=norm_path,
                            dependency_type="included_manifest",
                            status="unresolved_inclusion",
                            line_number=line_no,
                            metadata={"included_path": target_rel},
                        )
                    )
                continue

            # Ignore index or build options
            if re.match(r"^(-i|--index-url|--extra-index-url|-f|--find-links|--trusted-host|--no-index)", line):
                skipped_items += 1
                continue

            # Handle editable flags (-e or --editable)
            editable_match = re.match(r"^(-e|--editable)\s+(\S+)", line)
            if editable_match:
                target_editable = editable_match.group(2).strip()
                # Extract package name if egg=name is present
                egg_match = re.search(r"#egg=([a-zA-Z0-9_\-\.]+)", target_editable)
                pkg_name = egg_match.group(1) if egg_match else target_editable
                dependencies.append(
                    DiscoveredDependency(
                        package_name=normalize_pypi_name(pkg_name),
                        original_package_name=pkg_name,
                        ecosystem=self.ecosystem,
                        manifest_path=norm_path,
                        dependency_type="direct",
                        parser_name=self.parser_name,
                        parser_version=self.parser_version,
                        status="unsupported_editable",
                        line_number=line_no,
                        metadata={"editable_target": target_editable},
                    )
                )
                continue

            # Strip inline comments (respecting quoted parts if any)
            clean_spec = line
            if " #" in clean_spec:
                clean_spec = clean_spec.split(" #", 1)[0].strip()

            # Direct VCS / URL dependency without standard PEP 508 format
            if any(prefix in clean_spec for prefix in ["git+", "http://", "https://", "svn+", "hg+"]):
                egg_match = re.search(r"#egg=([a-zA-Z0-9_\-\.]+)", clean_spec)
                pkg_name = egg_match.group(1) if egg_match else clean_spec.split("/")[-1].split(".")[0]
                dependencies.append(
                    DiscoveredDependency(
                        package_name=normalize_pypi_name(pkg_name),
                        original_package_name=pkg_name,
                        ecosystem=self.ecosystem,
                        manifest_path=norm_path,
                        dependency_type="direct",
                        status="unresolved_url",
                        line_number=line_no,
                        metadata={"raw_url": clean_spec},
                    )
                )
                continue

            try:
                req = Requirement(clean_spec)
                norm_name = normalize_pypi_name(req.name)
                specifiers_str = str(req.specifier) if req.specifier else None
                resolved_version: Optional[str] = None

                # Exact pin: ==1.2.3 without wildcards or multiple specs
                if req.specifier:
                    specs = list(req.specifier)
                    if len(specs) == 1 and specs[0].operator == "==" and "*" not in specs[0].version:
                        resolved_version = specs[0].version

                marker_str = str(req.marker) if req.marker else None
                extras_list = list(req.extras) if req.extras else []

                dependencies.append(
                    DiscoveredDependency(
                        package_name=norm_name,
                        original_package_name=req.name,
                        ecosystem=self.ecosystem,
                        manifest_path=norm_path,
                        version_constraint=specifiers_str,
                        resolved_version=resolved_version,
                        dependency_type="direct",
                        is_direct=True,
                        scope=marker_str,
                        parser_name=self.parser_name,
                        parser_version=self.parser_version,
                        status="resolved" if resolved_version else "unresolved",
                        metadata={"extras": extras_list} if extras_list else {},
                        line_number=line_no,
                    )
                )
            except InvalidRequirement as exc:
                errors.append(f"Line {line_no}: Invalid requirement '{clean_spec}': {exc}")
                skipped_items += 1
            except Exception as exc:
                errors.append(f"Line {line_no}: Failed to parse '{clean_spec}': {exc}")
                skipped_items += 1

        status = "success"
        if errors and not dependencies:
            status = "error"
        elif errors:
            status = "partial"

        return ParserResult(
            dependencies=dependencies,
            manifest_path=norm_path,
            ecosystem=self.ecosystem,
            parser_name=self.parser_name,
            parser_version=self.parser_version,
            status=status,
            errors=errors,
            skipped_items=skipped_items,
        )
