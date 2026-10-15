"""Configurable local / OpenAI-compatible embedding provider.

Connects to a locally hosted embedding endpoint (e.g. Ollama, vLLM, LocalAI)
or OpenAI-compatible service if explicitly configured in settings.
Handles network errors and timeouts gracefully.
"""

from typing import List, Optional
import httpx

from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.services.search.embeddings.base import BaseEmbeddingProvider


class ConfiguredHttpEmbeddingProvider(BaseEmbeddingProvider):
    """HTTP-based embedding provider connecting to local or configured endpoint."""

    def __init__(
        self,
        api_url: Optional[str] = None,
        api_key: Optional[str] = None,
        model_name: Optional[str] = None,
        dimension: Optional[int] = None,
    ):
        self._url = api_url or settings.EMBEDDING_API_URL or ""
        self._api_key = api_key or settings.EMBEDDING_API_KEY
        self._model = model_name or settings.EMBEDDING_MODEL
        self._dim = dimension or settings.EMBEDDING_DIMENSION
        self._timeout = 10.0

    @property
    def name(self) -> str:
        return "configured_http"

    @property
    def model_name(self) -> str:
        return self._model

    @property
    def dimension(self) -> int:
        return self._dim

    def is_available(self) -> bool:
        """Provider is considered available only if a URL is explicitly configured."""
        return bool(self._url and self._url.strip())

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        if not self.is_available() or not texts:
            return []

        headers = {"Content-Type": "application/json"}
        if self._api_key:
            headers["Authorization"] = f"Bearer {self._api_key}"

        payload = {
            "model": self._model,
            "input": texts,
        }

        try:
            with httpx.Client(timeout=self._timeout) as client:
                resp = client.post(self._url, json=payload, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    # Standard OpenAI embedding response: data.data[i].embedding
                    if "data" in data and isinstance(data["data"], list):
                        return [item["embedding"] for item in data["data"] if "embedding" in item]
                    # Ollama format: data.embedding
                    if "embedding" in data:
                        return [data["embedding"]]
        except Exception as exc:
            logger.warning("Failed to retrieve embeddings from %s: %s", self._url, exc)

        return []

    def embed_query(self, query: str) -> List[float]:
        results = self.embed_texts([query])
        return results[0] if results else []
