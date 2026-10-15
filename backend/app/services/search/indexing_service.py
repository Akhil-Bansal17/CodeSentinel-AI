"""Safe, idempotent source code indexing service.

Parses snapshot files into syntax-aware and bounded chunks, computes deterministic
fingerprints, executes optional vector embeddings, and persists index runs.
Adheres strictly to snapshot containment and ignore rules.
Never executes target source files.
"""

from datetime import datetime, timezone
import fnmatch
from pathlib import Path
from typing import Any, Dict, List, Optional
import uuid

from sqlalchemy import delete, desc, select
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.core.exceptions import (
    NotFoundError,
    ValidationError,
)
from backend.app.core.logging import logger
from backend.app.models.base import (
    CodeChunk,
    CodeIndexRun,
    Repository,
    RepositoryFile,
    RepositorySnapshot,
)
from backend.app.services.analysis.source_provider import SourceInputProvider
from backend.app.services.file_discovery import (
    DEFAULT_IGNORED_DIRECTORIES,
    SENSITIVE_FILE_PATTERNS,
)
from backend.app.services.search.chunker import CodeChunkDraft, SourceChunker
from backend.app.services.search.embeddings.base import BaseEmbeddingProvider
from backend.app.services.search.embeddings.registry import get_embedding_provider


def is_sensitive_or_ignored(relative_path: str) -> bool:
    """Check if file matches sensitive credential or ignored directory rules."""
    norm_path = relative_path.replace("\\", "/")
    parts = norm_path.split("/")

    for part in parts[:-1]:
        if part in DEFAULT_IGNORED_DIRECTORIES:
            return True

    file_name = parts[-1].lower()
    for pattern in SENSITIVE_FILE_PATTERNS:
        if fnmatch.fnmatch(file_name, pattern.lower()):
            return True

    return False


class CodeIndexingService:
    """Orchestrates source code chunking, embedding, and snapshot index persistence."""

    def __init__(self, db: Session, embedding_provider: Optional[BaseEmbeddingProvider] = None):
        self.db = db
        self.provider = embedding_provider or get_embedding_provider()

    async def get_or_create_index(
        self,
        repository_id: str,
        snapshot_id: str,
        force_reindex: bool = False,
        local_path_override: Optional[str] = None,
    ) -> CodeIndexRun:
        """Retrieve existing completed index or execute a new indexing run."""
        repo = self.db.execute(
            select(Repository).where(Repository.id == repository_id)
        ).scalar_one_or_none()
        if not repo:
            raise NotFoundError("Repository", repository_id)

        snapshot = self.db.execute(
            select(RepositorySnapshot).where(
                RepositorySnapshot.id == snapshot_id,
                RepositorySnapshot.repository_id == repository_id,
            )
        ).scalar_one_or_none()
        if not snapshot:
            raise NotFoundError("RepositorySnapshot", snapshot_id)

        # Check existing completed run
        existing_run = self.db.execute(
            select(CodeIndexRun).where(
                CodeIndexRun.repository_id == repository_id,
                CodeIndexRun.snapshot_id == snapshot_id,
                CodeIndexRun.status == "completed",
            ).order_by(desc(CodeIndexRun.started_at))
        ).scalars().first()

        if existing_run and not force_reindex and existing_run.chunk_count > 0:
            return existing_run

        return await self.execute_index_run(
            repository=repo,
            snapshot=snapshot,
            force_reindex=force_reindex,
            local_path_override=local_path_override,
        )

    async def execute_index_run(
        self,
        repository: Repository,
        snapshot: RepositorySnapshot,
        force_reindex: bool = False,
        local_path_override: Optional[str] = None,
    ) -> CodeIndexRun:
        """Run full indexing workflow on a repository snapshot."""
        # Clean up existing runs if force_reindex
        if force_reindex:
            old_runs = self.db.execute(
                select(CodeIndexRun).where(
                    CodeIndexRun.snapshot_id == snapshot.id,
                )
            ).scalars().all()
            for old_run in old_runs:
                self.db.delete(old_run)
            self.db.commit()

        run = CodeIndexRun(
            id=str(uuid.uuid4()),
            repository_id=repository.id,
            snapshot_id=snapshot.id,
            status="processing",
            started_at=datetime.now(timezone.utc),
            index_version=settings.INDEX_VERSION,
            chunk_count=0,
            files_indexed=0,
            files_skipped=0,
            embedding_provider=self.provider.name,
            embedding_model=self.provider.model_name,
            embedding_dimension=self.provider.dimension if self.provider.is_available() else None,
            summary_json={},
        )
        self.db.add(run)
        self.db.commit()
        self.db.refresh(run)

        try:
            # Query candidate files from snapshot
            files = self.db.execute(
                select(RepositoryFile).where(
                    RepositoryFile.snapshot_id == snapshot.id,
                ).order_by(RepositoryFile.relative_path)
            ).scalars().all()

            if not files:
                run.status = "completed"
                run.completed_at = datetime.now(timezone.utc)
                run.summary_json = {"message": "No files found in snapshot."}
                self.db.commit()
                return run

            files_indexed = 0
            files_skipped = 0
            all_draft_chunks: List[CodeChunkDraft] = []
            max_files = settings.MAX_INDEX_FILES

            async with SourceInputProvider(
                repository=repository,
                snapshot=snapshot,
                local_path_override=local_path_override,
            ) as provider:
                for file_rec in files:
                    if files_indexed >= max_files:
                        files_skipped += 1
                        continue

                    # Filter out binary or sensitive files
                    if file_rec.is_binary or is_sensitive_or_ignored(file_rec.relative_path):
                        files_skipped += 1
                        continue

                    file_content = provider.read_file_content(file_rec)
                    if not file_content.is_available or not file_content.content:
                        files_skipped += 1
                        continue

                    # Chunk source file
                    drafts = SourceChunker.chunk_file(
                        snapshot_id=snapshot.id,
                        relative_path=file_rec.relative_path,
                        content=file_content.content,
                        language=file_rec.language,
                    )

                    if drafts:
                        all_draft_chunks.extend(drafts)
                        files_indexed += 1
                    else:
                        files_skipped += 1

            # Execute embeddings in batches if provider is available
            embeddings_list: List[Optional[List[float]]] = [None] * len(all_draft_chunks)
            if self.provider.is_available() and all_draft_chunks:
                try:
                    texts = [c.content for c in all_draft_chunks]
                    # Process in sub-batches of 32
                    batch_size = 32
                    computed_embeddings = []
                    for i in range(0, len(texts), batch_size):
                        batch = texts[i : i + batch_size]
                        emb_batch = self.provider.embed_texts(batch)
                        computed_embeddings.extend(emb_batch)

                    for idx, emb in enumerate(computed_embeddings):
                        if idx < len(embeddings_list):
                            embeddings_list[idx] = emb
                except Exception as emb_err:
                    logger.warning("Optional embedding generation failed: %s", emb_err)

            # Persist CodeChunk records in batches
            db_chunks: List[CodeChunk] = []
            for idx, draft in enumerate(all_draft_chunks):
                db_chunk = CodeChunk(
                    id=str(uuid.uuid4()),
                    index_run_id=run.id,
                    repository_id=repository.id,
                    snapshot_id=snapshot.id,
                    relative_path=draft.relative_path,
                    file_name=draft.file_name,
                    language=draft.language,
                    chunk_index=draft.chunk_index,
                    chunk_type=draft.chunk_type,
                    symbol_name=draft.symbol_name,
                    symbol_type=draft.symbol_type,
                    start_line=draft.start_line,
                    end_line=draft.end_line,
                    start_column=draft.start_column,
                    end_column=draft.end_column,
                    content=draft.content,
                    content_hash=draft.content_hash,
                    chunk_fingerprint=draft.chunk_fingerprint,
                    embedding=embeddings_list[idx],
                    metadata_json=draft.metadata_json,
                )
                db_chunks.append(db_chunk)

            self.db.bulk_save_objects(db_chunks)

            # Mark completed
            run.status = "completed"
            run.completed_at = datetime.now(timezone.utc)
            run.chunk_count = len(db_chunks)
            run.files_indexed = files_indexed
            run.files_skipped = files_skipped
            run.summary_json = {
                "chunk_count": len(db_chunks),
                "files_indexed": files_indexed,
                "files_skipped": files_skipped,
                "embedding_provider": self.provider.name,
                "embedding_model": self.provider.model_name,
                "has_embeddings": bool(self.provider.is_available() and db_chunks and embeddings_list[0] is not None),
            }
            self.db.commit()
            self.db.refresh(run)
            return run

        except Exception as exc:
            self.db.rollback()
            run.status = "failed"
            run.completed_at = datetime.now(timezone.utc)
            run.failure_code = "INDEXING_ERROR"
            run.failure_reason = str(exc)
            run.summary_json = {"error": str(exc)}
            self.db.commit()
            self.db.refresh(run)
            logger.error("Failed to index repository snapshot: %s", exc, exc_info=True)
            return run
