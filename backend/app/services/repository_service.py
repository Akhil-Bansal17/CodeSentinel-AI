"""Repository management and ingestion orchestration service for CodeSentinel AI.

Coordinates repository registration, acquisition, safe discovery, metric calculation,
and database persistence with transactional safety and failure isolation.
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from backend.app.core.exceptions import (
    AppException,
    ConflictError,
    NotFoundError,
    RepositoryAccessError,
)
from backend.app.core.logging import logger
from backend.app.models.base import Repository, RepositoryFile, RepositorySnapshot
from backend.app.schemas.repository import (
    RepositoryCreateRequest,
    RepositoryFileResponse,
    RepositoryListResponse,
    RepositoryResponse,
    RepositorySnapshotResponse,
)
from backend.app.services.file_discovery import discover_repository_files
from backend.app.services.metrics_calculator import calculate_repository_metrics
from backend.app.services.repository_acquisition import acquire_repository
from backend.app.services.source_validator import validate_repository_source


def _to_snapshot_response(snapshot: RepositorySnapshot) -> RepositorySnapshotResponse:
    """Convert a RepositorySnapshot model to its response schema."""
    return RepositorySnapshotResponse(
        id=snapshot.id,
        repository_id=snapshot.repository_id,
        status=snapshot.status,
        commit_sha=snapshot.commit_sha,
        branch=snapshot.branch,
        started_at=snapshot.started_at,
        completed_at=snapshot.completed_at,
        file_count=snapshot.file_count,
        source_file_count=snapshot.source_file_count,
        ignored_file_count=snapshot.ignored_file_count,
        total_size_bytes=snapshot.total_size_bytes,
        directory_count=snapshot.directory_count,
        total_lines_of_code=snapshot.total_lines_of_code,
        language_distribution=snapshot.language_distribution or {},
        metrics_json=snapshot.metrics_json or {},
        failure_code=snapshot.failure_code,
        failure_reason=snapshot.failure_reason,
    )


def _to_repository_response(
    repo: Repository,
    latest_snapshot: Optional[RepositorySnapshot] = None,
) -> RepositoryResponse:
    """Convert a Repository model to its response schema, including latest snapshot."""
    snapshot_resp = _to_snapshot_response(latest_snapshot) if latest_snapshot else None
    return RepositoryResponse(
        id=repo.id,
        name=repo.name,
        source_type=repo.source_type,
        source_url=repo.source_url,
        source_identifier=repo.source_identifier,
        default_branch=repo.default_branch,
        status=repo.status,
        description=repo.description,
        created_at=repo.created_at,
        updated_at=repo.updated_at,
        last_ingested_at=repo.last_ingested_at,
        error_code=repo.error_code,
        latest_snapshot=snapshot_resp,
    )


class RepositoryService:
    """Service handling repository lifecycle and deterministic ingestion."""

    def __init__(self, db: Session):
        self.db = db

    def get_repository_by_id(self, repository_id: str) -> Optional[Repository]:
        """Fetch repository by primary key."""
        stmt = select(Repository).where(Repository.id == repository_id)
        return self.db.scalars(stmt).first()

    def get_latest_snapshot(self, repository_id: str, only_completed: bool = False) -> Optional[RepositorySnapshot]:
        """Fetch the most recent snapshot for a repository."""
        stmt = (
            select(RepositorySnapshot)
            .where(RepositorySnapshot.repository_id == repository_id)
        )
        if only_completed:
            stmt = stmt.where(RepositorySnapshot.status == "completed")
        stmt = stmt.order_by(desc(RepositorySnapshot.started_at)).limit(1)
        return self.db.scalars(stmt).first()

    def list_repositories(self, page: int = 1, page_size: int = 20) -> RepositoryListResponse:
        """List repositories paginated with latest snapshot attached."""
        count_stmt = select(func.count(Repository.id))
        total = self.db.scalar(count_stmt) or 0

        offset = (page - 1) * page_size
        stmt = (
            select(Repository)
            .order_by(desc(Repository.created_at))
            .offset(offset)
            .limit(page_size)
        )
        repos = self.db.scalars(stmt).all()

        items = []
        for repo in repos:
            latest_snap = self.get_latest_snapshot(repo.id)
            items.append(_to_repository_response(repo, latest_snap))

        return RepositoryListResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
        )

    def get_repository_details(self, repository_id: str) -> RepositoryResponse:
        """Fetch complete repository details and latest snapshot."""
        repo = self.get_repository_by_id(repository_id)
        if not repo:
            raise NotFoundError("Repository", repository_id)

        latest_snap = self.get_latest_snapshot(repo.id)
        return _to_repository_response(repo, latest_snap)

    def get_snapshot_details(self, repository_id: str, snapshot_id: str) -> RepositorySnapshotResponse:
        """Fetch specific snapshot details."""
        repo = self.get_repository_by_id(repository_id)
        if not repo:
            raise NotFoundError("Repository", repository_id)

        stmt = select(RepositorySnapshot).where(
            RepositorySnapshot.id == snapshot_id,
            RepositorySnapshot.repository_id == repository_id,
        )
        snapshot = self.db.scalars(stmt).first()
        if not snapshot:
            raise NotFoundError("Snapshot", snapshot_id)

        return _to_snapshot_response(snapshot)

    def list_snapshot_files(
        self,
        repository_id: str,
        snapshot_id: Optional[str] = None,
        page: int = 1,
        page_size: int = 50,
        language: Optional[str] = None,
        category: Optional[str] = None,
        search: Optional[str] = None,
        is_source_file: Optional[bool] = None,
    ) -> Tuple[List[RepositoryFileResponse], int, str]:
        """Fetch paginated files for a repository snapshot."""
        repo = self.get_repository_by_id(repository_id)
        if not repo:
            raise NotFoundError("Repository", repository_id)

        target_snap_id = snapshot_id
        if not target_snap_id:
            latest_snap = self.get_latest_snapshot(repository_id, only_completed=True)
            if not latest_snap:
                latest_snap = self.get_latest_snapshot(repository_id)
            if not latest_snap:
                return [], 0, ""
            target_snap_id = latest_snap.id

        # Query files
        filters = [RepositoryFile.snapshot_id == target_snap_id]
        if language:
            filters.append(func.lower(RepositoryFile.language) == language.lower())
        if category:
            filters.append(func.lower(RepositoryFile.category) == category.lower())
        if is_source_file is not None:
            filters.append(RepositoryFile.is_source_file == is_source_file)
        if search:
            search_pattern = f"%{search.strip().lower()}%"
            filters.append(
                func.lower(RepositoryFile.relative_path).like(search_pattern)
                | func.lower(RepositoryFile.file_name).like(search_pattern)
            )

        count_stmt = select(func.count(RepositoryFile.id)).where(*filters)
        total = self.db.scalar(count_stmt) or 0

        offset = (page - 1) * page_size
        stmt = (
            select(RepositoryFile)
            .where(*filters)
            .order_by(RepositoryFile.relative_path.asc())
            .offset(offset)
            .limit(page_size)
        )
        files = self.db.scalars(stmt).all()
        responses = [RepositoryFileResponse.model_validate(f) for f in files]

        return responses, total, target_snap_id

    def delete_repository(self, repository_id: str) -> bool:
        """Delete repository database record and cascades (snapshots, files).

        Never modifies or deletes local filesystem files.
        """
        repo = self.get_repository_by_id(repository_id)
        if not repo:
            raise NotFoundError("Repository", repository_id)

        self.db.delete(repo)
        self.db.commit()
        logger.info("Deleted repository database record: %s (%s)", repo.name, repo.id)
        return True

    async def ingest_repository(self, request: RepositoryCreateRequest) -> RepositoryResponse:
        """Execute real, end-to-end repository ingestion pipeline."""
        # 1. Validate & normalize source
        validated_source = validate_repository_source(
            source_type=request.source_type,
            source_url=request.source_url,
            local_path=request.local_path,
            name_override=request.name,
            default_branch=request.default_branch,
        )

        # 2. Check for existing repository with same source_identifier
        stmt = select(Repository).where(Repository.source_identifier == validated_source.source_identifier)
        repo = self.db.scalars(stmt).first()

        now = datetime.now(timezone.utc)

        if not repo:
            repo = Repository(
                id=str(uuid.uuid4()),
                name=validated_source.display_name,
                source_type=validated_source.source_type.value,
                source_url=validated_source.source_url,
                source_identifier=validated_source.source_identifier,
                remote_url=validated_source.source_url,
                default_branch=validated_source.default_branch,
                status="processing",
                created_at=now,
                updated_at=now,
            )
            self.db.add(repo)
            self.db.commit()
            self.db.refresh(repo)
        else:
            # Check for concurrent active ingestion
            if repo.status == "processing":
                # Check if it was started in the last 2 minutes
                latest_active = self.get_latest_snapshot(repo.id)
                if latest_active and latest_active.status == "processing":
                    elapsed = (now - latest_active.started_at).total_seconds()
                    if elapsed < 120:
                        raise ConflictError(
                            "An ingestion job is already actively processing for this repository.",
                            details={"repository_id": repo.id, "elapsed_seconds": elapsed},
                        )

            repo.status = "processing"
            repo.error_code = None
            repo.updated_at = now
            self.db.commit()

        # 3. Create snapshot record in processing state
        snapshot = RepositorySnapshot(
            id=str(uuid.uuid4()),
            repository_id=repo.id,
            status="processing",
            branch=validated_source.default_branch,
            started_at=now,
            language_distribution={},
            metrics_json={},
        )
        self.db.add(snapshot)
        self.db.commit()
        self.db.refresh(snapshot)

        # 4. Acquire repository and run ingestion pipeline
        acquired = None
        try:
            logger.info("Acquiring repository: %s (%s)", repo.name, validated_source.source_identifier)
            acquired = await acquire_repository(validated_source)

            # Update detected default branch
            if acquired.default_branch:
                repo.default_branch = acquired.default_branch
                snapshot.branch = acquired.default_branch

            # 5. Safe file discovery
            logger.info("Discovering files safely in: %s", acquired.root_path)
            discovery = discover_repository_files(acquired.root_path)

            # 6. Calculate deterministic metrics
            metrics = calculate_repository_metrics(discovery)
            summary = metrics["summary"]

            # 7. Persist snapshot metrics
            completed_time = datetime.now(timezone.utc)
            snapshot.status = "completed"
            snapshot.completed_at = completed_time
            snapshot.file_count = summary["total_files"]
            snapshot.source_file_count = summary["source_files"]
            snapshot.ignored_file_count = summary["ignored_files"]
            snapshot.total_size_bytes = summary["total_size_bytes"]
            snapshot.directory_count = summary["directory_count"]
            snapshot.total_lines_of_code = summary["total_lines_of_code"]
            snapshot.language_distribution = metrics["language_distribution"]
            snapshot.metrics_json = metrics

            # 8. Persist file records in batches
            file_records = []
            for df in discovery.files:
                file_rec = RepositoryFile(
                    id=str(uuid.uuid4()),
                    snapshot_id=snapshot.id,
                    relative_path=df.relative_path,
                    file_name=df.file_name,
                    extension=df.extension,
                    language=df.language,
                    category=df.category,
                    size_bytes=df.size_bytes,
                    is_source_file=df.is_source_file,
                    is_binary=df.is_binary,
                    line_count=df.line_count,
                    sha256=df.sha256,
                )
                file_records.append(file_rec)

            # Batch insert files
            batch_size = 500
            for i in range(0, len(file_records), batch_size):
                self.db.add_all(file_records[i : i + batch_size])
                self.db.flush()

            # 9. Update Repository status to completed
            repo.status = "completed"
            repo.last_ingested_at = completed_time
            repo.error_code = None
            repo.updated_at = completed_time

            self.db.commit()
            self.db.refresh(repo)
            self.db.refresh(snapshot)

            logger.info(
                "Ingestion completed successfully for %s: %d files (%d source)",
                repo.name,
                snapshot.file_count,
                snapshot.source_file_count,
            )

            return _to_repository_response(repo, snapshot)

        except Exception as exc:
            # Handle failure safely: preserve previous successful snapshot!
            logger.exception("Ingestion failed for repository %s: %s", repo.name, exc)
            self.db.rollback()

            failure_code = getattr(exc, "error_code", "INGESTION_FAILED")
            failure_reason = str(exc) if isinstance(exc, AppException) else "An unexpected ingestion error occurred."

            # Mark snapshot as failed
            snapshot.status = "failed"
            snapshot.failure_code = failure_code
            snapshot.failure_reason = failure_reason
            snapshot.completed_at = datetime.now(timezone.utc)
            self.db.add(snapshot)

            # Preserve last successful snapshot status on repo if one exists
            last_successful = self.get_latest_snapshot(repo.id, only_completed=True)
            if last_successful:
                repo.status = "completed"
            else:
                repo.status = "failed"
            repo.error_code = failure_code
            repo.updated_at = datetime.now(timezone.utc)
            self.db.add(repo)

            self.db.commit()

            # Re-raise so controller returns proper error code
            raise

        finally:
            # Always clean up temporary resources
            if acquired:
                acquired.cleanup()

    async def reingest_repository(self, repository_id: str) -> RepositoryResponse:
        """Trigger re-ingestion of an already registered repository."""
        repo = self.get_repository_by_id(repository_id)
        if not repo:
            raise NotFoundError("Repository", repository_id)

        req = RepositoryCreateRequest(
            source_type=repo.source_type,
            source_url=repo.source_url if repo.source_type == "github" else None,
            local_path=None,  # We re-evaluate source based on stored details
            name=repo.name,
            default_branch=repo.default_branch,
        )

        if repo.source_type == "local":
            raise RepositoryAccessError(
                "Re-ingesting a local repository requires specifying the local_path via repository creation.",
            )

        return await self.ingest_repository(req)
