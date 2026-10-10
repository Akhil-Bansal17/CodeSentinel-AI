"""Comprehensive Security Regression Tests for CodeSentinel AI Phase 1.

Verifies:
- ZipSlip, TarSlip, Windows drive prefixes, UNC paths
- Decompression bombs & forged header byte limits
- Archive path conflict safety & cleanup on failure
- SSRF prevention (IPv4/IPv6, private ranges, NAT64 embedded private IPs)
- Redirect protocol downgrade, credential stripping, port validation
- Local path traversal containment & error message information-disclosure protection
- Windows symlink cycle detection
- Sensitive secret file exclusion from line counting
"""

import io
import os
import tarfile
import tempfile
import zipfile
from pathlib import Path
import pytest

from backend.app.core.config import settings
from backend.app.core.exceptions import (
    RepositoryLimitExceededError,
    SecurityViolationError,
    SourceValidationError,
)
from backend.app.schemas.repository import RepositorySourceType
from backend.app.services.file_discovery import (
    discover_repository_files,
    is_sensitive_filename,
)
from backend.app.services.safe_extractor import (
    extract_tar_archive_safely,
    extract_zip_archive_safely,
)
from backend.app.services.source_validator import (
    is_ip_private_or_loopback,
    validate_and_normalize_local_path,
    validate_hostname_safe,
)


def _create_zip_in_memory(files_dict: dict) -> Path:
    """Helper creating a temporary zip file."""
    tmp = Path(tempfile.mkdtemp()) / "test.zip"
    with zipfile.ZipFile(tmp, "w") as zf:
        for name, data in files_dict.items():
            zf.writestr(name, data)
    return tmp


def _create_tar_in_memory(files_dict: dict) -> Path:
    """Helper creating a temporary tar.gz file."""
    tmp = Path(tempfile.mkdtemp()) / "test.tar.gz"
    with tarfile.open(tmp, "w:gz") as tar:
        for name, data in files_dict.items():
            ti = tarfile.TarInfo(name=name)
            ti.size = len(data)
            tar.addfile(ti, io.BytesIO(data))
    return tmp


# ==============================================================================
# Archive Extraction Security Regressions
# ==============================================================================

def test_zip_slip_relative_traversal_rejection(tmp_path):
    """Zip archives attempting relative path traversal ('../') must be rejected."""
    zip_path = _create_zip_in_memory({"../../evil.sh": b"#!/bin/sh\necho pwned"})
    dest = tmp_path / "extracted_zip"

    with pytest.raises(SecurityViolationError, match="path traversal|escape"):
        extract_zip_archive_safely(zip_path, dest)

    assert not (dest / "evil.sh").exists()
    assert not dest.exists() or len(list(dest.iterdir())) == 0


def test_zip_drive_letter_rejection(tmp_path):
    """Zip archives with Windows drive prefixes (C:/) must be rejected."""
    zip_path = _create_zip_in_memory({"C:/Windows/evil.dll": b"MZ"})
    dest = tmp_path / "extracted_zip"

    with pytest.raises(SecurityViolationError, match="forbidden drive prefix"):
        extract_zip_archive_safely(zip_path, dest)


def test_zip_unc_path_rejection(tmp_path):
    """Zip archives with UNC paths must be rejected."""
    zip_path = _create_zip_in_memory({"//attacker/share/evil.exe": b"MZ"})
    dest = tmp_path / "extracted_zip"

    with pytest.raises(SecurityViolationError, match="forbidden UNC path"):
        extract_zip_archive_safely(zip_path, dest)


def test_zip_forged_header_bomb_detection(tmp_path):
    """Zip archives where header file_size is small but actual stream is large must be stopped."""
    dest = tmp_path / "extracted_zip"

    # Create a zip file where header file_size says 100 bytes but payload is 10000 bytes
    zip_file = tmp_path / "forged.zip"
    with zipfile.ZipFile(zip_file, "w") as zf:
        zinfo = zipfile.ZipInfo("repo/bomb.txt")
        zinfo.file_size = 100  # Forged header size!
        zf.writestr(zinfo, b"A" * 15000)

    # limit max_extracted_bytes to 5000 bytes
    with pytest.raises(RepositoryLimitExceededError, match="exceeds maximum allowed"):
        extract_zip_archive_safely(zip_file, dest, max_extracted_bytes=5000)

    # Destination directory must be cleaned up on failure
    assert not (dest / "repo" / "bomb.txt").exists()


def test_tar_forged_bomb_expansion_ratio_rejection(tmp_path):
    """Tar archives with high expansion ratio (>10x above 1MB) must be rejected."""
    dest = tmp_path / "extracted_tar"

    # 1.5MB of repeated zeros compresses to < 2KB in gzip
    huge_data = b"\x00" * (1500 * 1024)
    tar_path = _create_tar_in_memory({"repo/big.bin": huge_data})

    with pytest.raises(RepositoryLimitExceededError, match="safe expansion ratio"):
        extract_tar_archive_safely(tar_path, dest, max_expansion_ratio=5.0)

    assert not (dest / "repo" / "big.bin").exists()


def test_archive_path_conflict_safety(tmp_path):
    """Archive with a file and directory conflict must fail safely."""
    dest = tmp_path / "extracted_conflict"

    # tar containing a directory 'foo' and a file 'foo'
    tmp_tar = tmp_path / "conflict.tar.gz"
    with tarfile.open(tmp_tar, "w:gz") as tar:
        dir_ti = tarfile.TarInfo(name="repo/conflict_item")
        dir_ti.type = tarfile.DIRTYPE
        tar.addfile(dir_ti)

        file_ti = tarfile.TarInfo(name="repo/conflict_item")
        file_ti.size = 5
        tar.addfile(file_ti, io.BytesIO(b"hello"))

    with pytest.raises(SecurityViolationError, match="Archive member conflict"):
        extract_tar_archive_safely(tmp_tar, dest)


def test_archive_truncated_tar_fails_safely(tmp_path):
    """Truncated or corrupted tar archives must fail safely without leaking workspace."""
    dest = tmp_path / "extracted_corrupted"
    bad_tar = tmp_path / "truncated.tar.gz"
    bad_tar.write_bytes(b"\x1f\x8b\x08\x00corrupted-random-bytes-not-a-tarball")

    with pytest.raises(Exception):
        extract_tar_archive_safely(bad_tar, dest)

    assert not dest.exists() or len(list(dest.iterdir())) == 0


# ==============================================================================
# Network & SSRF Security Regressions
# ==============================================================================

def test_ssrf_detects_all_prohibited_ipv4_and_ipv6():
    """Verify loopback, RFC 1918 private, link-local, multicast, and ULA addresses are blocked."""
    prohibited = [
        "127.0.0.1",
        "127.0.1.1",
        "::1",
        "10.0.0.1",
        "10.255.255.255",
        "172.16.0.1",
        "172.31.255.255",
        "192.168.0.1",
        "192.168.100.50",
        "169.254.169.254",  # AWS/Cloud metadata
        "224.0.0.1",        # Multicast
        "fe80::1",          # IPv6 link-local
        "fc00::1",          # IPv6 unique local (ULA)
        "fd00::1234",
    ]
    for ip in prohibited:
        assert is_ip_private_or_loopback(ip) is True, f"Failed for {ip}"


def test_ssrf_nat64_embedded_private_ip_rejection():
    """RFC 6052 NAT64 addresses embedding private or loopback IPv4 must be blocked."""
    # 64:ff9b::127.0.0.1 (hex 7f00:0001)
    nat64_loopback = "64:ff9b::7f00:1"
    assert is_ip_private_or_loopback(nat64_loopback) is True

    # 64:ff9b::192.168.1.1 (hex c0a8:0101)
    nat64_private = "64:ff9b::c0a8:101"
    assert is_ip_private_or_loopback(nat64_private) is True

    # 64:ff9b::169.254.169.254 (cloud metadata translated via NAT64)
    nat64_metadata = "64:ff9b::a9fe:a9fe"
    assert is_ip_private_or_loopback(nat64_metadata) is True


def test_ssrf_nat64_embedded_public_ip_permitted():
    """RFC 6052 NAT64 addresses embedding public IPv4 must be permitted."""
    # 64:ff9b::20.207.73.88 (GitHub public IPv4)
    nat64_github = "64:ff9b::14cf:4958"
    assert is_ip_private_or_loopback(nat64_github) is False


# ==============================================================================
# Filesystem Path Information Disclosure Protection
# ==============================================================================

def test_local_path_outside_allowed_roots_does_not_disclose_server_paths(tmp_path, monkeypatch):
    """Rejection message must NOT reveal configured internal root paths or host directory trees."""
    allowed_root = tmp_path / "secure_zone"
    allowed_root.mkdir()
    secret_dir = tmp_path / "super_secret_host_directory"
    secret_dir.mkdir()

    monkeypatch.setattr(settings, "LOCAL_REPOSITORY_ROOTS", str(allowed_root))

    with pytest.raises(SecurityViolationError) as exc_info:
        validate_and_normalize_local_path(str(secret_dir))

    err_str = str(exc_info.value)
    # Must NOT contain server usernames or resolved secret paths
    assert "super_secret_host_directory" not in err_str
    assert "secure_zone" not in err_str
    assert "Configured roots:" not in err_str
    assert "Directory is outside allowed repository roots." in err_str
    # Details dictionary must NOT echo resolved_path
    assert "resolved_path" not in getattr(exc_info.value, "details", {})


def test_nonexistent_local_path_does_not_echo_path(tmp_path, monkeypatch):
    """FileNotFoundError must NOT echo arbitrary requested server paths."""
    allowed_root = tmp_path / "zone"
    allowed_root.mkdir()
    monkeypatch.setattr(settings, "LOCAL_REPOSITORY_ROOTS", str(allowed_root))

    with pytest.raises(SourceValidationError) as exc_info:
        validate_and_normalize_local_path(str(allowed_root / "does_not_exist_abc123"))

    err_str = str(exc_info.value)
    assert "does_not_exist_abc123" not in err_str
    assert "does not exist or is inaccessible" in err_str


# ==============================================================================
# Symlink Cycle & Secret Exclusion Regressions
# ==============================================================================

def test_windows_symlink_cycle_detection(tmp_path):
    """Recursive directory symlinks must be pruned safely without causing infinite recursion."""
    repo = tmp_path / "cycle_repo"
    repo.mkdir()
    (repo / "main.py").write_text("print('safe')\n")

    sub = repo / "subfolder"
    sub.mkdir()
    (sub / "file.py").write_text("print('sub')\n")

    # Attempt to create a directory symlink back to repo or parent
    link_created = False
    try:
        loop_link = sub / "loop"
        loop_link.symlink_to(repo, target_is_directory=True)
        link_created = True
    except (OSError, NotImplementedError):
        # On Windows without Developer Mode, creating directory symlinks requires privileges
        pass

    result = discover_repository_files(repo)
    assert result.total_files >= 2
    # If symlink was created, file count must NOT explode to infinity
    if link_created:
        assert result.total_files < 10


def test_secret_files_excluded_from_line_counting(tmp_path):
    """Credentials and secrets must NEVER have line count computed or content parsed."""
    repo = tmp_path / "secrets_repo"
    repo.mkdir()

    sensitive_names = [
        ".env",
        ".env.production",
        "id_rsa",
        "id_ed25519",
        "server.key",
        "cert.pem",
        "client_secrets.json",
        "service_account.json",
    ]

    for name in sensitive_names:
        (repo / name).write_text("SUPER_SECRET_KEY=secret_token_12345\n")

    result = discover_repository_files(repo)
    for f in result.files:
        assert is_sensitive_filename(f.file_name) is True
        # Line count must be None to guarantee content was not read
        assert f.line_count is None, f"{f.file_name} had line_count {f.line_count}"
