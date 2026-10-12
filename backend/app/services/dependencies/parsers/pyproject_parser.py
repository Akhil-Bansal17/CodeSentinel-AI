"""Deterministic parser for pyproject.toml PEP 621 and Poetry dependency sections."""

import os
import tomllib
from typing import Any, Dict, List, Optional
from packaging.requirements import InvalidRequirement, Requirement

from backend.app.services.dependencies.parsers.base import (
    BaseDependencyParser,
    DiscoveredDependency,
    ParserResult,
    normalize_pypi_name,
)

MAX_PYPROJECT_BYTES = 2 * 1024 * 1024  # 2 MB


class PyprojectTomlParser(BaseDependencyParser):
    """Parses pyproject.toml without executing build backends or imports."""

    parser_name = "python-pyproject-toml"
    parser_version = "1.0.0"
    ecosystem = "pypi"

    def can_parse(self, file_path: str) -> bool:
        norm = file_path.replace("\\", "/").lower()
        return os.path.basename(norm) == "pyproject.toml"

    def parse(
        self,
        file_path: str,
        content: str,
        all_files_content: Optional[Dict[str, str]] = None,
    ) -> ParserResult:
        norm_path = file_path.replace("\\", "/")

        if len(content.encode("utf-8")) > MAX_PYPROJECT_BYTES:
            return ParserResult(
                dependencies=[],
                manifest_path=norm_path,
                ecosystem=self.ecosystem,
                parser_name=self.parser_name,
                parser_version=self.parser_version,
                status="error",
                errors=[f"File size exceeds limit ({MAX_PYPROJECT_BYTES} bytes)"],
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
                errors=[f"TOML parsing failed: {exc}"],
            )

        dependencies: List[DiscoveredDependency] = []
        errors: List[str] = []
        skipped_items = 0

        # 1. Parse PEP 621 [project.dependencies]
        project_sec = data.get("project", {})
        if isinstance(project_sec, dict):
            deps = project_sec.get("dependencies", [])
            if isinstance(deps, list):
                for raw_dep in deps:
                    if not isinstance(raw_dep, str):
                        skipped_items += 1
                        continue
                    try:
                        req = Requirement(raw_dep)
                        norm_name = normalize_pypi_name(req.name)
                        specifiers_str = str(req.specifier) if req.specifier else None
                        resolved_version: Optional[str] = None
                        if req.specifier:
                            specs = list(req.specifier)
                            if len(specs) == 1 and specs[0].operator == "==" and "*" not in specs[0].version:
                                resolved_version = specs[0].version

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
                                scope=str(req.marker) if req.marker else None,
                                parser_name=self.parser_name,
                                parser_version=self.parser_version,
                                status="resolved" if resolved_version else "unresolved",
                                metadata={"section": "project.dependencies"},
                            )
                        )
                    except InvalidRequirement as req_err:
                        errors.append(f"Invalid PEP 621 requirement '{raw_dep}': {req_err}")
                        skipped_items += 1

            # Optional dependencies (extras) [project.optional-dependencies]
            opt_deps = project_sec.get("optional-dependencies", {})
            if isinstance(opt_deps, dict):
                for group_name, group_list in opt_deps.items():
                    if not isinstance(group_list, list):
                        continue
                    for raw_dep in group_list:
                        if not isinstance(raw_dep, str):
                            skipped_items += 1
                            continue
                        try:
                            req = Requirement(raw_dep)
                            norm_name = normalize_pypi_name(req.name)
                            specifiers_str = str(req.specifier) if req.specifier else None
                            resolved_version: Optional[str] = None
                            if req.specifier:
                                specs = list(req.specifier)
                                if len(specs) == 1 and specs[0].operator == "==" and "*" not in specs[0].version:
                                    resolved_version = specs[0].version

                            dependencies.append(
                                DiscoveredDependency(
                                    package_name=norm_name,
                                    original_package_name=req.name,
                                    ecosystem=self.ecosystem,
                                    manifest_path=norm_path,
                                    version_constraint=specifiers_str,
                                    resolved_version=resolved_version,
                                    dependency_type="optional",
                                    is_direct=True,
                                    scope=f"extra:{group_name}",
                                    parser_name=self.parser_name,
                                    parser_version=self.parser_version,
                                    status="resolved" if resolved_version else "unresolved",
                                    metadata={"section": f"project.optional-dependencies.{group_name}"},
                                )
                            )
                        except InvalidRequirement as req_err:
                            errors.append(f"Invalid optional requirement '{raw_dep}': {req_err}")
                            skipped_items += 1

        # 2. Parse Poetry [tool.poetry.dependencies]
        tool_sec = data.get("tool", {})
        if isinstance(tool_sec, dict):
            poetry_sec = tool_sec.get("poetry", {})
            if isinstance(poetry_sec, dict):
                # Standard poetry dependencies
                poetry_deps = poetry_sec.get("dependencies", {})
                if isinstance(poetry_deps, dict):
                    self._parse_poetry_dep_dict(
                        dep_dict=poetry_deps,
                        manifest_path=norm_path,
                        dep_type="direct",
                        scope="main",
                        dependencies=dependencies,
                        skipped_items=skipped_items,
                    )

                # Dev dependencies
                dev_deps = poetry_sec.get("dev-dependencies", {})
                if isinstance(dev_deps, dict):
                    self._parse_poetry_dep_dict(
                        dep_dict=dev_deps,
                        manifest_path=norm_path,
                        dep_type="dev",
                        scope="dev",
                        dependencies=dependencies,
                        skipped_items=skipped_items,
                    )

                # Group dependencies [tool.poetry.group.<name>.dependencies]
                groups = poetry_sec.get("group", {})
                if isinstance(groups, dict):
                    for grp_name, grp_val in groups.items():
                        if isinstance(grp_val, dict):
                            grp_deps = grp_val.get("dependencies", {})
                            if isinstance(grp_deps, dict):
                                self._parse_poetry_dep_dict(
                                    dep_dict=grp_deps,
                                    manifest_path=norm_path,
                                    dep_type="dev" if grp_name == "dev" else "optional",
                                    scope=f"group:{grp_name}",
                                    dependencies=dependencies,
                                    skipped_items=skipped_items,
                                )

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

    def _parse_poetry_dep_dict(
        self,
        dep_dict: Dict[str, Any],
        manifest_path: str,
        dep_type: str,
        scope: str,
        dependencies: List[DiscoveredDependency],
        skipped_items: int,
    ) -> None:
        for pkg_name, spec in dep_dict.items():
            if pkg_name.lower() == "python":
                # python version specifier is an environment requirement, not a package
                continue

            constraint_str: Optional[str] = None
            resolved_version: Optional[str] = None
            is_optional = False

            if isinstance(spec, str):
                constraint_str = spec
                if spec.startswith("==") and "*" not in spec:
                    resolved_version = spec[2:].strip()
            elif isinstance(spec, dict):
                ver = spec.get("version")
                if isinstance(ver, str):
                    constraint_str = ver
                    if ver.startswith("==") and "*" not in ver:
                        resolved_version = ver[2:].strip()
                is_optional = bool(spec.get("optional", False))
            else:
                skipped_items += 1
                continue

            dependencies.append(
                DiscoveredDependency(
                    package_name=normalize_pypi_name(pkg_name),
                    original_package_name=pkg_name,
                    ecosystem=self.ecosystem,
                    manifest_path=manifest_path,
                    version_constraint=constraint_str,
                    resolved_version=resolved_version,
                    dependency_type="optional" if is_optional else dep_type,
                    is_direct=True,
                    scope=scope,
                    parser_name=self.parser_name,
                    parser_version=self.parser_version,
                    status="resolved" if resolved_version else "unresolved",
                    metadata={"poetry": True},
                )
            )
