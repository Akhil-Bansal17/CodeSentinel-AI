import pytest
from pathlib import Path

from backend.app.core.exceptions import RepositoryLimitExceededError
from backend.app.services.file_discovery import (
    count_file_lines,
    discover_repository_files,
    is_content_binary,
    is_sensitive_filename,
)
from backend.app.services.metrics_calculator import calculate_repository_metrics


def test_line_counting_conventions(tmp_path):
    """Verify accurate line counting across different newline conventions."""
    f_lf = tmp_path / "lf.txt"
    f_lf.write_bytes(b"line1\nline2\nline3\n")
    assert count_file_lines(f_lf) == 3

    f_crlf = tmp_path / "crlf.txt"
    f_crlf.write_bytes(b"line1\r\nline2\r\n")
    assert count_file_lines(f_crlf) == 2

    f_no_final = tmp_path / "no_final.txt"
    f_no_final.write_bytes(b"single line without trailing newline")
    assert count_file_lines(f_no_final) == 1

    f_empty = tmp_path / "empty.txt"
    f_empty.write_bytes(b"")
    assert count_file_lines(f_empty) == 0


def test_binary_content_detection():
    """Verify binary sample inspection identifies null bytes and control chars."""
    assert is_content_binary(b"Hello world\nThis is pure text\n") is False
    assert is_content_binary(b"GIF89a\x00\x01\x00\x01\x00\x00") is True
    assert is_content_binary(b"\x00\x01\x02\x03\x04\x05") is True


def test_sensitive_filename_detection():
    """Verify secret and credential files are flagged."""
    assert is_sensitive_filename(".env") is True
    assert is_sensitive_filename(".env.production") is True
    assert is_sensitive_filename("id_rsa") is True
    assert is_sensitive_filename("server.key") is True
    assert is_sensitive_filename("client_secrets.json") is True
    assert is_sensitive_filename("main.py") is False


def test_file_discovery_with_ignored_directories(tmp_path):
    """Verify default ignored directories (.git, node_modules, etc.) are excluded."""
    # Create valid files
    (tmp_path / "src").mkdir()
    (tmp_path / "src" / "index.ts").write_text("console.log('hi');\n")
    (tmp_path / "README.md").write_text("# Project\n")

    # Create ignored directories
    (tmp_path / "node_modules").mkdir()
    (tmp_path / "node_modules" / "pkg.js").write_text("// dependency\n")

    (tmp_path / ".git").mkdir()
    (tmp_path / ".git" / "config").write_text("[core]\n")

    (tmp_path / ".venv").mkdir()
    (tmp_path / ".venv" / "pyvenv.cfg").write_text("home = ...\n")

    result = discover_repository_files(tmp_path)

    # Discovered files should only include index.ts and README.md
    rel_paths = {f.relative_path for f in result.files}
    assert "src/index.ts" in rel_paths
    assert "README.md" in rel_paths
    assert not any("node_modules" in p for p in rel_paths)
    assert not any(".git" in p for p in rel_paths)
    assert not any(".venv" in p for p in rel_paths)

    assert result.total_files == 2
    assert result.source_files == 1  # index.ts is source, README.md is doc


def test_deterministic_metrics_calculation(tmp_path):
    """Verify deterministic metrics calculation accurately classifies files and LOC."""
    (tmp_path / "app.py").write_text("def hello():\n    return 42\n")
    (tmp_path / "types.ts").write_text("export type ID = string;\n")
    (tmp_path / "package.json").write_text('{"name": "test"}\n')

    discovery = discover_repository_files(tmp_path)
    metrics = calculate_repository_metrics(discovery)

    summary = metrics["summary"]
    assert summary["total_files"] == 3
    assert summary["source_files"] == 2
    assert summary["total_lines_of_code"] > 0

    lang_dist = metrics["language_distribution"]
    assert "Python" in lang_dist
    assert "TypeScript" in lang_dist
    assert "JSON" in lang_dist

    # Verify largest files deterministic order
    largest = metrics["largest_files"]
    assert len(largest) == 3
    assert largest[0]["size_bytes"] >= largest[1]["size_bytes"]
