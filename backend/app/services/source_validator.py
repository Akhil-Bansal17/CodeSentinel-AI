"""Source validation and normalization service for CodeSentinel AI Phase 1.

Enforces SSRF prevention, host whitelisting, URL normalization for GitHub repositories,
and strict allowed-root containment for local repositories.
"""

import ipaddress
import os
import re
import socket
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional
from urllib.parse import urlparse

from backend.app.core.config import settings
from backend.app.core.exceptions import SecurityViolationError, SourceValidationError
from backend.app.schemas.repository import RepositorySourceType

# Safe GitHub owner and repository name regex
# GitHub owners: alphanumeric and hyphens, up to 39 chars
# GitHub repo names: alphanumeric, hyphens, underscores, dots, up to 100 chars
GITHUB_OWNER_PATTERN = re.compile(r"^[a-zA-Z0-9]([a-zA-Z0-9-]{0,38})$")
GITHUB_REPO_PATTERN = re.compile(r"^[a-zA-Z0-9_.-]{1,100}$")

# Disallowed repo names (e.g. path traversal markers)
DISALLOWED_NAMES = {".", "..", "...", ".git"}


@dataclass(frozen=True)
class ValidatedSource:
    """Normalized and security-validated repository source."""

    source_type: RepositorySourceType
    source_identifier: str
    display_name: str
    source_url: Optional[str] = None
    local_path: Optional[Path] = None
    owner: Optional[str] = None
    repo_name: Optional[str] = None
    default_branch: Optional[str] = None


def is_ip_private_or_loopback(ip_str: str) -> bool:
    """Check if an IP address string is loopback, private, link-local, or reserved."""
    try:
        ip = ipaddress.ip_address(ip_str)
        return (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_reserved
            or ip.is_multicast
            or ip.is_unspecified
        )
    except ValueError:
        return False


def validate_hostname_safe(hostname: str) -> None:
    """Verify that a hostname does not resolve to localhost, private, or internal IP addresses."""
    if not hostname:
        raise SourceValidationError("Hostname cannot be empty.")

    # Check for direct IP hostnames
    if is_ip_private_or_loopback(hostname):
        raise SecurityViolationError(
            f"Access to private/internal IP address '{hostname}' is forbidden.",
            details={"hostname": hostname},
        )

    # Disallow localhost aliases
    if hostname.lower() in {"localhost", "localhost.localdomain", "127.0.0.1", "::1"}:
        raise SecurityViolationError(
            f"Access to local host '{hostname}' is forbidden.",
            details={"hostname": hostname},
        )

    # Resolve hostname to check resolved IPs
    try:
        addr_info = socket.getaddrinfo(hostname, None)
        for _, _, _, _, sockaddr in addr_info:
            ip_str = sockaddr[0]
            if is_ip_private_or_loopback(ip_str):
                raise SecurityViolationError(
                    f"Hostname '{hostname}' resolves to restricted internal IP '{ip_str}'.",
                    details={"hostname": hostname, "ip": ip_str},
                )
    except socket.gaierror:
        # If DNS resolution fails, let the HTTP client handle it or fail safely
        pass


def validate_and_normalize_github_url(url: str, default_branch: Optional[str] = None) -> ValidatedSource:
    """Validate and normalize a public GitHub repository URL.

    Accepts:
        https://github.com/owner/repo
        https://github.com/owner/repo.git
        https://www.github.com/owner/repo
    Rejects:
        Non-https schemes, credentials in URL, unsupported hosts, invalid path patterns,
        SSRF targets, query parameters, fragments.
    """
    if not url or not isinstance(url, str):
        raise SourceValidationError("Repository URL must be a non-empty string.")

    cleaned_url = url.strip()
    parsed = urlparse(cleaned_url)

    # 1. Scheme validation: HTTPS only
    if parsed.scheme.lower() != "https":
        raise SourceValidationError(
            f"Invalid URL scheme '{parsed.scheme}'. Only 'https://' URLs are supported for security.",
            details={"scheme": parsed.scheme},
        )

    # 2. Rejection of embedded credentials (e.g. https://user:pass@github.com/...)
    if parsed.username or parsed.password:
        raise SecurityViolationError(
            "URLs containing embedded credentials or userinfo are strictly rejected.",
        )

    # 3. Host validation: github.com only
    host = (parsed.hostname or "").lower()
    if host not in {"github.com", "www.github.com"}:
        raise SourceValidationError(
            f"Invalid repository host '{host}'. Only public 'github.com' repositories are supported.",
            details={"host": host},
        )

    # 4. Port validation: default 443 only
    if parsed.port and parsed.port != 443:
        raise SourceValidationError(
            f"Invalid port '{parsed.port}'. Only standard HTTPS port 443 is permitted.",
            details={"port": parsed.port},
        )

    # 5. Path parsing: /owner/repo[.git]
    path_parts = [p for p in parsed.path.strip("/").split("/") if p]
    if len(path_parts) != 2:
        raise SourceValidationError(
            f"Invalid GitHub repository URL path '{parsed.path}'. Expected format: https://github.com/owner/repository",
            details={"path": parsed.path},
        )

    owner, raw_repo = path_parts[0], path_parts[1]

    # Strip .git suffix if present
    repo_name = raw_repo[:-4] if raw_repo.endswith(".git") else raw_repo

    # 6. Validate owner and repo syntax
    if not GITHUB_OWNER_PATTERN.match(owner) or owner in DISALLOWED_NAMES:
        raise SourceValidationError(
            f"Invalid GitHub repository owner '{owner}'.",
            details={"owner": owner},
        )

    if not GITHUB_REPO_PATTERN.match(repo_name) or repo_name in DISALLOWED_NAMES:
        raise SourceValidationError(
            f"Invalid GitHub repository name '{repo_name}'.",
            details={"repo_name": repo_name},
        )

    # Normalized URL
    normalized_url = f"https://github.com/{owner}/{repo_name}"
    source_identifier = f"github:{owner}/{repo_name}".lower()

    return ValidatedSource(
        source_type=RepositorySourceType.GITHUB,
        source_identifier=source_identifier,
        display_name=repo_name,
        source_url=normalized_url,
        owner=owner,
        repo_name=repo_name,
        default_branch=default_branch or "main",
    )


def validate_and_normalize_local_path(
    path_str: str,
    name_override: Optional[str] = None,
    default_branch: Optional[str] = None,
) -> ValidatedSource:
    """Validate and resolve a local repository directory path.

    Enforces that the directory exists and resides strictly within configured LOCAL_REPOSITORY_ROOTS.
    Prevents path traversal, UNC paths, and symlink escapes.
    """
    if not path_str or not isinstance(path_str, str):
        raise SourceValidationError("Local repository path must be a non-empty string.")

    cleaned_path = path_str.strip()

    # Reject UNC paths for security on Windows (e.g. \\attacker\share)
    if cleaned_path.startswith(r"\\") or cleaned_path.startswith("//"):
        raise SecurityViolationError("UNC network share paths are not permitted.")

    try:
        raw_path = Path(cleaned_path)
        # Fully resolve path to eliminate '..' and follow initial symlinks to canonical location
        resolved_path = raw_path.resolve(strict=True)
    except FileNotFoundError:
        raise SourceValidationError(
            f"Local repository directory does not exist: '{cleaned_path}'",
            details={"path": cleaned_path},
        )
    except (RuntimeError, PermissionError) as exc:
        raise SecurityViolationError(
            f"Cannot safely access local path: {exc}",
            details={"path": cleaned_path},
        )

    if not resolved_path.is_dir():
        raise SourceValidationError(
            f"Path is not a directory: '{cleaned_path}'",
            details={"path": cleaned_path},
        )

    # Check against configured allowed roots
    allowed_roots = settings.get_allowed_local_roots()
    if not allowed_roots:
        raise SourceValidationError(
            "Local repository ingestion is disabled because no LOCAL_REPOSITORY_ROOTS are configured.",
        )

    # Verify containment in at least one allowed root
    is_contained = False
    for root in allowed_roots:
        try:
            # Python 3.9+ is_relative_to
            if resolved_path == root or resolved_path.is_relative_to(root):
                is_contained = True
                break
        except ValueError:
            continue

    if not is_contained:
        raise SecurityViolationError(
            f"Directory is outside allowed repository roots. Configured roots: {[str(r) for r in allowed_roots]}",
            details={"resolved_path": str(resolved_path)},
        )

    repo_name = name_override or resolved_path.name
    # Safe stable identifier without leaking absolute path
    source_identifier = f"local:{repo_name.lower()}"

    return ValidatedSource(
        source_type=RepositorySourceType.LOCAL,
        source_identifier=source_identifier,
        display_name=repo_name,
        local_path=resolved_path,
        default_branch=default_branch or "main",
    )


def validate_repository_source(
    source_type: RepositorySourceType,
    source_url: Optional[str] = None,
    local_path: Optional[str] = None,
    name_override: Optional[str] = None,
    default_branch: Optional[str] = None,
) -> ValidatedSource:
    """Unified entry point for validating repository sources."""
    if source_type == RepositorySourceType.GITHUB:
        if not source_url:
            raise SourceValidationError("source_url is required when source_type is 'github'.")
        source = validate_and_normalize_github_url(source_url, default_branch=default_branch)
        if name_override:
            return ValidatedSource(
                source_type=source.source_type,
                source_identifier=source.source_identifier,
                display_name=name_override,
                source_url=source.source_url,
                owner=source.owner,
                repo_name=source.repo_name,
                default_branch=source.default_branch,
            )
        return source

    elif source_type == RepositorySourceType.LOCAL:
        if not local_path:
            raise SourceValidationError("local_path is required when source_type is 'local'.")
        return validate_and_normalize_local_path(
            local_path,
            name_override=name_override,
            default_branch=default_branch,
        )

    else:
        raise SourceValidationError(f"Unsupported source type '{source_type}'.")
