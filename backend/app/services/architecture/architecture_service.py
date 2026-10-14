"""Architecture orchestration service for CodeSentinel AI Phase 5.

Coordinates snapshot selection, safe file acquisition, multi-language AST import
and class parsing, deterministic module graph construction, coupling metrics calculation,
architecture policy enforcement, and transactional persistence.
Never executes target repository source code.
"""

from datetime import datetime, timezone
import json
from pathlib import PurePosixPath
from typing import Any, Dict, List, Optional, Set, Tuple
import uuid

from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.core.exceptions import (
    ConflictError,
    NotFoundError,
    ValidationError,
)
from backend.app.core.logging import logger
from backend.app.models.base import (
    ArchitectureRun,
    ArchitectureViolation,
    Repository,
    RepositoryFile,
    RepositorySnapshot,
)
from backend.app.services.analysis.parsers.base import ParseResult, ParserStatus
from backend.app.services.analysis.parsers.js_ts_adapter import JsTsParser
from backend.app.services.analysis.parsers.python_parser import PythonParser
from backend.app.services.analysis.source_provider import SourceInputProvider
from backend.app.services.architecture.graph_builder import (
    DependencyGraphBuilder,
    ModuleGraphResult,
    _normalize_path,
)
from backend.app.services.architecture.policy_engine import (
    ArchitecturePolicy,
    ArchitecturePolicyEngine,
    ArchitectureViolationDraft,
)

SUPPORTED_EXTENSIONS = {
    ".py": "python",
    ".js": "javascript",
    ".jsx": "javascript",
    ".mjs": "javascript",
    ".cjs": "javascript",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".mts": "typescript",
    ".cts": "typescript",
}


class ArchitectureService:
    """Service orchestrating architectural dependency analysis and governance."""

    def __init__(self, db: Session):
        self.db = db

    def get_run(self, run_id: str) -> Optional[ArchitectureRun]:
        """Fetch an ArchitectureRun by primary key."""
        stmt = select(ArchitectureRun).where(ArchitectureRun.id == run_id)
        return self.db.scalars(stmt).first()

    def list_runs_for_repository(
        self,
        repository_id: str,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[ArchitectureRun], int]:
        """List historical architecture runs for a repository with deterministic ordering."""
        repo = self.db.scalar(select(Repository).where(Repository.id == repository_id))
        if not repo:
            raise NotFoundError("Repository", repository_id)

        count_stmt = select(func.count(ArchitectureRun.id)).where(
            ArchitectureRun.repository_id == repository_id
        )
        total = self.db.scalar(count_stmt) or 0

        offset = (page - 1) * page_size
        stmt = (
            select(ArchitectureRun)
            .where(ArchitectureRun.repository_id == repository_id)
            .order_by(desc(ArchitectureRun.started_at))
            .offset(offset)
            .limit(page_size)
        )
        runs = self.db.scalars(stmt).all()
        return list(runs), total

    def list_violations(
        self,
        run_id: str,
        severity: Optional[str] = None,
        rule_id: Optional[str] = None,
        source_module: Optional[str] = None,
        page: int = 1,
        page_size: int = 50,
    ) -> Tuple[List[ArchitectureViolation], int]:
        """Fetch paginated architecture violations for a run with optional filtering."""
        run = self.get_run(run_id)
        if not run:
            raise NotFoundError("ArchitectureRun", run_id)

        filters = [ArchitectureViolation.architecture_run_id == run_id]
        if severity:
            filters.append(func.upper(ArchitectureViolation.severity) == severity.strip().upper())
        if rule_id:
            filters.append(ArchitectureViolation.rule_id == rule_id.strip())
        if source_module:
            clean_mod = f"%{source_module.strip().lower()}%"
            filters.append(func.lower(ArchitectureViolation.source_module).like(clean_mod))

        count_stmt = select(func.count(ArchitectureViolation.id)).where(*filters)
        total = self.db.scalar(count_stmt) or 0

        offset = (page - 1) * page_size
        stmt = (
            select(ArchitectureViolation)
            .where(*filters)
            .order_by(
                ArchitectureViolation.source_module.asc(),
                ArchitectureViolation.line_number.asc(),
                ArchitectureViolation.rule_id.asc(),
            )
            .offset(offset)
            .limit(page_size)
        )
        violations = self.db.scalars(stmt).all()
        return list(violations), total

    def get_run_graph(self, run_id: str) -> Optional[Dict[str, Any]]:
        """Return the module dependency graph data payload for an architecture run."""
        run = self.get_run(run_id)
        if not run:
            raise NotFoundError("ArchitectureRun", run_id)
        summary = run.summary_json or {}
        return summary.get("graph", {})

    def list_modules(
        self,
        run_id: str,
        page: int = 1,
        page_size: int = 50,
        search: Optional[str] = None,
        sort_by: str = "coupling",
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Return paginated module coupling metrics for an architecture run."""
        run = self.get_run(run_id)
        if not run:
            raise NotFoundError("ArchitectureRun", run_id)

        summary = run.summary_json or {}
        graph_data = summary.get("graph", {})
        raw_modules: Dict[str, Any] = graph_data.get("modules", {})

        module_list: List[Dict[str, Any]] = list(raw_modules.values())

        # Filter by search string if supplied
        if search:
            clean_search = search.strip().lower()
            module_list = [m for m in module_list if clean_search in m.get("path", "").lower()]

        # Sort deterministically
        if sort_by == "instability":
            module_list.sort(key=lambda m: (m.get("instability") is None, -(m.get("instability") or 0.0), m.get("path", "")))
        elif sort_by == "afferent":
            module_list.sort(key=lambda m: (-m.get("afferent_coupling", 0), m.get("path", "")))
        elif sort_by == "efferent":
            module_list.sort(key=lambda m: (-m.get("efferent_coupling", 0), m.get("path", "")))
        elif sort_by == "name":
            module_list.sort(key=lambda m: m.get("path", ""))
        else:  # default 'coupling' = Ca + Ce desc
            module_list.sort(
                key=lambda m: (
                    -(m.get("afferent_coupling", 0) + m.get("efferent_coupling", 0)),
                    m.get("path", ""),
                )
            )

        total = len(module_list)
        start = (page - 1) * page_size
        end = start + page_size
        return module_list[start:end], total

    def get_module_detail(self, run_id: str, module_path: str) -> Optional[Dict[str, Any]]:
        """Return comprehensive detail for a module including incoming/outgoing edges and cycles."""
        run = self.get_run(run_id)
        if not run:
            raise NotFoundError("ArchitectureRun", run_id)

        summary = run.summary_json or {}
        graph_data = summary.get("graph", {})
        norm_path = _normalize_path(module_path)

        modules_dict = graph_data.get("modules", {})
        module_info = modules_dict.get(norm_path)
        if not module_info:
            return None

        # Filter incoming and outgoing internal edges
        internal_edges = graph_data.get("internal_edges", [])
        incoming = [e for e in internal_edges if e.get("target_path") == norm_path]
        outgoing = [e for e in internal_edges if e.get("source_path") == norm_path]

        # External and unresolved outgoing edges
        external_edges = graph_data.get("external_edges", [])
        module_external = [e for e in external_edges if e.get("source_path") == norm_path]

        unresolved_edges = graph_data.get("unresolved_edges", [])
        module_unresolved = [e for e in unresolved_edges if e.get("source_path") == norm_path]

        # Cycles involving this module
        cycles = graph_data.get("cycles", [])
        module_cycles = [c for c in cycles if norm_path in c.get("modules", [])]

        # Query violations involving this module
        viol_stmt = (
            select(ArchitectureViolation)
            .where(
                ArchitectureViolation.architecture_run_id == run_id,
                (ArchitectureViolation.source_module == norm_path)
                | (ArchitectureViolation.target_module == norm_path),
            )
            .order_by(ArchitectureViolation.line_number.asc())
        )
        violations = list(self.db.scalars(viol_stmt).all())

        return {
            "node": module_info,
            "incoming_dependencies": incoming,
            "outgoing_dependencies": outgoing,
            "external_dependencies": module_external,
            "unresolved_dependencies": module_unresolved,
            "cycles": module_cycles,
            "violations_count": len(violations),
            "violations": [
                {
                    "id": v.id,
                    "rule_id": v.rule_id,
                    "policy_id": v.policy_id,
                    "source_module": v.source_module,
                    "target_module": v.target_module,
                    "line_number": v.line_number,
                    "violated_boundary": v.violated_boundary,
                    "severity": v.severity,
                    "description": v.description,
                    "remediation": v.remediation,
                }
                for v in violations
            ],
        }

    async def get_active_policy(
        self,
        repository_id: str,
        snapshot_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Detect and validate the architecture governance policy for a repository snapshot."""
        repo = self.db.scalar(select(Repository).where(Repository.id == repository_id))
        if not repo:
            raise NotFoundError("Repository", repository_id)

        snapshot = self._resolve_snapshot(repository_id, snapshot_id)

        # Look for codesentinel.architecture.json in candidate files
        policy_file = self.db.scalar(
            select(RepositoryFile).where(
                RepositoryFile.snapshot_id == snapshot.id,
                RepositoryFile.relative_path.in_([
                    "codesentinel.architecture.json",
                    ".codesentinel/architecture.json",
                    "architecture.json",
                ]),
            )
        )

        if not policy_file:
            return {
                "policy_configured": False,
                "policy_path": None,
                "policy": None,
                "error": None,
            }

        try:
            async with SourceInputProvider(repo, snapshot) as source_provider:
                source_item = source_provider.read_file_content(policy_file)
                if not source_item.is_available or source_item.content is None:
                    return {
                        "policy_configured": False,
                        "policy_path": policy_file.relative_path,
                        "policy": None,
                        "error": f"Failed reading policy file: {source_item.skip_reason}",
                    }

                policy, err = ArchitecturePolicyEngine.load_policy(source_item.content)
                if err:
                    return {
                        "policy_configured": False,
                        "policy_path": policy_file.relative_path,
                        "policy": None,
                        "error": err,
                    }

            return {
                "policy_configured": True,
                "policy_path": policy_file.relative_path,
                "policy": {
                    "version": policy.version,
                    "description": policy.description,
                    "layers": [{"name": l.name, "patterns": l.patterns} for l in policy.layers],
                    "rules": [
                        {
                            "id": r.id,
                            "description": r.description,
                            "from_layer": r.from_layer,
                            "forbidden_to_layer": r.forbidden_to_layer,
                            "allowed_to_layers": r.allowed_to_layers,
                            "severity": r.severity,
                            "remediation": r.remediation,
                        }
                        for r in policy.rules
                    ],
                    "forbidden_dependencies": [
                        {
                            "rule_id": fb.id,
                            "from_pattern": fb.from_pattern,
                            "to_pattern": fb.to_pattern,
                            "description": fb.description,
                            "severity": fb.severity,
                        }
                        for fb in policy.forbidden_dependencies
                    ],
                },
                "error": None,
            }
        except Exception as exc:
            return {
                "policy_configured": False,
                "policy_path": policy_file.relative_path,
                "policy": None,
                "error": f"Failed reading policy file: {str(exc)}",
            }

    def _resolve_snapshot(
        self,
        repository_id: str,
        snapshot_id: Optional[str] = None,
    ) -> RepositorySnapshot:
        """Resolve snapshot with validation."""
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
                "No completed snapshot is available for analysis in this repository.",
                details={"repository_id": repository_id},
            )

        if snapshot.status != "completed":
            raise ValidationError(
                f"Cannot analyze snapshot with status '{snapshot.status}'. Snapshot must be completed.",
                details={"snapshot_id": snapshot.id, "status": snapshot.status},
            )

        return snapshot

    async def execute_architecture_run(
        self,
        repository_id: str,
        snapshot_id: Optional[str] = None,
        policy_override: Optional[Dict[str, Any]] = None,
    ) -> ArchitectureRun:
        """Execute complete deterministic architecture dependency and governance analysis."""
        repo = self.db.scalar(select(Repository).where(Repository.id == repository_id))
        if not repo:
            raise NotFoundError("Repository", repository_id)

        snapshot = self._resolve_snapshot(repository_id, snapshot_id)
        now = datetime.now(timezone.utc)

        # Check for concurrent running analysis (120s threshold)
        active_stmt = (
            select(ArchitectureRun)
            .where(
                ArchitectureRun.repository_id == repository_id,
                ArchitectureRun.snapshot_id == snapshot.id,
                ArchitectureRun.status == "running",
            )
            .order_by(desc(ArchitectureRun.started_at))
            .limit(1)
        )
        active_run = self.db.scalars(active_stmt).first()
        if active_run:
            started = active_run.started_at
            if started.tzinfo is None:
                started = started.replace(tzinfo=timezone.utc)
            elapsed = (now - started).total_seconds()
            if elapsed < 120:
                raise ConflictError(
                    "An architectural analysis is already actively running for this snapshot.",
                    details={"run_id": active_run.id, "elapsed_seconds": elapsed},
                )

        # Create ArchitectureRun in 'running' state
        run = ArchitectureRun(
            id=str(uuid.uuid4()),
            repository_id=repo.id,
            snapshot_id=snapshot.id,
            status="running",
            started_at=now,
            modules_analyzed=0,
            internal_edges_count=0,
            external_deps_count=0,
            unresolved_count=0,
            cycles_count=0,
            violations_count=0,
            policy_configured=False,
            summary_json={},
        )
        self.db.add(run)
        self.db.commit()
        self.db.refresh(run)

        try:
            # 1. Fetch eligible source files
            file_stmt = (
                select(RepositoryFile)
                .where(
                    RepositoryFile.snapshot_id == snapshot.id,
                    RepositoryFile.is_source_file == True,  # noqa: E712
                    RepositoryFile.is_binary == False,  # noqa: E712
                )
                .order_by(RepositoryFile.relative_path.asc())
            )
            candidate_files = list(self.db.scalars(file_stmt).all())
            all_file_paths = {f.relative_path for f in candidate_files}

            policy: Optional[ArchitecturePolicy] = None
            policy_path: Optional[str] = None

            parsed_results: List[ParseResult] = []

            async with SourceInputProvider(repo, snapshot) as source_provider:
                if policy_override:
                    policy, err = ArchitecturePolicyEngine.load_policy(json.dumps(policy_override))
                    if err:
                        logger.warning(f"Architecture policy override validation failed: {err}")
                    else:
                        policy_path = "custom_override"
                else:
                    pol_candidates = ["codesentinel.architecture.json", ".codesentinel/architecture.json", "architecture.json"]
                    pol_file_stmt = select(RepositoryFile).where(
                        RepositoryFile.snapshot_id == snapshot.id,
                        RepositoryFile.relative_path.in_(pol_candidates),
                    )
                    pol_file = self.db.scalar(pol_file_stmt)
                    if pol_file:
                        try:
                            source_item = source_provider.read_file_content(pol_file)
                            if source_item.is_available and source_item.content:
                                loaded_pol, err = ArchitecturePolicyEngine.load_policy(source_item.content)
                                if not err and loaded_pol:
                                    policy = loaded_pol
                                    policy_path = pol_file.relative_path
                        except Exception as e:
                            logger.warning(f"Failed loading candidate policy file {pol_file.relative_path}: {e}")

                # 3. Parse source files
                for rf in candidate_files:
                    ext = PurePosixPath(rf.relative_path).suffix.lower()
                    lang = SUPPORTED_EXTENSIONS.get(ext)
                    if not lang:
                        continue

                    try:
                        source_item = source_provider.read_file_content(rf)
                        if not source_item.is_available or source_item.content is None:
                            continue

                        if lang == "python":
                            pres = PythonParser.parse(rf.relative_path, source_item.content)
                        else:
                            pres = JsTsParser.parse(rf.relative_path, source_item.content, lang)

                        if pres and pres.status == ParserStatus.SUCCESS:
                            parsed_results.append(pres)
                    except Exception as parse_exc:
                        logger.warning(f"Failed parsing file '{rf.relative_path}' for architecture graph: {parse_exc}")

            # 4. Build Module Dependency Graph
            graph_result: ModuleGraphResult = DependencyGraphBuilder.build_graph(
                parsed_files=parsed_results,
                all_snapshot_files=all_file_paths,
            )

            # 5. Evaluate Governance Policy Violations
            violations_drafts: List[ArchitectureViolationDraft] = []
            if policy:
                violations_drafts = ArchitecturePolicyEngine.evaluate_governance(graph_result, policy)

            # 6. Persist Violations
            persisted_violations: List[ArchitectureViolation] = []
            for draft in violations_drafts:
                viol = ArchitectureViolation(
                    id=str(uuid.uuid4()),
                    architecture_run_id=run.id,
                    repository_id=repo.id,
                    snapshot_id=snapshot.id,
                    rule_id=draft.rule_id,
                    policy_id=draft.policy_id,
                    source_module=draft.source_module,
                    target_module=draft.target_module,
                    edge_specifier=draft.edge_specifier,
                    line_number=draft.line_number,
                    violated_boundary=draft.violated_boundary,
                    description=draft.description,
                    remediation=draft.remediation,
                    severity=draft.severity,
                    confidence=draft.confidence,
                    fingerprint=draft.fingerprint,
                    metadata_json=draft.metadata_json,
                )
                self.db.add(viol)
                persisted_violations.append(viol)

            # 7. Finalize and update run record
            finish_time = datetime.now(timezone.utc)
            run.status = "completed"
            run.completed_at = finish_time
            run.modules_analyzed = len(graph_result.modules)
            run.internal_edges_count = len(graph_result.internal_edges)
            run.external_deps_count = len(graph_result.external_edges)
            run.unresolved_count = len(graph_result.unresolved_edges)
            run.cycles_count = len(graph_result.cycles)
            run.violations_count = len(persisted_violations)
            run.policy_configured = bool(policy is not None)
            run.policy_path = policy_path

            # Prepare structured summary
            run.summary_json = {
                "graph": {
                    "modules": {
                        k: {
                            "path": v.path,
                            "language": v.language,
                            "total_lines": v.total_lines,
                            "classes_count": v.classes_count,
                            "abstract_classes_count": v.abstract_classes_count,
                            "afferent_coupling": v.afferent_coupling,
                            "efferent_coupling": v.efferent_coupling,
                            "instability": v.instability,
                            "abstractness": v.abstractness,
                            "main_sequence_distance": v.main_sequence_distance,
                        }
                        for k, v in graph_result.modules.items()
                    },
                    "internal_edges": [
                        {
                            "source_path": e.source_path,
                            "target_path": e.target_path,
                            "specifier": e.specifier,
                            "line_number": e.line_number,
                        }
                        for e in graph_result.internal_edges
                    ],
                    "external_edges": [
                        {
                            "source_path": e.source_path,
                            "target_path": e.target_path,
                            "specifier": e.specifier,
                            "line_number": e.line_number,
                        }
                        for e in graph_result.external_edges
                    ],
                    "unresolved_edges": [
                        {
                            "source_path": e.source_path,
                            "target_path": e.target_path,
                            "specifier": e.specifier,
                            "line_number": e.line_number,
                        }
                        for e in graph_result.unresolved_edges
                    ],
                    "cycles": [
                        {
                            "id": c.id,
                            "modules": c.modules,
                            "length": c.length,
                        }
                        for c in graph_result.cycles
                    ],
                    "summary": graph_result.summary,
                    "is_partial": graph_result.is_partial,
                },
                "policy_summary": {
                    "configured": bool(policy is not None),
                    "path": policy_path,
                    "version": policy.version if policy else None,
                    "layers_count": len(policy.layers) if policy else 0,
                    "rules_count": len(policy.rules) if policy else 0,
                },
            }

            self.db.commit()
            self.db.refresh(run)
            return run

        except Exception as exc:
            self.db.rollback()
            run.status = "failed"
            run.completed_at = datetime.now(timezone.utc)
            run.failure_code = "ANALYSIS_FAILED"
            run.failure_reason = str(exc)[:1024]
            self.db.commit()
            raise exc
