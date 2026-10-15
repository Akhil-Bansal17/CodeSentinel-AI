"""API endpoints for Phase 6 Code Search & Repository Q&A."""

from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.exceptions import NotFoundError, ValidationError
from backend.app.models.base import CodeChunk, CodeIndexRun, Repository, RepositorySnapshot
from backend.app.schemas.search import (
    CodeChunkDetailResponse,
    CodeIndexRunResponse,
    CodeSearchQueryPayload,
    CodeSearchResponse,
    EvidenceItemResponse,
    QAPayload,
    QAResponse,
    SearchCapabilitiesResponse,
    SearchResultItem,
    StartIndexPayload,
)
from backend.app.services.search.indexing_service import CodeIndexingService
from backend.app.services.search.qa.qa_service import RepositoryQAService
from backend.app.services.search.search_service import CodeSearchService

repo_search_router = APIRouter(prefix="/repositories", tags=["Code Search & Q&A"])
search_router = APIRouter(prefix="/search", tags=["Code Search & Q&A"])


def _serialize_index_run(run: CodeIndexRun) -> CodeIndexRunResponse:
    return CodeIndexRunResponse(
        id=run.id,
        repository_id=run.repository_id,
        snapshot_id=run.snapshot_id,
        status=run.status,
        started_at=run.started_at.isoformat() if run.started_at else "",
        completed_at=run.completed_at.isoformat() if run.completed_at else None,
        index_version=run.index_version,
        chunk_count=run.chunk_count,
        files_indexed=run.files_indexed,
        files_skipped=run.files_skipped,
        embedding_provider=run.embedding_provider,
        embedding_model=run.embedding_model,
        embedding_dimension=run.embedding_dimension,
        failure_code=run.failure_code,
        failure_reason=run.failure_reason,
        summary_json=run.summary_json or {},
    )


@repo_search_router.post(
    "/{repository_id}/snapshots/{snapshot_id}/index",
    response_model=CodeIndexRunResponse,
    status_code=status.HTTP_200_OK,
    summary="Start or verify indexing of repository snapshot",
)
async def start_indexing(
    repository_id: str,
    snapshot_id: str,
    payload: Optional[StartIndexPayload] = None,
    db: Session = Depends(get_db),
):
    """Trigger or retrieve an idempotent source code index run for a snapshot."""
    force = payload.force_reindex if payload else False
    local_override = payload.local_path_override if payload else None

    service = CodeIndexingService(db=db)
    run = await service.get_or_create_index(
        repository_id=repository_id,
        snapshot_id=snapshot_id,
        force_reindex=force,
        local_path_override=local_override,
    )
    return _serialize_index_run(run)


@repo_search_router.get(
    "/{repository_id}/snapshots/{snapshot_id}/index/status",
    response_model=CodeIndexRunResponse,
    summary="Get snapshot indexing status",
)
def get_index_status(
    repository_id: str,
    snapshot_id: str,
    db: Session = Depends(get_db),
):
    """Retrieve the latest indexing run status for a snapshot."""
    run = db.execute(
        select(CodeIndexRun).where(
            CodeIndexRun.repository_id == repository_id,
            CodeIndexRun.snapshot_id == snapshot_id,
        ).order_by(desc(CodeIndexRun.started_at))
    ).scalars().first()

    if not run:
        raise NotFoundError("CodeIndexRun", f"{repository_id}/{snapshot_id}")

    return _serialize_index_run(run)


@repo_search_router.get(
    "/{repository_id}/snapshots/{snapshot_id}/index/capabilities",
    response_model=SearchCapabilitiesResponse,
    summary="Get search capabilities and model readiness",
)
def get_capabilities(
    repository_id: str,
    snapshot_id: str,
    db: Session = Depends(get_db),
):
    """Check search modes and embedding readiness for the specified snapshot."""
    service = CodeSearchService(db=db)
    caps = service.get_capabilities(repository_id, snapshot_id)
    return SearchCapabilitiesResponse(**caps.to_dict())


@repo_search_router.post(
    "/{repository_id}/snapshots/{snapshot_id}/search",
    response_model=CodeSearchResponse,
    summary="Search code in snapshot",
)
async def search_code(
    repository_id: str,
    snapshot_id: str,
    payload: CodeSearchQueryPayload,
    db: Session = Depends(get_db),
):
    """Perform lexical, semantic, or hybrid retrieval across snapshot chunks."""
    service = CodeSearchService(db=db)
    res = await service.search(
        repository_id=repository_id,
        snapshot_id=snapshot_id,
        query=payload.query,
        mode=payload.mode,
        language=payload.language,
        file_path=payload.file_path,
        symbol_type=payload.symbol_type,
        limit=payload.limit,
    )
    return CodeSearchResponse(**res)


@repo_search_router.get(
    "/{repository_id}/snapshots/{snapshot_id}/chunks/{chunk_id}",
    response_model=CodeChunkDetailResponse,
    summary="Get chunk detail and full content",
)
def get_chunk_detail(
    repository_id: str,
    snapshot_id: str,
    chunk_id: str,
    db: Session = Depends(get_db),
):
    """Retrieve full content and coordinate metadata for a single indexed chunk."""
    chunk = db.execute(
        select(CodeChunk).where(
            CodeChunk.id == chunk_id,
            CodeChunk.repository_id == repository_id,
            CodeChunk.snapshot_id == snapshot_id,
        )
    ).scalar_one_or_none()

    if not chunk:
        raise NotFoundError("CodeChunk", chunk_id)

    return CodeChunkDetailResponse(
        id=chunk.id,
        index_run_id=chunk.index_run_id,
        repository_id=chunk.repository_id,
        snapshot_id=chunk.snapshot_id,
        relative_path=chunk.relative_path,
        file_name=chunk.file_name,
        language=chunk.language,
        chunk_index=chunk.chunk_index,
        chunk_type=chunk.chunk_type,
        symbol_name=chunk.symbol_name,
        symbol_type=chunk.symbol_type,
        start_line=chunk.start_line,
        end_line=chunk.end_line,
        start_column=chunk.start_column,
        end_column=chunk.end_column,
        content=chunk.content,
        content_hash=chunk.content_hash,
        chunk_fingerprint=chunk.chunk_fingerprint,
        has_embedding=bool(chunk.embedding is not None),
        metadata_json=chunk.metadata_json or {},
        citation=f"{chunk.relative_path}:L{chunk.start_line}-L{chunk.end_line}",
    )


@repo_search_router.post(
    "/{repository_id}/snapshots/{snapshot_id}/qa",
    response_model=QAResponse,
    summary="Ask an evidence-backed repository question",
)
async def ask_question(
    repository_id: str,
    snapshot_id: str,
    payload: QAPayload,
    db: Session = Depends(get_db),
):
    """Execute grounded Q&A with strict evidence validation and prompt-injection resistance."""
    service = RepositoryQAService(db=db)
    res = await service.answer_question(
        repository_id=repository_id,
        snapshot_id=snapshot_id,
        question=payload.question,
        retrieval_mode=payload.retrieval_mode,
        prefer_llm=payload.prefer_llm,
    )
    return QAResponse(**res)
