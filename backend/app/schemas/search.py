"""Pydantic request and response schemas for Phase 6 Code Search & Repository Q&A."""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class StartIndexPayload(BaseModel):
    """Payload to request indexing of a repository snapshot."""

    force_reindex: bool = Field(default=False, description="Whether to drop old chunks and reindex")
    local_path_override: Optional[str] = Field(default=None, description="Local path override if applicable")


class CodeIndexRunResponse(BaseModel):
    """Status and summary of an index run."""

    id: str
    repository_id: str
    snapshot_id: str
    status: str
    started_at: str
    completed_at: Optional[str] = None
    index_version: str = "1.0.0"
    chunk_count: int = 0
    files_indexed: int = 0
    files_skipped: int = 0
    embedding_provider: Optional[str] = None
    embedding_model: Optional[str] = None
    embedding_dimension: Optional[int] = None
    failure_code: Optional[str] = None
    failure_reason: Optional[str] = None
    summary_json: Dict[str, Any] = Field(default_factory=dict)


class SearchCapabilitiesResponse(BaseModel):
    """Available search modes and provider capabilities."""

    lexical_available: bool
    semantic_available: bool
    hybrid_available: bool
    embedding_provider: str
    embedding_model: str
    index_status: str
    chunk_count: int
    llm_available: bool
    llm_provider: str
    warnings: List[str] = Field(default_factory=list)


class CodeSearchQueryPayload(BaseModel):
    """Payload to perform code retrieval."""

    query: str = Field(..., min_length=1, max_length=500, description="Search query or symbol name")
    mode: str = Field(default="lexical", description="Search mode: lexical, semantic, or hybrid")
    language: Optional[str] = Field(default=None, description="Filter by language (e.g. Python, TypeScript)")
    file_path: Optional[str] = Field(default=None, description="Filter by path substring or pattern")
    symbol_type: Optional[str] = Field(default=None, description="Filter by symbol type (e.g. function, class, doc)")
    limit: int = Field(default=20, ge=1, le=100, description="Maximum number of chunks to return")


class SearchResultItem(BaseModel):
    """Individual retrieved code chunk item."""

    chunk_id: str
    repository_id: str
    snapshot_id: str
    relative_path: str
    file_name: str
    language: str
    chunk_type: str
    symbol_name: Optional[str] = None
    symbol_type: Optional[str] = None
    start_line: int
    end_line: int
    start_column: Optional[int] = None
    end_column: Optional[int] = None
    score: float
    rank: int
    retrieval_mode: str
    content_hash: str
    excerpt: str
    citation: str
    lexical_score: Optional[float] = None
    semantic_score: Optional[float] = None
    matched_terms: List[str] = Field(default_factory=list)


class CodeSearchResponse(BaseModel):
    """Result of a code search query."""

    query: str
    mode_requested: str
    mode_used: str
    results: List[SearchResultItem]
    total_results: int
    capabilities: SearchCapabilitiesResponse
    warning: Optional[str] = None


class CodeChunkDetailResponse(BaseModel):
    """Complete detail of an indexed code chunk."""

    id: str
    index_run_id: str
    repository_id: str
    snapshot_id: str
    relative_path: str
    file_name: str
    language: str
    chunk_index: int
    chunk_type: str
    symbol_name: Optional[str] = None
    symbol_type: Optional[str] = None
    start_line: int
    end_line: int
    start_column: Optional[int] = None
    end_column: Optional[int] = None
    content: str
    content_hash: str
    chunk_fingerprint: str
    has_embedding: bool = False
    metadata_json: Dict[str, Any] = Field(default_factory=dict)
    citation: str


class QAPayload(BaseModel):
    """Payload to ask an evidence-backed repository question."""

    question: str = Field(..., min_length=2, max_length=1000, description="Natural language question about repository")
    retrieval_mode: str = Field(default="hybrid", description="Retrieval mode: lexical, semantic, hybrid")
    prefer_llm: bool = Field(default=False, description="Attempt LLM answer generation if provider is configured")


class EvidenceItemResponse(BaseModel):
    """Traceable evidence item supporting a Q&A answer."""

    evidence_id: str
    chunk_id: str
    repository_id: str
    snapshot_id: str
    relative_path: str
    start_line: int
    end_line: int
    symbol_name: Optional[str] = None
    symbol_type: Optional[str] = None
    excerpt: str
    content_hash: str
    score: float
    retrieval_mode: str
    citation: str


class QAResponse(BaseModel):
    """Evidence-grounded question answer response."""

    question: str
    answer: str
    repository_id: str
    snapshot_id: str
    retrieval_mode: str
    confidence: str
    evidence_sufficiency: str
    llm_used: bool
    llm_provider: Optional[str] = None
    evidence: List[EvidenceItemResponse]
    citations: List[str]
    warnings: List[str] = Field(default_factory=list)
