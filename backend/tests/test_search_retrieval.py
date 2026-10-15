"""Tests for lexical, semantic, and hybrid code retrieval."""

import pytest
from backend.app.models.base import CodeChunk
from backend.app.services.search.embeddings.null_provider import NullEmbeddingProvider
from backend.app.services.search.embeddings.test_provider import DeterministicTestEmbeddingProvider
from backend.app.services.search.hybrid import HybridSearchEngine
from backend.app.services.search.lexical import BM25SearchEngine, tokenize_code
from backend.app.services.search.semantic import SemanticSearchEngine, cosine_similarity


def _make_dummy_chunk(
    cid: str,
    path: str,
    content: str,
    symbol_name: str = None,
    symbol_type: str = None,
    language: str = "Python",
    embedding: list = None,
) -> CodeChunk:
    chunk = CodeChunk(
        id=cid,
        index_run_id="run-1",
        repository_id="repo-1",
        snapshot_id="snap-1",
        relative_path=path,
        file_name=path.split("/")[-1],
        language=language,
        chunk_index=0,
        chunk_type=symbol_type or "code_block",
        symbol_name=symbol_name,
        symbol_type=symbol_type,
        start_line=1,
        end_line=10,
        content=content,
        content_hash="hash123",
        chunk_fingerprint=f"fp-{cid}",
        embedding=embedding,
        metadata_json={},
    )
    return chunk


def test_tokenize_code():
    """Verify code identifier splitting for camelCase and snake_case."""
    tokens = tokenize_code("getUserProfileByID calculate_codebase_health")
    assert "getuserprofilebyid" in tokens
    assert "user" in tokens
    assert "profile" in tokens
    assert "calculate" in tokens
    assert "codebase" in tokens
    assert "health" in tokens


def test_lexical_bm25_symbol_boost():
    """Verify exact symbol boost places matching function at top rank."""
    chunks = [
        _make_dummy_chunk(
            "1",
            "app/auth.py",
            "def authenticate_user(token: str):\n    return verify_jwt(token)",
            symbol_name="authenticate_user",
            symbol_type="function",
        ),
        _make_dummy_chunk(
            "2",
            "app/db.py",
            "# User database connection\ndef get_connection():\n    return pool.get()",
            symbol_name="get_connection",
            symbol_type="function",
        ),
        _make_dummy_chunk(
            "3",
            "app/routes.py",
            "@router.get('/users')\ndef list_users():\n    return []",
            symbol_name="list_users",
            symbol_type="function",
        ),
    ]

    engine = BM25SearchEngine(chunks)
    results = engine.search("authenticate_user", limit=5)

    assert len(results) >= 1
    assert results[0].chunk.symbol_name == "authenticate_user"
    assert results[0].score > 0.5


def test_semantic_retrieval_and_cosine_similarity():
    """Verify vector cosine retrieval returns closest semantic match."""
    provider = DeterministicTestEmbeddingProvider(dimension=32)

    c1_text = "def calculate_health_score(metrics): return sum(metrics) / len(metrics)"
    c2_text = "import logging\nlogger = logging.getLogger(__name__)"

    chunks = [
        _make_dummy_chunk("1", "health.py", c1_text, symbol_name="calculate_health_score", embedding=provider.embed_query(c1_text)),
        _make_dummy_chunk("2", "logging.py", c2_text, symbol_name="logger", embedding=provider.embed_query(c2_text)),
    ]

    engine = SemanticSearchEngine(chunks, provider)
    results = engine.search("calculate health score metrics", limit=2)

    assert len(results) == 2
    assert results[0].chunk.symbol_name == "calculate_health_score"
    assert results[0].score > results[1].score


def test_hybrid_rrf_combination():
    """Verify hybrid search fuses lexical and semantic scores without duplicates."""
    provider = DeterministicTestEmbeddingProvider(dimension=32)

    c1_text = "def execute_analysis(repo_id: str): pass"
    c2_text = "def check_vulnerabilities(deps: list): pass"

    chunks = [
        _make_dummy_chunk("1", "analysis.py", c1_text, symbol_name="execute_analysis", embedding=provider.embed_query(c1_text)),
        _make_dummy_chunk("2", "security.py", c2_text, symbol_name="check_vulnerabilities", embedding=provider.embed_query(c2_text)),
    ]

    engine = HybridSearchEngine(chunks, provider)
    results = engine.search("execute analysis repository", limit=5)

    assert len(results) >= 1
    assert results[0].chunk.id == "1"
    assert results[0].lexical_score is not None
    assert results[0].semantic_score is not None


def test_retrieval_filters():
    """Verify language and file path filtering."""
    chunks = [
        _make_dummy_chunk("1", "src/auth.py", "def login(): pass", language="Python"),
        _make_dummy_chunk("2", "frontend/src/auth.ts", "export function login() {}", language="TypeScript"),
    ]

    engine = BM25SearchEngine(chunks)
    py_only = engine.search("login", language_filter="Python")
    assert len(py_only) == 1
    assert py_only[0].chunk.language == "Python"

    ts_only = engine.search("login", language_filter="TypeScript")
    assert len(ts_only) == 1
    assert ts_only[0].chunk.language == "TypeScript"
