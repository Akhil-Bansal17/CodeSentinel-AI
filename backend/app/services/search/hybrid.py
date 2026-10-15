"""Deterministic hybrid retrieval engine combining lexical BM25 and semantic vector scores.

Implements Reciprocal Rank Fusion (RRF) and linear score normalization.
Eliminates duplicate chunks and preserves full retrieval diagnostics.
"""

from typing import Dict, List, Optional

from backend.app.models.base import CodeChunk
from backend.app.services.search.embeddings.base import BaseEmbeddingProvider
from backend.app.services.search.lexical import BM25SearchEngine, LexicalSearchResult
from backend.app.services.search.semantic import SemanticSearchEngine, SemanticSearchResult


class HybridSearchResult:
    """Consolidated hybrid search result with ranking diagnostics."""

    def __init__(
        self,
        chunk: CodeChunk,
        combined_score: float,
        rank: int,
        lexical_score: Optional[float] = None,
        semantic_score: Optional[float] = None,
        lexical_rank: Optional[int] = None,
        semantic_rank: Optional[int] = None,
        matched_terms: Optional[List[str]] = None,
    ):
        self.chunk = chunk
        self.combined_score = round(combined_score, 4)
        self.rank = rank
        self.lexical_score = lexical_score
        self.semantic_score = semantic_score
        self.lexical_rank = lexical_rank
        self.semantic_rank = semantic_rank
        self.matched_terms = matched_terms or []


class HybridSearchEngine:
    """Combines BM25 lexical results and vector semantic results."""

    def __init__(self, chunks: List[CodeChunk], provider: BaseEmbeddingProvider):
        self.chunks = chunks
        self.provider = provider
        self.lexical_engine = BM25SearchEngine(chunks)
        self.semantic_engine = SemanticSearchEngine(chunks, provider)

    def search(
        self,
        query: str,
        limit: int = 20,
        language_filter: Optional[str] = None,
        file_path_filter: Optional[str] = None,
        symbol_type_filter: Optional[str] = None,
        rrf_k: int = 60,
    ) -> List[HybridSearchResult]:
        """Perform hybrid retrieval using Reciprocal Rank Fusion."""
        # 1. Fetch lexical results
        lexical_results = self.lexical_engine.search(
            query=query,
            limit=limit * 2,
            language_filter=language_filter,
            file_path_filter=file_path_filter,
            symbol_type_filter=symbol_type_filter,
        )

        # 2. Fetch semantic results if provider is available
        semantic_results: List[SemanticSearchResult] = []
        if self.provider.is_available():
            semantic_results = self.semantic_engine.search(
                query=query,
                limit=limit * 2,
                language_filter=language_filter,
                file_path_filter=file_path_filter,
                symbol_type_filter=symbol_type_filter,
            )

        # If semantic is unavailable, return lexical directly wrapped in hybrid format
        if not semantic_results:
            return [
                HybridSearchResult(
                    chunk=res.chunk,
                    combined_score=res.score,
                    rank=res.rank,
                    lexical_score=res.score,
                    semantic_score=None,
                    lexical_rank=res.rank,
                    semantic_rank=None,
                    matched_terms=res.matched_terms,
                )
                for res in lexical_results[:limit]
            ]

        # 3. Combine scores using Reciprocal Rank Fusion (RRF)
        # RRF score = sum( 1 / (k + rank) )
        chunk_map: Dict[str, CodeChunk] = {}
        rrf_scores: Dict[str, float] = {}
        lex_data: Dict[str, tuple] = {}  # chunk_id -> (score, rank, terms)
        sem_data: Dict[str, tuple] = {}  # chunk_id -> (score, rank)

        for res in lexical_results:
            cid = res.chunk.id
            chunk_map[cid] = res.chunk
            rrf_scores[cid] = rrf_scores.get(cid, 0.0) + (1.0 / (rrf_k + res.rank))
            lex_data[cid] = (res.score, res.rank, res.matched_terms)

        for res in semantic_results:
            cid = res.chunk.id
            chunk_map[cid] = res.chunk
            rrf_scores[cid] = rrf_scores.get(cid, 0.0) + (1.0 / (rrf_k + res.rank))
            sem_data[cid] = (res.score, res.rank)

        # Sort candidate IDs by combined RRF score
        sorted_ids = sorted(rrf_scores.keys(), key=lambda x: rrf_scores[x], reverse=True)
        max_rrf = rrf_scores[sorted_ids[0]] if sorted_ids else 1.0

        results: List[HybridSearchResult] = []
        for rank, cid in enumerate(sorted_ids[:limit]):
            chunk = chunk_map[cid]
            norm_combined = rrf_scores[cid] / max_rrf if max_rrf > 0 else 0.0

            l_score, l_rank, l_terms = lex_data.get(cid, (None, None, []))
            s_score, s_rank = sem_data.get(cid, (None, None))

            results.append(
                HybridSearchResult(
                    chunk=chunk,
                    combined_score=norm_combined,
                    rank=rank + 1,
                    lexical_score=l_score,
                    semantic_score=s_score,
                    lexical_rank=l_rank,
                    semantic_rank=s_rank,
                    matched_terms=l_terms,
                )
            )

        return results
