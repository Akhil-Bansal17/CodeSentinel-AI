"""Deterministic mock/test embedding provider for unit and integration testing.

Generates reproducible, normalized vectors via feature hashing.
Used strictly for testing vector indexing, persistence, and cosine similarity.
Does not make network calls or download models.
"""

import math
import re
from typing import List
from backend.app.services.search.embeddings.base import BaseEmbeddingProvider


class DeterministicTestEmbeddingProvider(BaseEmbeddingProvider):
    """Test embedding provider producing deterministic, normalized unit vectors."""

    def __init__(self, dimension: int = 64, model_name: str = "deterministic-test-embed-v1"):
        self._dim = dimension
        self._model = model_name

    @property
    def name(self) -> str:
        return "test"

    @property
    def model_name(self) -> str:
        return self._model

    @property
    def dimension(self) -> int:
        return self._dim

    def is_available(self) -> bool:
        return True

    def _hash_to_vector(self, text: str) -> List[float]:
        """Convert text into a deterministic, unit-normalized float vector."""
        vec = [0.0] * self._dim
        if not text.strip():
            return vec

        # Tokenize by alphanumeric words
        tokens = re.findall(r"\w+", text.lower())
        if not tokens:
            return vec

        for token in tokens:
            # Hash token across dimensions
            h = hash(token)
            bucket = abs(h) % self._dim
            sign = 1.0 if (h >> 1) % 2 == 0 else -1.0
            vec[bucket] += sign

        # L2 normalize vector
        norm = math.sqrt(sum(x * x for x in vec))
        if norm > 1e-9:
            vec = [x / norm for x in vec]

        return [round(x, 6) for x in vec]

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        return [self._hash_to_vector(t) for t in texts]

    def embed_query(self, query: str) -> List[float]:
        return self._hash_to_vector(query)
