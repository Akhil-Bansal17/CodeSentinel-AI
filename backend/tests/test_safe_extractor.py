import io
import tarfile
import zipfile
import pytest
from pathlib import Path

from backend.app.core.exceptions import RepositoryLimitExceededError, SecurityViolationError
from backend.app.services.safe_extractor import (
    extract_tar_archive_safely,
    extract_zip_archive_safely,
)


def create_tar_in_memory(members_dict):
    """Create in-memory tar.gz archive with specified {path: content_bytes}."""
    fileobj = io.BytesIO()
    with tarfile.open(fileobj=fileobj, mode="w:gz") as tar:
        for name, data in members_dict.items():
            ti = tarfile.TarInfo(name=name)
            ti.size = len(data)
            tar.addfile(ti, io.BytesIO(data))
    fileobj.seek(0)
    return fileobj


def test_safe_tar_extraction_success(tmp_path):
    """Verify normal valid tar archives extract cleanly."""
    archive_file = tmp_path / "valid.tar.gz"
    dest_dir = tmp_path / "extracted"

    fileobj = create_tar_in_memory({
        "repo/main.py": b"print('hello world')",
        "repo/README.md": b"# Test Repo",
    })
    archive_file.write_bytes(fileobj.read())

    workspace = extract_tar_archive_safely(archive_file, dest_dir)
    assert workspace.exists()
    assert (workspace / "main.py").exists()
    assert (workspace / "README.md").exists()


def test_tar_slip_traversal_rejection(tmp_path):
    """Reject tar archives containing path traversal escape attempts."""
    archive_file = tmp_path / "malicious.tar.gz"
    dest_dir = tmp_path / "extracted"

    fileobj = create_tar_in_memory({
        "../../etc/evil.txt": b"malicious content",
    })
    archive_file.write_bytes(fileobj.read())

    with pytest.raises(SecurityViolationError, match="path traversal|escape"):
        extract_tar_archive_safely(archive_file, dest_dir)


def test_tar_drive_letter_prefix_rejection(tmp_path):
    """Reject Windows drive letter prefixes inside archive member paths."""
    archive_file = tmp_path / "drive_prefix.tar.gz"
    dest_dir = tmp_path / "extracted"

    fileobj = create_tar_in_memory({
        "C:/evil.txt": b"content",
    })
    archive_file.write_bytes(fileobj.read())

    with pytest.raises(SecurityViolationError, match="forbidden drive prefix"):
        extract_tar_archive_safely(archive_file, dest_dir)


def test_tar_max_file_count_limit(tmp_path):
    """Raise RepositoryLimitExceededError when file count exceeds limit."""
    archive_file = tmp_path / "many_files.tar.gz"
    dest_dir = tmp_path / "extracted"

    files = {f"file_{i}.txt": b"x" for i in range(15)}
    fileobj = create_tar_in_memory(files)
    archive_file.write_bytes(fileobj.read())

    with pytest.raises(RepositoryLimitExceededError, match="maximum allowed files limit"):
        extract_tar_archive_safely(archive_file, dest_dir, max_files=10)


def test_safe_zip_extraction_success(tmp_path):
    """Verify zip archives extract cleanly with ZipSlip protection."""
    archive_file = tmp_path / "valid.zip"
    dest_dir = tmp_path / "extracted_zip"

    with zipfile.ZipFile(archive_file, "w") as zf:
        zf.writestr("repo/app.py", "import os")
        zf.writestr("repo/config.json", "{}")

    workspace = extract_zip_archive_safely(archive_file, dest_dir)
    assert workspace.exists()
    assert (workspace / "app.py").exists()
