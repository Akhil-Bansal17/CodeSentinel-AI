"""Deterministic Dependency Intelligence and SCA Discovery Service for CodeSentinel AI."""

from datetime import datetime, timezone
import hashlib
from typing import Any, Dict, List, Optional, Set, Tuple
import uuid

from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.core.exceptions import (
    AppException,
    ConflictError,
    NotFoundError,
    ValidationError,
)
from backend.app.core.logging import logger
from backend.app.models.base import (
    DependencyRun,
    DependencyVulnerability,
    Repository,
    RepositoryDependency,
    RepositoryFile,
    RepositorySnapshot,
)
from backend.app.services.analysis.source_provider import SourceInputProvider
from backend.app.services.dependencies.advisory_service import AdvisoryService
from backend.app.services.dependencies.matcher import default_version_coordinator
from backend.app.services.dependencies.parsers import (
    DiscoveredDependency,
    default_parser_registry,
    normalize_package_name,
)

SUPPORTED_MANIFEST_NAMES = {
    "requirements.txt",
    "pyproject.toml",
    "poetry.lock",
    "pipfile.lock",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
}


class DependencyDiscoveryService:
    """Orchestrates deterministic manifest discovery, version resolution, and vulnerability matching."""

    def __init__(self, db: Session):
        self.db = db
        self.advisory_service = AdvisoryService(db)

    def get_run_by_id(self, run_id: str) -> Optional[DependencyRun]:
        """Fetch a DependencyRun by primary key."""
        stmt = select(DependencyRun).where(DependencyRun.id == run_id)
        return self.db.scalars(stmt).first()

    def list_runs_for_repository(
        self,
        repository_id: str,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[DependencyRun], int]:
        """List historical dependency runs for a repository."""
        repo = self.db.scalar(select(Repository).where(Repository.id == repository_id))
        if not repo:
            raise NotFoundError("Repository", repository_id)

        count_stmt = select(func.count(DependencyRun.id)).where(DependencyRun.repository_id == repository_id)
        total = self.db.scalar(count_stmt) or 0

        offset = (page - 1) * page_size
        stmt = (
            select(DependencyRun)
            .where(DependencyRun.repository_id == repository_id)
            .order_by(desc(DependencyRun.started_at))
            .offset(offset)
            .limit(page_size)
        )
        runs = self.db.scalars(stmt).all()
        return list(runs), total

    def list_dependencies_for_run(
        self,
        run_id: str,
        ecosystem: Optional[str] = None,
        package_name: Optional[str] = None,
        dependency_type: Optional[str] = None,
        is_direct: Optional[bool] = None,
        status_filter: Optional[str] = None,
        page: int = 1,
        page_size: int = 50,
    ) -> Tuple[List[RepositoryDependency], int]:
        """List discovered dependencies with filtering and deterministic ordering."""
        run = self.get_run_by_id(run_id)
        if not run:
            raise NotFoundError("DependencyRun", run_id)

        filters = [RepositoryDependency.dependency_run_id == run_id]
        if ecosystem:
            filters.append(func.lower(RepositoryDependency.ecosystem) == ecosystem.strip().lower())
        if package_name:
            clean_pkg = f"%{package_name.strip().lower()}%"
            filters.append(func.lower(RepositoryDependency.package_name).like(clean_pkg))
        if dependency_type:
            filters.append(func.lower(RepositoryDependency.dependency_type) == dependency_type.strip().lower())
        if is_direct is not None:
            filters.append(RepositoryDependency.is_direct == is_direct)
        if status_filter:
            filters.append(func.lower(RepositoryDependency.status) == status_filter.strip().lower())

        count_stmt = select(func.count(RepositoryDependency.id)).where(*filters)
        total = self.db.scalar(count_stmt) or 0

        offset = (page - 1) * page_size
        stmt = (
            select(RepositoryDependency)
            .where(*filters)
            .order_by(
                RepositoryDependency.ecosystem.asc(),
                RepositoryDependency.package_name.asc(),
                RepositoryDependency.manifest_path.asc(),
            )
            .offset(offset)
            .limit(page_size)
        )
        deps = self.db.scalars(stmt).all()
        return list(deps), total

    def list_vulnerabilities_for_run(
        self,
        run_id: str,
        severity: Optional[str] = None,
        ecosystem: Optional[str] = None,
        package_name: Optional[str] = None,
        advisory_id: Optional[str] = None,
        page: int = 1,
        page_size: int = 50,
    ) -> Tuple[List[DependencyVulnerability], int]:
        """List vulnerability findings with filtering and deterministic ordering."""
        run = self.get_run_by_id(run_id)
        if not run:
            raise NotFoundError("DependencyRun", run_id)

        filters = [DependencyVulnerability.dependency_run_id == run_id]
        if severity:
            filters.append(func.upper(DependencyVulnerability.severity) == severity.strip().upper())
        if ecosystem:
            filters.append(func.lower(DependencyVulnerability.ecosystem) == ecosystem.strip().lower())
        if package_name:
            clean_pkg = f"%{package_name.strip().lower()}%"
            filters.append(func.lower(DependencyVulnerability.package_name).like(clean_pkg))
        if advisory_id:
            filters.append(func.upper(DependencyVulnerability.advisory_id) == advisory_id.strip().upper())

        count_stmt = select(func.count(DependencyVulnerability.id)).where(*filters)
        total = self.db.scalar(count_stmt) or 0

        offset = (page - 1) * page_size
        stmt = (
            select(DependencyVulnerability)
            .where(*filters)
            .order_by(
                DependencyVulnerability.severity.asc(),
                DependencyVulnerability.package_name.asc(),
                DependencyVulnerability.advisory_id.asc(),
            )
            .offset(offset)
            .limit(page_size)
        )
        vulns = self.db.scalars(stmt).all()
        return list(vulns), total

    async def execute_dependency_run(
        self,
        repository_id: str,
        snapshot_id: Optional[str] = None,
        config: Optional[Dict[str, Any]] = None,
    ) -> DependencyRun:
        """Execute complete deterministic dependency discovery and vulnerability correlation."""
        # 1. Validate repository
        repo = self.db.scalar(select(Repository).where(Repository.id == repository_id))
        if not repo:
            raise NotFoundError("Repository", repository_id)

        # 2. Validate snapshot
        if snapshot_id:
            stmt = select(RepositorySnapshot).where(
                RepositorySnapshot.id == snapshot_id,
                RepositorySnapshot.repository_id == repository_id,
            )
            snapshot = self.db.scalars(stmt).first()
            if not snapshot:
                raise NotFoundError("Snapshot", snapshot_id)
        else:
            stmt = (
                select(RepositorySnapshot)
                .where(
                    RepositorySnapshot.repository_id == repository_id,
                    RepositorySnapshot.status == "completed",
                )
                .order_by(desc(RepositorySnapshot.started_at))
                .limit(1)
            )
            snapshot = self.db.scalars(stmt).first()

        if not snapshot:
            raise ValidationError(
                "No completed snapshot is available for dependency analysis.",
                details={"repository_id": repository_id},
            )

        if snapshot.status != "completed":
            raise ValidationError(
                f"Cannot analyze snapshot with status '{snapshot.status}'. Snapshot must be completed.",
                details={"snapshot_id": snapshot.id, "status": snapshot.status},
            )

        now = datetime.now(timezone.utc)

        # 3. Check for concurrent active runs
        stmt = (
            select(DependencyRun)
            .where(
                DependencyRun.repository_id == repository_id,
                DependencyRun.snapshot_id == snapshot.id,
                DependencyRun.status == "running",
            )
            .order_by(desc(DependencyRun.started_at))
            .limit(1)
        )
        active_run = self.db.scalars(stmt).first()
        if active_run:
            started = active_run.started_at
            if started.tzinfo is None:
                started = started.replace(tzinfo=timezone.utc)
            elapsed = (now - started).total_seconds()
            if elapsed < 120:
                raise ConflictError(
                    "A dependency analysis run is already actively running for this repository snapshot.",
                    details={"run_id": active_run.id, "elapsed_seconds": elapsed},
                )

        # 4. Check advisory dataset status (auto-seed if empty)
        self.advisory_service.load_initial_dataset_if_empty()
        dataset_status = self.advisory_service.get_dataset_status()
        active_ds_version = dataset_status.get("dataset_version")
        is_advisory_available = dataset_status.get("status") in {"POPULATED", "EMPTY_VALID"}

        # 5. Create DependencyRun in running status
        run = DependencyRun(
            id=str(uuid.uuid4()),
            repository_id=repo.id,
            snapshot_id=snapshot.id,
            status="running",
            started_at=now,
            advisory_dataset_version=active_ds_version,
            parser_version="1.0.0",
            matching_engine_version="1.0.0",
            dependencies_discovered=0,
            dependencies_resolved=0,
            dependencies_unresolved=0,
            vulnerabilities_count=0,
            manifest_files_count=0,
            summary_json={},
        )
        self.db.add(run)
        self.db.commit()
        self.db.refresh(run)

        # 6. Discover manifest and lockfile candidate files
        file_stmt = (
            select(RepositoryFile)
            .where(
                RepositoryFile.snapshot_id == snapshot.id,
                RepositoryFile.is_binary == False,  # noqa: E712
            )
            .order_by(RepositoryFile.relative_path.asc())
        )
        candidate_files = list(self.db.scalars(file_stmt).all())

        manifest_files: List[RepositoryFile] = []
        for f in candidate_files:
            b_name = f.file_name.lower()
            if b_name in SUPPORTED_MANIFEST_NAMES or (b_name.startswith("requirements") and b_name.endswith(".txt")):
                manifest_files.append(f)

        run.manifest_files_count = len(manifest_files)

        discovered_by_manifest: Dict[str, List[DiscoveredDependency]] = {}
        all_files_content_map: Dict[str, str] = {}
        skipped_manifests: List[str] = []

        local_path_override = config.get("local_path") if config else None

        try:
            # 7. Safe source file reading
            async with SourceInputProvider(repo, snapshot, local_path_override=local_path_override) as source_provider:
                # Pre-read manifest file contents safely
                for f_rec in manifest_files:
                    source_item = source_provider.read_file_content(f_rec)
                    if source_item.is_available and source_item.content is not None:
                        all_files_content_map[f_rec.relative_path.replace("\\", "/")] = source_item.content
                    else:
                        skipped_manifests.append(f_rec.relative_path)

                # Parse each manifest file
                for f_rec in manifest_files:
                    norm_rel = f_rec.relative_path.replace("\\", "/")
                    content = all_files_content_map.get(norm_rel)
                    if content is None:
                        continue

                    parser = default_parser_registry.get_parser_for_file(norm_rel)
                    if not parser:
                        skipped_manifests.append(norm_rel)
                        continue

                    res = parser.parse(norm_rel, content, all_files_content=all_files_content_map)
                    discovered_by_manifest[norm_rel] = res.dependencies

            # 8. Reconcile manifest declarations with lockfiles
            reconciled_dependencies = self._reconcile_dependencies(
                discovered_by_manifest=discovered_by_manifest,
                run_id=run.id,
                repository_id=repo.id,
                snapshot_id=snapshot.id,
            )

            # 9. Correlate with vulnerability advisories
            persisted_vulnerabilities: List[DependencyVulnerability] = []
            severity_counts: Dict[str, int] = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0, "INFO": 0, "UNKNOWN": 0}
            ecosystem_counts: Dict[str, int] = {}
            resolved_count = 0
            unresolved_count = 0
            direct_count = 0
            transitive_count = 0

            # Gather packages by ecosystem for batch advisory query
            packages_by_eco: Dict[str, Set[str]] = {}
            for dep in reconciled_dependencies:
                packages_by_eco.setdefault(dep.ecosystem, set()).add(dep.package_name)
                ecosystem_counts[dep.ecosystem] = ecosystem_counts.get(dep.ecosystem, 0) + 1
                if dep.resolved_version:
                    resolved_count += 1
                else:
                    unresolved_count += 1
                if dep.is_direct:
                    direct_count += 1
                else:
                    transitive_count += 1

            # Fetch active advisories if dataset available
            advisories_by_pkg: Dict[Tuple[str, str], List[Any]] = {}
            if is_advisory_available:
                for eco, pkg_set in packages_by_eco.items():
                    adv_map = self.advisory_service.find_advisories_for_packages(eco, list(pkg_set))
                    for p_name, adv_list in adv_map.items():
                        advisories_by_pkg[(eco, p_name)] = adv_list

            # Match vulnerabilities
            for dep in reconciled_dependencies:
                if not dep.resolved_version:
                    continue

                advisories = advisories_by_pkg.get((dep.ecosystem, dep.package_name), [])
                for adv in advisories:
                    match_res = default_version_coordinator.evaluate(
                        ecosystem=dep.ecosystem,
                        resolved_version=dep.resolved_version,
                        affected_ranges=adv.affected_ranges_json,
                        fixed_versions=adv.fixed_versions_json,
                    )

                    if match_res.is_matched:
                        # Build deterministic fingerprint
                        fp_material = f"{run.id}:{adv.advisory_id}:{dep.ecosystem}:{dep.package_name}:{dep.resolved_version}:{dep.manifest_path}"
                        fingerprint = hashlib.sha256(fp_material.encode("utf-8")).hexdigest()

                        evidence = (
                            f"Package '{dep.package_name}' resolved at version {dep.resolved_version} "
                            f"matches advisory affected range '{match_res.matched_range}' for {adv.advisory_id}: {adv.summary}"
                        )

                        vuln_model = DependencyVulnerability(
                            id=str(uuid.uuid4()),
                            dependency_run_id=run.id,
                            dependency_id=dep.id,
                            repository_id=repo.id,
                            snapshot_id=snapshot.id,
                            advisory_id=adv.advisory_id,
                            ecosystem=dep.ecosystem,
                            package_name=dep.package_name,
                            resolved_version=dep.resolved_version,
                            affected_range=match_res.matched_range or "affected",
                            severity=adv.severity,
                            severity_source=adv.severity_source,
                            cvss_score=adv.cvss_score,
                            remediation_version=match_res.remediation_version,
                            manifest_path=dep.manifest_path,
                            line_number=dep.metadata_json.get("line_number"),
                            evidence_summary=evidence,
                            fingerprint=fingerprint,
                            cve_ids=adv.cve_ids,
                            advisory_dataset_version=active_ds_version,
                            metadata_json={
                                "advisory_summary": adv.summary,
                                "source_url": adv.source_url,
                                "lockfile_path": dep.lockfile_path,
                            },
                        )
                        persisted_vulnerabilities.append(vuln_model)

                        sev = adv.severity.upper()
                        severity_counts[sev] = severity_counts.get(sev, 0) + 1

            # 10. Batch persist dependencies and vulnerabilities
            batch_size = 500
            for i in range(0, len(reconciled_dependencies), batch_size):
                self.db.add_all(reconciled_dependencies[i : i + batch_size])
                self.db.flush()

            for i in range(0, len(persisted_vulnerabilities), batch_size):
                self.db.add_all(persisted_vulnerabilities[i : i + batch_size])
                self.db.flush()

            # 11. Finalize run status
            run.completed_at = datetime.now(timezone.utc)
            run.dependencies_discovered = len(reconciled_dependencies)
            run.dependencies_resolved = resolved_count
            run.dependencies_unresolved = unresolved_count
            run.vulnerabilities_count = len(persisted_vulnerabilities)

            final_status = "completed"
            if not is_advisory_available:
                final_status = "completed_with_limitations"
            elif skipped_manifests:
                final_status = "completed_with_limitations"

            run.status = final_status
            run.summary_json = {
                "total_dependencies": len(reconciled_dependencies),
                "resolved_dependencies": resolved_count,
                "unresolved_dependencies": unresolved_count,
                "direct_count": direct_count,
                "transitive_count": transitive_count,
                "vulnerabilities_count": len(persisted_vulnerabilities),
                "severity_distribution": severity_counts,
                "ecosystem_distribution": ecosystem_counts,
                "advisory_dataset_status": dataset_status.get("status"),
                "advisory_dataset_version": active_ds_version,
                "manifest_files": [f.relative_path for f in manifest_files],
                "skipped_manifests": skipped_manifests,
            }

            self.db.commit()
            self.db.refresh(run)

            logger.info(
                "Dependency analysis completed for %s (%s): %d dependencies, %d resolved, %d vulnerabilities",
                repo.name,
                run.id,
                run.dependencies_discovered,
                run.dependencies_resolved,
                run.vulnerabilities_count,
            )
            return run

        except Exception as exc:
            self.db.rollback()
            logger.exception("Dependency analysis run %s failed: %s", run.id, exc)

            run.status = "failed"
            run.completed_at = datetime.now(timezone.utc)
            run.failure_code = getattr(exc, "error_code", "DEPENDENCY_ANALYSIS_FAILED")
            run.failure_reason = str(exc) if isinstance(exc, AppException) else "An unexpected error occurred during dependency analysis."
            self.db.add(run)
            self.db.commit()
            raise

    def _reconcile_dependencies(
        self,
        discovered_by_manifest: Dict[str, List[DiscoveredDependency]],
        run_id: str,
        repository_id: str,
        snapshot_id: str,
    ) -> List[RepositoryDependency]:
        """Correlate manifest declarations with lockfiles deterministically."""
        # Separate declared manifests (package.json, pyproject.toml, requirements.txt)
        # from lockfiles (package-lock.json, poetry.lock, pnpm-lock.yaml, yarn.lock)
        declared_list: List[DiscoveredDependency] = []
        lockfile_list: List[DiscoveredDependency] = []

        for path, deps in discovered_by_manifest.items():
            b_name = path.split("/")[-1].lower()
            if "lock" in b_name:
                lockfile_list.extend(deps)
            else:
                declared_list.extend(deps)

        # Build lockfile index: (ecosystem, normalized_pkg) -> DiscoveredDependency
        lockfile_map: Dict[Tuple[str, str], DiscoveredDependency] = {}
        for l_dep in lockfile_list:
            key = (l_dep.ecosystem, l_dep.package_name)
            # If duplicates in lockfile, prefer the one with direct flag or first
            if key not in lockfile_map or (l_dep.is_direct and not lockfile_map[key].is_direct):
                lockfile_map[key] = l_dep

        reconciled: List[RepositoryDependency] = []
        matched_lock_keys: Set[Tuple[str, str]] = set()

        # 1. Process all declared manifest dependencies
        for d_dep in declared_list:
            key = (d_dep.ecosystem, d_dep.package_name)
            lock_match = lockfile_map.get(key)

            resolved_ver = d_dep.resolved_version
            lock_path = None
            is_direct = d_dep.is_direct
            status = d_dep.status

            if lock_match and lock_match.resolved_version:
                resolved_ver = lock_match.resolved_version
                lock_path = lock_match.lockfile_path
                is_direct = True
                status = "resolved"
                matched_lock_keys.add(key)
            elif resolved_ver:
                status = "resolved"

            meta = dict(d_dep.metadata)
            if d_dep.line_number is not None:
                meta["line_number"] = d_dep.line_number

            model = RepositoryDependency(
                id=str(uuid.uuid4()),
                dependency_run_id=run_id,
                repository_id=repository_id,
                snapshot_id=snapshot_id,
                manifest_path=d_dep.manifest_path,
                lockfile_path=lock_path,
                ecosystem=d_dep.ecosystem,
                package_name=d_dep.package_name,
                original_package_name=d_dep.original_package_name,
                version_constraint=d_dep.version_constraint,
                resolved_version=resolved_ver,
                dependency_type=d_dep.dependency_type,
                is_direct=is_direct if is_direct is not None else True,
                scope=d_dep.scope,
                parser_name=d_dep.parser_name,
                parser_version=d_dep.parser_version,
                status=status,
                metadata_json=meta,
            )
            reconciled.append(model)

        # 2. Add transitive / lockfile-only dependencies that weren't declared in manifests
        for key, l_dep in lockfile_map.items():
            if key in matched_lock_keys:
                continue

            # This is a lockfile-only dependency (e.g. transitive or lockfile without manifest)
            meta = dict(l_dep.metadata)
            if l_dep.line_number is not None:
                meta["line_number"] = l_dep.line_number

            model = RepositoryDependency(
                id=str(uuid.uuid4()),
                dependency_run_id=run_id,
                repository_id=repository_id,
                snapshot_id=snapshot_id,
                manifest_path=l_dep.manifest_path,
                lockfile_path=l_dep.lockfile_path,
                ecosystem=l_dep.ecosystem,
                package_name=l_dep.package_name,
                original_package_name=l_dep.original_package_name,
                version_constraint=l_dep.version_constraint,
                resolved_version=l_dep.resolved_version,
                dependency_type=l_dep.dependency_type if l_dep.dependency_type != "direct" else "transitive",
                is_direct=bool(l_dep.is_direct) if l_dep.is_direct is not None else False,
                scope=l_dep.scope,
                parser_name=l_dep.parser_name,
                parser_version=l_dep.parser_version,
                status="resolved",
                metadata_json=meta,
            )
            reconciled.append(model)

        # Stable sort by ecosystem, package_name, manifest_path
        reconciled.sort(key=lambda d: (d.ecosystem, d.package_name, d.manifest_path))
        return reconciled
