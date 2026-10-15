"""Provider registry and factory for vector embeddings."""

from typing import Optional
from backend.app.core.config import settings
from backend.app.services.search.embeddings.base import BaseEmbeddingProvider
from backend.app.services.search.embeddings.local_provider import ConfiguredHttpEmbeddingProvider
from backend.app.services.search.embeddings.null_provider import NullEmbeddingProvider
from backend.app.services.search.embeddings.test_provider import DeterministicTestEmbeddingProvider


def get_embedding_provider(provider_override: Optional[str] = None) -> BaseEmbeddingProvider:
    """Return configured embedding provider instance based on settings or override."""
    selected = (provider_override or settings.EMBEDDING_PROVIDER).lower()

    if selected == "test":
        return DeterministicTestEmbeddingProvider(dimension=settings.EMBEDDING_DIMENSION)

    if selected in {"local", "openai_compatible", "ollama", "http"}:
        return ConfiguredHttpEmbeddingProvider()

    return NullEmbeddingProvider()
