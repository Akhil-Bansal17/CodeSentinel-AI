"""Semantic code search engine using vector cosine similarity.

Retrieves chunks by computing cosine similarity against dense vector embeddings.
Enforces vector dimension consistency and repository snapshot boundaries.
"""

import math
from typing import List, Optional, Tuple

from backend.app.models.base import CodeChunk
from backend.app.services.search.embeddings.base import BaseEmbeddingProvider


class SemanticSearchResult:
    """Diagnostic result item from semantic vector retrieval."""

    def __init__(
        self,
        chunk: CodeChunk,
        score: float,
        rank: int,
    ):
        self.chunk = chunk
        self.score = round(score, 4)
        self.rank = rank


def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    """Compute cosine similarity between two float vectors."""
    if not vec_a or not vec_b or len(vec_a) != len(vec_b):
        return 0.0

    dot = 0.0
    norm_a = 0.0
    norm_b = 0.0

    for a, b in zip(vec_a, vec_b):
        dot += a * b
        norm_a += a * a
        norm_b += b * b

    if norm_a <= 1e-9 or norm_b <= 1e-9:
        return 0.0

    sim = dot / (math.sqrt(norm_a) * math.sqrt(norm_b))
    # Bound between 0.0 and 1.0 for scoring
    return max(0.0, min(1.0, (sim + 1.0) / 2.0))


class SemanticSearchEngine:
    """Retrieval engine executing cosine similarity on embedded code chunks."""

    def __init__(self, chunks: List[CodeChunk], provider: BaseEmbeddingProvider):
        self.chunks = chunks
        self.provider = provider

    def search(
        self,
        query: str,
        limit: int = 20,
        language_filter: Optional[str] = None,
        file_path_filter: Optional[str] = None,
        symbol_type_filter: Optional[str] = None,
    ) -> List[SemanticSearchResult]:
        """Perform semantic search against indexed chunk vectors."""
        if not self.provider.is_available() or not query.strip():
            return []

        query_vec = self.provider.embed_query(query)
        if not query_vec:
            return []

        scores: List[Tuple[CodeChunk, float]] = []

        for chunk in self.chunks:
            # Must have embedding with matching dimension
            if not chunk.embedding or len(chunk.embedding) != len(query_vec):
                continue

            # Apply filters
            if language_filter and chunk.language.lower() != language_filter.lower():
                continue
            if file_path_filter and file_path_filter.lower() not in chunk.relative_path.lower():
                continue
            if symbol_type_filter and (chunk.symbol_type or "").lower() != symbol_type_filter.lower():
                continue

            sim = cosine_similarity(query_vec, chunk.embedding)
            if sim > 0.1:
                scores.append((chunk, sim))

        scores.sort(key=lambda x: x[1], reverse=True)

        return [
            SemanticSearchResult(chunk=c, score=score, rank=idx + 1)
            for idx, (c, score) in enumerate(scores[:limit])
        ]
