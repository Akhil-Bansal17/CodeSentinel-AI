"""Search orchestration service for CodeSentinel AI.

Coordinates BM25 lexical, dense vector semantic, and RRF hybrid retrieval
across indexed repository snapshots with strict isolation and capability reporting.
"""

from typing import Any, Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.core.exceptions import NotFoundError, ValidationError
from backend.app.models.base import CodeChunk, CodeIndexRun, Repository, RepositorySnapshot
from backend.app.services.search.embeddings.base import BaseEmbeddingProvider
from backend.app.services.search.embeddings.registry import get_embedding_provider
from backend.app.services.search.hybrid import HybridSearchEngine, HybridSearchResult
from backend.app.services.search.indexing_service import CodeIndexingService
from backend.app.services.search.lexical import BM25SearchEngine, LexicalSearchResult
from backend.app.services.search.semantic import SemanticSearchEngine, SemanticSearchResult


class SearchCapabilities:
    """Diagnostic capabilities descriptor for search and Q&A."""

    def __init__(
        self,
        lexical_available: bool,
        semantic_available: bool,
        hybrid_available: bool,
        embedding_provider: str,
        embedding_model: str,
        index_status: str,
        chunk_count: int,
        llm_available: bool,
        llm_provider: str,
        warnings: Optional[List[str]] = None,
    ):
        self.lexical_available = lexical_available
        self.semantic_available = semantic_available
        self.hybrid_available = hybrid_available
        self.embedding_provider = embedding_provider
        self.embedding_model = embedding_model
        self.index_status = index_status
        self.chunk_count = chunk_count
        self.llm_available = llm_available
        self.llm_provider = llm_provider
        self.warnings = warnings or []

    def to_dict(self) -> Dict[str, Any]:
        return {
            "lexical_available": self.lexical_available,
            "semantic_available": self.semantic_available,
            "hybrid_available": self.hybrid_available,
            "embedding_provider": self.embedding_provider,
            "embedding_model": self.embedding_model,
            "index_status": self.index_status,
            "chunk_count": self.chunk_count,
            "llm_available": self.llm_available,
            "llm_provider": self.llm_provider,
            "warnings": self.warnings,
        }


class CodeSearchService:
    """Orchestrates multi-modal code search queries across repository snapshots."""

    def __init__(self, db: Session, embedding_provider: Optional[BaseEmbeddingProvider] = None):
        self.db = db
        self.provider = embedding_provider or get_embedding_provider()
        self.indexing_service = CodeIndexingService(db=db, embedding_provider=self.provider)

    def get_capabilities(self, repository_id: str, snapshot_id: str) -> SearchCapabilities:
        """Determine real search capabilities and index status for a snapshot."""
        run = self.db.execute(
            select(CodeIndexRun).where(
                CodeIndexRun.repository_id == repository_id,
                CodeIndexRun.snapshot_id == snapshot_id,
                CodeIndexRun.status == "completed",
            )
        ).scalars().first()

        index_status = run.status if run else "unindexed"
        chunk_count = run.chunk_count if run else 0

        # Check if chunks actually have embeddings
        has_embedded_chunks = False
        if run and run.chunk_count > 0:
            sample_chunk = self.db.execute(
                select(CodeChunk).where(
                    CodeChunk.snapshot_id == snapshot_id,
                    CodeChunk.embedding.isnot(None),
                ).limit(1)
            ).scalar_one_or_none()
            has_embedded_chunks = sample_chunk is not None

        sem_available = bool(self.provider.is_available() and has_embedded_chunks)
        lex_available = bool(run and run.chunk_count > 0)
        hyb_available = bool(lex_available and sem_available)

        warnings: List[str] = []
        if not lex_available:
            warnings.append("Snapshot has not been indexed yet. Trigger indexing to enable code search.")
        if not sem_available:
            if not self.provider.is_available():
                warnings.append("Semantic search is unavailable: no embedding provider is configured.")
            elif not has_embedded_chunks:
                warnings.append("Semantic search is unavailable: snapshot chunks do not contain embeddings.")

        return SearchCapabilities(
            lexical_available=lex_available,
            semantic_available=sem_available,
            hybrid_available=hyb_available,
            embedding_provider=self.provider.name,
            embedding_model=self.provider.model_name,
            index_status=index_status,
            chunk_count=chunk_count,
            llm_available=bool(settings.LLM_PROVIDER and settings.LLM_PROVIDER.lower() not in {"none", ""}),
            llm_provider=settings.LLM_PROVIDER,
            warnings=warnings,
        )

    async def search(
        self,
        repository_id: str,
        snapshot_id: str,
        query: str,
        mode: str = "lexical",
        language: Optional[str] = None,
        file_path: Optional[str] = None,
        symbol_type: Optional[str] = None,
        limit: int = 20,
    ) -> Dict[str, Any]:
        """Execute code search using requested retrieval mode."""
        clean_query = query.strip()
        if not clean_query:
            raise ValidationError("Search query cannot be empty.")

        # Ensure index exists
        run = await self.indexing_service.get_or_create_index(
            repository_id=repository_id,
            snapshot_id=snapshot_id,
        )

        capabilities = self.get_capabilities(repository_id, snapshot_id)

        # Retrieve all chunks for this snapshot
        chunks = self.db.execute(
            select(CodeChunk).where(
                CodeChunk.snapshot_id == snapshot_id,
                CodeChunk.repository_id == repository_id,
            ).order_by(CodeChunk.relative_path, CodeChunk.start_line)
        ).scalars().all()

        if not chunks:
            return {
                "query": clean_query,
                "mode_requested": mode,
                "mode_used": mode,
                "results": [],
                "total_results": 0,
                "capabilities": capabilities.to_dict(),
            }

        effective_mode = mode.lower()
        results_list: List[Dict[str, Any]] = []

        if effective_mode == "semantic":
            if not capabilities.semantic_available:
                # Honestly return empty results with capability warning rather than masking as lexical
                return {
                    "query": clean_query,
                    "mode_requested": "semantic",
                    "mode_used": "semantic",
                    "results": [],
                    "total_results": 0,
                    "capabilities": capabilities.to_dict(),
                    "warning": "Semantic vector search is unavailable because no embedding provider is configured or chunks lack embeddings.",
                }
            sem_engine = SemanticSearchEngine(chunks, self.provider)
            sem_results = sem_engine.search(
                query=clean_query,
                limit=limit,
                language_filter=language,
                file_path_filter=file_path,
                symbol_type_filter=symbol_type,
            )
            for res in sem_results:
                results_list.append(self._format_chunk_result(res.chunk, res.score, res.rank, "semantic"))

        elif effective_mode == "hybrid":
            hybrid_engine = HybridSearchEngine(chunks, self.provider)
            hyb_results = hybrid_engine.search(
                query=clean_query,
                limit=limit,
                language_filter=language,
                file_path_filter=file_path,
                symbol_type_filter=symbol_type,
            )
            effective_mode = "hybrid" if capabilities.semantic_available else "lexical_fallback"
            for res in hyb_results:
                res_dict = self._format_chunk_result(res.chunk, res.combined_score, res.rank, effective_mode)
                res_dict["lexical_score"] = res.lexical_score
                res_dict["semantic_score"] = res.semantic_score
                res_dict["matched_terms"] = res.matched_terms
                results_list.append(res_dict)

        else:  # default lexical
            effective_mode = "lexical"
            lex_engine = BM25SearchEngine(chunks)
            lex_results = lex_engine.search(
                query=clean_query,
                limit=limit,
                language_filter=language,
                file_path_filter=file_path,
                symbol_type_filter=symbol_type,
            )
            for res in lex_results:
                res_dict = self._format_chunk_result(res.chunk, res.score, res.rank, "lexical")
                res_dict["matched_terms"] = res.matched_terms
                results_list.append(res_dict)

        return {
            "query": clean_query,
            "mode_requested": mode,
            "mode_used": effective_mode,
            "results": results_list,
            "total_results": len(results_list),
            "capabilities": capabilities.to_dict(),
        }

    def _format_chunk_result(
        self,
        chunk: CodeChunk,
        score: float,
        rank: int,
        retrieval_mode: str,
    ) -> Dict[str, Any]:
        """Serialize CodeChunk into search result dictionary."""
        # Short excerpt bounded to 8 lines
        lines = chunk.content.split("\n")
        excerpt = "\n".join(lines[:8])
        if len(lines) > 8:
            excerpt += f"\n... [{len(lines) - 8} more lines]"

        return {
            "chunk_id": chunk.id,
            "repository_id": chunk.repository_id,
            "snapshot_id": chunk.snapshot_id,
            "relative_path": chunk.relative_path,
            "file_name": chunk.file_name,
            "language": chunk.language,
            "chunk_type": chunk.chunk_type,
            "symbol_name": chunk.symbol_name,
            "symbol_type": chunk.symbol_type,
            "start_line": chunk.start_line,
            "end_line": chunk.end_line,
            "start_column": chunk.start_column,
            "end_column": chunk.end_column,
            "score": round(score, 4),
            "rank": rank,
            "retrieval_mode": retrieval_mode,
            "content_hash": chunk.content_hash,
            "excerpt": excerpt,
            "citation": f"{chunk.relative_path}:L{chunk.start_line}-L{chunk.end_line}",
        }
