"""Analysis orchestration service for CodeSentinel AI Phase 2.

Coordinates snapshot selection, safe file acquisition, multi-language AST parsing,
deterministic rule execution, findings normalization, and transactional persistence.
Never executes target repository source code.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
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
    AnalysisFinding,
    AnalysisRun,
    Repository,
    RepositoryFile,
    RepositorySnapshot,
)
from backend.app.services.analysis.normalizer import FindingNormalizer
from backend.app.services.analysis.parsers.base import ParserStatus
from backend.app.services.analysis.parsers.js_ts_adapter import JsTsParser
from backend.app.services.analysis.parsers.python_parser import PythonParser
from backend.app.services.analysis.rules.registry import default_rule_registry
from backend.app.services.analysis.source_provider import SourceInputProvider

SUPPORTED_LANGUAGES = {"python", "javascript", "typescript", "jsx", "tsx"}


class AnalysisService:
    """Service orchestrating deterministic static analysis runs."""

    def __init__(self, db: Session):
        self.db = db

    def get_analysis_by_id(self, analysis_id: str) -> Optional[AnalysisRun]:
        """Fetch an AnalysisRun by primary key."""
        stmt = select(AnalysisRun).where(AnalysisRun.id == analysis_id)
        return self.db.scalars(stmt).first()

    def list_analyses_for_repository(
        self,
        repository_id: str,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[AnalysisRun], int]:
        """List historical analysis runs for a repository paginated with deterministic ordering."""
        # Verify repository exists
        repo = self.db.scalar(select(Repository).where(Repository.id == repository_id))
        if not repo:
            raise NotFoundError("Repository", repository_id)

        count_stmt = select(func.count(AnalysisRun.id)).where(AnalysisRun.repository_id == repository_id)
        total = self.db.scalar(count_stmt) or 0

        offset = (page - 1) * page_size
        stmt = (
            select(AnalysisRun)
            .where(AnalysisRun.repository_id == repository_id)
            .order_by(desc(AnalysisRun.started_at))
            .offset(offset)
            .limit(page_size)
        )
        runs = self.db.scalars(stmt).all()
        return list(runs), total

    def list_analysis_findings(
        self,
        analysis_id: str,
        severity: Optional[str] = None,
        category: Optional[str] = None,
        rule_id: Optional[str] = None,
        file_path: Optional[str] = None,
        page: int = 1,
        page_size: int = 50,
    ) -> Tuple[List[AnalysisFinding], int]:
        """Fetch paginated findings for an analysis run with filters and stable sorting."""
        run = self.get_analysis_by_id(analysis_id)
        if not run:
            raise NotFoundError("AnalysisRun", analysis_id)

        filters = [AnalysisFinding.analysis_run_id == analysis_id]
        if severity:
            filters.append(func.upper(AnalysisFinding.severity) == severity.strip().upper())
        if category:
            filters.append(func.upper(AnalysisFinding.category) == category.strip().upper())
        if rule_id:
            filters.append(AnalysisFinding.rule_id == rule_id.strip())
        if file_path:
            clean_fp = f"%{file_path.strip().lower()}%"
            filters.append(func.lower(AnalysisFinding.file_path).like(clean_fp))

        count_stmt = select(func.count(AnalysisFinding.id)).where(*filters)
        total = self.db.scalar(count_stmt) or 0

        offset = (page - 1) * page_size
        stmt = (
            select(AnalysisFinding)
            .where(*filters)
            .order_by(
                AnalysisFinding.file_path.asc(),
                AnalysisFinding.start_line.asc(),
                AnalysisFinding.rule_id.asc(),
            )
            .offset(offset)
            .limit(page_size)
        )
        findings = self.db.scalars(stmt).all()
        return list(findings), total

    async def execute_analysis_run(
        self,
        repository_id: str,
        snapshot_id: Optional[str] = None,
        config: Optional[Dict[str, Any]] = None,
    ) -> AnalysisRun:
        """Run complete deterministic static analysis against a repository snapshot."""
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
            # Pick latest completed snapshot
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

        now = datetime.now(timezone.utc)

        # 3. Check for concurrent active analysis runs
        stmt = (
            select(AnalysisRun)
            .where(
                AnalysisRun.repository_id == repository_id,
                AnalysisRun.snapshot_id == snapshot.id,
                AnalysisRun.status == "running",
            )
            .order_by(desc(AnalysisRun.started_at))
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
                    "An analysis run is already actively running for this repository snapshot.",
                    details={"run_id": active_run.id, "elapsed_seconds": elapsed},
                )

        # 4. Create AnalysisRun record in running state
        run = AnalysisRun(
            id=str(uuid.uuid4()),
            repository_id=repo.id,
            snapshot_id=snapshot.id,
            status="running",
            started_at=now,
            rule_set_version=settings.RULE_SET_VERSION,
            files_discovered=0,
            files_analyzed=0,
            files_skipped=0,
            findings_count=0,
            summary_json={},
        )
        self.db.add(run)
        self.db.commit()
        self.db.refresh(run)

        # 5. Fetch eligible source files for this snapshot
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
        total_discovered = len(candidate_files)
        run.files_discovered = total_discovered

        analyzed_count = 0
        skipped_count = 0
        persisted_findings: List[AnalysisFinding] = []
        severity_counts: Dict[str, int] = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0, "INFO": 0}
        category_counts: Dict[str, int] = {}
        language_diagnostics: Dict[str, int] = {}

        local_path_override = config.get("local_path") if config else None
        try:
            # 6. Initialize safe SourceInputProvider
            async with SourceInputProvider(repo, snapshot, local_path_override=local_path_override) as source_provider:
                for file_rec in candidate_files:
                    # Enforce file count limit
                    if analyzed_count >= settings.MAX_ANALYSIS_FILES:
                        skipped_count += 1
                        continue

                    lang_key = file_rec.language.lower()
                    if lang_key not in SUPPORTED_LANGUAGES:
                        skipped_count += 1
                        continue

                    # Safe file content read
                    source_item = source_provider.read_file_content(file_rec)
                    if not source_item.is_available or source_item.content is None:
                        skipped_count += 1
                        logger.debug("Skipped unreadable file: %s (%s)", file_rec.relative_path, source_item.skip_reason)
                        continue

                    # 7. AST parsing per language
                    parse_result = None
                    if lang_key == "python":
                        parse_result = PythonParser.parse(file_rec.relative_path, source_item.content)
                    elif lang_key in {"javascript", "typescript", "jsx", "tsx"}:
                        parse_result = JsTsParser.parse(file_rec.relative_path, source_item.content, file_rec.language)

                    if not parse_result:
                        skipped_count += 1
                        continue

                    if parse_result.status == ParserStatus.INTERNAL_ERROR:
                        language_diagnostics[lang_key] = language_diagnostics.get(lang_key, 0) + 1
                        # Parser internal error is isolated to this file
                        skipped_count += 1
                        continue

                    analyzed_count += 1

                    # 8. Run deterministic rules
                    applicable_rules = default_rule_registry.get_rules_for_language(file_rec.language)
                    for rule in applicable_rules:
                        try:
                            drafts = rule.analyze(parse_result, source_item.content, config)
                            for draft in drafts:
                                finding_model = FindingNormalizer.normalize_draft(
                                    draft=draft,
                                    analysis_run_id=run.id,
                                    repository_id=repo.id,
                                    snapshot_id=snapshot.id,
                                    total_file_lines=source_item.line_count,
                                )
                                persisted_findings.append(finding_model)

                                # Update counters
                                sev = finding_model.severity.upper()
                                severity_counts[sev] = severity_counts.get(sev, 0) + 1

                                cat = finding_model.category.upper()
                                category_counts[cat] = category_counts.get(cat, 0) + 1
                        except Exception as rule_exc:
                            logger.warning(
                                "Rule %s evaluation failed for %s: %s",
                                rule.rule_id,
                                file_rec.relative_path,
                                rule_exc,
                            )

            # 9. Batch persist findings in single transaction
            batch_size = 500
            for i in range(0, len(persisted_findings), batch_size):
                self.db.add_all(persisted_findings[i : i + batch_size])
                self.db.flush()

            # 10. Finalize run status to completed
            completed_at = datetime.now(timezone.utc)
            run.status = "completed"
            run.completed_at = completed_at
            run.files_analyzed = analyzed_count
            run.files_skipped = skipped_count
            run.findings_count = len(persisted_findings)
            run.summary_json = {
                "total_findings": len(persisted_findings),
                "severity_distribution": severity_counts,
                "category_distribution": category_counts,
                "language_diagnostics": language_diagnostics,
                "analyzed_files": analyzed_count,
                "skipped_files": skipped_count,
            }

            self.db.commit()
            self.db.refresh(run)

            logger.info(
                "Static analysis completed for %s (%s): %d findings across %d analyzed files",
                repo.name,
                run.id,
                run.findings_count,
                run.files_analyzed,
            )
            return run

        except Exception as exc:
            logger.exception("Analysis run %s failed: %s", run.id, exc)
            self.db.rollback()

            # Mark run as failed safely
            run.status = "failed"
            run.completed_at = datetime.now(timezone.utc)
            run.failure_code = getattr(exc, "error_code", "ANALYSIS_FAILED")
            run.failure_reason = str(exc) if isinstance(exc, AppException) else "An unexpected error occurred during static analysis."
            self.db.add(run)
            self.db.commit()
            raise
