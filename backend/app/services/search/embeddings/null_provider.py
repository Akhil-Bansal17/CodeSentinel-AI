"""Null embedding provider when semantic search is unconfigured or disabled."""

from typing import List
from backend.app.services.search.embeddings.base import BaseEmbeddingProvider


class NullEmbeddingProvider(BaseEmbeddingProvider):
    """Fallback provider when no embedding model or endpoint is configured."""

    @property
    def name(self) -> str:
        return "none"

    @property
    def model_name(self) -> str:
        return "unconfigured"

    @property
    def dimension(self) -> int:
        return 0

    def is_available(self) -> bool:
        return False

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        return []

    def embed_query(self, query: str) -> List[float]:
        return []
