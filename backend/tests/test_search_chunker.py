"""Tests for Phase 6 source code chunking and symbol indexing."""

import pytest
from backend.app.services.search.chunker import (
    CodeChunkDraft,
    SourceChunker,
    compute_chunk_fingerprint,
    compute_sha256,
)
from backend.app.services.search.indexing_service import is_sensitive_or_ignored


def test_chunk_python_syntax():
    """Verify AST-based chunking of Python functions, classes, and imports."""
    py_code = (
        "import os\n"
        "from typing import List\n\n"
        "class Calculator:\n"
        "    def __init__(self, val: int):\n"
        "        self.val = val\n\n"
        "    def add(self, x: int) -> int:\n"
        "        return self.val + x\n\n"
        "def compute_total(items: List[int]) -> int:\n"
        "    total = 0\n"
        "    for item in items:\n"
        "        total += item\n"
        "    return total\n"
    )

    chunks = SourceChunker.chunk_file(
        snapshot_id="snap-test-1",
        relative_path="src/calc.py",
        content=py_code,
        language="Python",
    )

    assert len(chunks) >= 3

    # Check import chunk
    import_chunks = [c for c in chunks if c.chunk_type == "import"]
    assert len(import_chunks) == 1
    assert "import os" in import_chunks[0].content
    assert import_chunks[0].start_line == 1

    # Check class chunk
    class_chunks = [c for c in chunks if c.chunk_type == "class" and c.symbol_name == "Calculator"]
    assert len(class_chunks) == 1
    assert class_chunks[0].symbol_type == "class"

    # Check function chunk
    func_chunks = [c for c in chunks if c.symbol_name == "compute_total"]
    assert len(func_chunks) == 1
    assert func_chunks[0].chunk_type == "function"
    assert func_chunks[0].start_line >= 10
    assert func_chunks[0].content_hash == compute_sha256(func_chunks[0].content)


def test_chunk_markdown_documentation():
    """Verify heading-based chunking of documentation files."""
    md_content = (
        "# Overview\n"
        "CodeSentinel AI provides automated engineering intelligence.\n\n"
        "## Ingestion Architecture\n"
        "Phase 1 ingests immutable repository snapshots.\n"
        "Files are validated against safe boundary checks.\n\n"
        "## Static Analysis\n"
        "Phase 2 parses AST constructs deterministically.\n"
    )

    chunks = SourceChunker.chunk_file(
        snapshot_id="snap-test-1",
        relative_path="docs/architecture.md",
        content=md_content,
        language="Markdown",
    )

    assert len(chunks) == 3
    assert chunks[0].symbol_name == "Overview"
    assert chunks[0].chunk_type == "doc"
    assert chunks[1].symbol_name == "Ingestion Architecture"
    assert chunks[2].symbol_name == "Static Analysis"


def test_chunk_line_window_fallback():
    """Verify sliding line window fallback for generic text or unsupported files."""
    text_content = "\n".join([f"Config entry {i}: value={i * 2}" for i in range(1, 120)])

    chunks = SourceChunker.chunk_file(
        snapshot_id="snap-test-1",
        relative_path="configs/system.conf",
        content=text_content,
        language="Configuration",
    )

    assert len(chunks) >= 2
    for c in chunks:
        assert c.chunk_type == "code_block"
        assert c.start_line <= c.end_line
        assert c.content_hash == compute_sha256(c.content)


def test_deterministic_fingerprint():
    """Verify that chunk fingerprints are 100% deterministic given identical inputs."""
    h = compute_sha256("def hello(): pass")
    fp1 = compute_chunk_fingerprint("snap-1", "app/main.py", 1, 5, h)
    fp2 = compute_chunk_fingerprint("snap-1", "app/main.py", 1, 5, h)
    fp_different = compute_chunk_fingerprint("snap-2", "app/main.py", 1, 5, h)

    assert fp1 == fp2
    assert fp1 != fp_different


def test_sensitive_file_exclusion():
    """Verify that sensitive credentials and vendor paths are correctly identified for exclusion."""
    assert is_sensitive_or_ignored(".env") is True
    assert is_sensitive_or_ignored(".env.local") is True
    assert is_sensitive_or_ignored("id_rsa") is True
    assert is_sensitive_or_ignored("certs/server.pem") is True
    assert is_sensitive_or_ignored("node_modules/pkg/index.js") is True
    assert is_sensitive_or_ignored(".git/config") is True
    assert is_sensitive_or_ignored("src/services/auth.py") is False
