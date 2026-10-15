"""Abstract base class for semantic vector embedding providers."""

from abc import ABC, abstractmethod
from typing import List, Optional


class BaseEmbeddingProvider(ABC):
    """Interface for embedding text into dense vector representations."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Provider identifier (e.g. 'none', 'test', 'openai_compatible', 'ollama')."""
        pass

    @property
    @abstractmethod
    def model_name(self) -> str:
        """Underlying model identifier."""
        pass

    @property
    @abstractmethod
    def dimension(self) -> int:
        """Expected output vector dimension."""
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """Check whether the embedding provider is configured, reachable, and ready."""
        pass

    @abstractmethod
    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """Generate vector embeddings for a list of text snippets."""
        pass

    @abstractmethod
    def embed_query(self, query: str) -> List[float]:
        """Generate a single vector embedding for a search or Q&A query."""
        pass
