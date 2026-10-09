import pytest
from pathlib import Path

from backend.app.core.config import settings
from backend.app.core.exceptions import SecurityViolationError, SourceValidationError
from backend.app.schemas.repository import RepositorySourceType
from backend.app.services.source_validator import (
    is_ip_private_or_loopback,
    validate_and_normalize_github_url,
    validate_and_normalize_local_path,
    validate_hostname_safe,
    validate_repository_source,
)


def test_valid_github_url_normalization():
    """Verify various valid public GitHub URLs normalize cleanly."""
    urls = [
        ("https://github.com/torvalds/linux", "https://github.com/torvalds/linux", "torvalds", "linux"),
        ("https://github.com/facebook/react.git", "https://github.com/facebook/react", "facebook", "react"),
        ("https://www.github.com/golang/go", "https://github.com/golang/go", "golang", "go"),
        ("https://github.com/psf/black/", "https://github.com/psf/black", "psf", "black"),
    ]
    for raw, expected_url, expected_owner, expected_repo in urls:
        source = validate_and_normalize_github_url(raw)
        assert source.source_type == RepositorySourceType.GITHUB
        assert source.source_url == expected_url
        assert source.owner == expected_owner
        assert source.repo_name == expected_repo
        assert source.source_identifier == f"github:{expected_owner}/{expected_repo}".lower()


def test_rejected_github_urls_unsupported_schemes():
    """Reject non-HTTPS schemes."""
    with pytest.raises(SourceValidationError, match="Only 'https://' URLs are supported"):
        validate_and_normalize_github_url("http://github.com/owner/repo")

    with pytest.raises(SourceValidationError, match="Only 'https://' URLs are supported"):
        validate_and_normalize_github_url("git@github.com:owner/repo.git")

    with pytest.raises(SourceValidationError, match="Only 'https://' URLs are supported"):
        validate_and_normalize_github_url("file:///etc/passwd")


def test_rejected_github_urls_embedded_credentials():
    """Reject embedded credentials for security."""
    with pytest.raises(SecurityViolationError, match="embedded credentials"):
        validate_and_normalize_github_url("https://user:password@github.com/owner/repo")

    with pytest.raises(SecurityViolationError, match="embedded credentials"):
        validate_and_normalize_github_url("https://token@github.com/owner/repo")


def test_rejected_github_urls_unauthorized_hosts():
    """Reject arbitrary hosts and SSRF targets."""
    with pytest.raises(SourceValidationError, match="Only public 'github.com' repositories are supported"):
        validate_and_normalize_github_url("https://gitlab.com/owner/repo")

    with pytest.raises(SourceValidationError, match="Only public 'github.com' repositories are supported"):
        validate_and_normalize_github_url("https://evil.com/owner/repo")

    with pytest.raises(SourceValidationError, match="Only public 'github.com' repositories are supported"):
        validate_and_normalize_github_url("https://localhost/owner/repo")


def test_rejected_github_urls_malformed_paths():
    """Reject malformed or traversing paths."""
    with pytest.raises(SourceValidationError, match="Expected format"):
        validate_and_normalize_github_url("https://github.com/singlepart")

    with pytest.raises(SourceValidationError, match="Expected format"):
        validate_and_normalize_github_url("https://github.com/owner/repo/subpath/extra")

    with pytest.raises(SourceValidationError):
        validate_and_normalize_github_url("https://github.com/../repo")


def test_ip_private_detection():
    """Verify private and loopback IP classification."""
    assert is_ip_private_or_loopback("127.0.0.1") is True
    assert is_ip_private_or_loopback("::1") is True
    assert is_ip_private_or_loopback("10.0.0.1") is True
    assert is_ip_private_or_loopback("172.16.0.1") is True
    assert is_ip_private_or_loopback("192.168.1.1") is True
    assert is_ip_private_or_loopback("169.254.169.254") is True
    assert is_ip_private_or_loopback("8.8.8.8") is False


def test_hostname_safety_validation():
    """Verify safe hostname verification rejects loopback and local hostnames."""
    with pytest.raises(SecurityViolationError):
        validate_hostname_safe("127.0.0.1")

    with pytest.raises(SecurityViolationError):
        validate_hostname_safe("localhost")


def test_local_path_validation_success(tmp_path, monkeypatch):
    """Verify local repository path succeeds when within configured roots."""
    allowed_root = tmp_path / "allowed_projects"
    allowed_root.mkdir()
    repo_dir = allowed_root / "my-service"
    repo_dir.mkdir()

    monkeypatch.setattr(settings, "LOCAL_REPOSITORY_ROOTS", str(allowed_root))

    source = validate_and_normalize_local_path(str(repo_dir))
    assert source.source_type == RepositorySourceType.LOCAL
    assert source.display_name == "my-service"
    assert source.source_identifier == "local:my-service"
    assert source.local_path == repo_dir.resolve()


def test_local_path_validation_rejected_outside_allowed(tmp_path, monkeypatch):
    """Reject local paths outside allowed roots."""
    allowed_root = tmp_path / "allowed"
    allowed_root.mkdir()
    outside_dir = tmp_path / "outside_project"
    outside_dir.mkdir()

    monkeypatch.setattr(settings, "LOCAL_REPOSITORY_ROOTS", str(allowed_root))

    with pytest.raises(SecurityViolationError, match="outside allowed repository roots"):
        validate_and_normalize_local_path(str(outside_dir))


def test_local_path_rejected_unc(monkeypatch):
    """Reject UNC network share paths on Windows."""
    with pytest.raises(SecurityViolationError, match="UNC network share"):
        validate_and_normalize_local_path(r"\\attacker-server\share\repo")


def test_local_path_nonexistent(tmp_path, monkeypatch):
    """Reject non-existent directory."""
    allowed_root = tmp_path / "allowed"
    allowed_root.mkdir()
    monkeypatch.setattr(settings, "LOCAL_REPOSITORY_ROOTS", str(allowed_root))

    with pytest.raises(SourceValidationError, match="does not exist"):
        validate_and_normalize_local_path(str(allowed_root / "missing_folder"))
