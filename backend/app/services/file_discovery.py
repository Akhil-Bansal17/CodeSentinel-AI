"""Safe file discovery and metadata extraction service for CodeSentinel AI.

Safely walks repositories, enforces ignore rules, detects binaries, computes line counts,
hashes, and ensures symlinks never escape repository boundaries.
"""

import fnmatch
import hashlib
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Set

from backend.app.core.config import settings
from backend.app.core.exceptions import RepositoryLimitExceededError, SecurityViolationError
from backend.app.core.logging import logger
from backend.app.services.language_detector import detect_file_language, is_known_binary_extension

# Default directories excluded from repository ingestion
DEFAULT_IGNORED_DIRECTORIES: Set[str] = {
    ".git",
    ".hg",
    ".svn",
    "node_modules",
    ".venv",
    "venv",
    "env",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    ".ruff_cache",
    ".tox",
    "dist",
    "build",
    "coverage",
    ".next",
    ".nuxt",
    "vendor",
    ".idea",
    ".vscode",
    ".turbo",
    ".serverless",
    "target",
    "bin",
    "obj",
    ".gemini",
    ".antigravity",
}

# Secret/credential filename patterns to exclude from line-counting & decoding
SENSITIVE_FILE_PATTERNS: List[str] = [
    ".env",
    ".env.*",
    "*.pem",
    "*.key",
    "*.p12",
    "*.pfx",
    "*.pkcs12",
    "id_rsa",
    "id_ed25519",
    "id_dsa",
    "id_ecdsa",
    "credentials.json",
    "client_secrets*.json",
    "service_account*.json",
    "*.keystore",
    "*.jks",
]


@dataclass(frozen=True)
class DiscoveredFile:
    """Safe metadata representation of a single discovered repository file."""

    relative_path: str
    file_name: str
    extension: str
    language: str
    category: str
    size_bytes: int
    is_source_file: bool
    is_binary: bool
    line_count: Optional[int] = None
    sha256: Optional[str] = None


@dataclass
class DiscoveryResult:
    """Aggregated result of safe file discovery across a repository directory."""

    files: List[DiscoveredFile] = field(default_factory=list)
    total_files: int = 0
    source_files: int = 0
    ignored_files_count: int = 0
    total_size_bytes: int = 0
    directory_count: int = 0
    directories: Set[str] = field(default_factory=set)


def is_sensitive_filename(filename: str) -> bool:
    """Check if a filename matches sensitive/secret patterns."""
    fn_lower = filename.lower()
    for pattern in SENSITIVE_FILE_PATTERNS:
        if fnmatch.fnmatch(fn_lower, pattern.lower()):
            return True
    return False


def is_content_binary(sample_bytes: bytes) -> bool:
    """Inspect byte sample for null bytes and non-text control characters."""
    if not sample_bytes:
        return False
    if b"\x00" in sample_bytes:
        return True
    # If more than 30% are non-ASCII control characters, consider binary
    text_characters = bytes(range(32, 127)) + b"\n\r\t\b"
    non_text = sum(byte not in text_characters for byte in sample_bytes)
    return (non_text / len(sample_bytes)) > 0.30


def count_file_lines(file_path: Path) -> Optional[int]:
    """Accurately count lines in text files using streaming chunk read.

    Handles CRLF, LF, and CR newlines cleanly.
    """
    try:
        line_count = 0
        has_bytes = False
        last_char = None

        with open(file_path, "rb") as f:
            while chunk := f.read(65536):
                has_bytes = True
                line_count += chunk.count(b"\n")
                last_char = chunk[-1]

        if not has_bytes:
            return 0

        # If file ends without newline, count the final line
        if last_char != ord(b"\n"):
            line_count += 1

        return line_count
    except Exception as exc:
        logger.debug("Could not count lines for %s: %s", file_path, exc)
        return None


def calculate_file_sha256(file_path: Path) -> Optional[str]:
    """Compute SHA-256 hash in streaming 64KB chunks."""
    try:
        hasher = hashlib.sha256()
        with open(file_path, "rb") as f:
            while chunk := f.read(65536):
                hasher.update(chunk)
        return hasher.hexdigest()
    except Exception as exc:
        logger.debug("Could not hash file %s: %s", file_path, exc)
        return None


def discover_repository_files(
    repo_root: Path,
    custom_ignored_dirs: Optional[Set[str]] = None,
    max_files: Optional[int] = None,
    max_total_size: Optional[int] = None,
    max_file_size: Optional[int] = None,
) -> DiscoveryResult:
    """Deterministically and safely walk repo_root, collecting metadata.

    Enforces containment, ignore rules, binary detection, limits, and LOC counting.
    """
    root_resolved = repo_root.resolve()
    ignored_dirs = set(DEFAULT_IGNORED_DIRECTORIES)
    if custom_ignored_dirs:
        ignored_dirs.update(custom_ignored_dirs)

    limit_files = max_files or settings.MAX_REPOSITORY_FILES
    limit_total_size = max_total_size or settings.MAX_REPOSITORY_EXTRACTED_BYTES
    limit_file_size = max_file_size or settings.MAX_REPOSITORY_FILE_BYTES

    result = DiscoveryResult()
    visited_inodes: Set[int] = set()
    visited_paths: Set[Path] = {root_resolved}

    for current_dir, dirnames, filenames in os.walk(root_resolved, followlinks=False):
        current_path = Path(current_dir)

        # 1. Symlink escape check for directory itself
        if current_path.is_symlink():
            try:
                resolved_curr = current_path.resolve()
                if not (resolved_curr == root_resolved or resolved_curr.is_relative_to(root_resolved)):
                    logger.warning("Skipping directory symlink escaping repo root: %s", current_path)
                    dirnames.clear()
                    continue
                if resolved_curr in visited_paths:
                    logger.warning("Skipping cyclic directory symlink: %s", current_path)
                    dirnames.clear()
                    continue
                visited_paths.add(resolved_curr)
            except (RuntimeError, ValueError):
                dirnames.clear()
                continue

        # 2. Prune ignored directories in-place
        dirs_to_remove = []
        for d in dirnames:
            d_path = current_path / d
            # Exclude ignored directory names
            if d in ignored_dirs or d.lower() in ignored_dirs:
                dirs_to_remove.append(d)
                continue
            # Symlink check on child directories
            if d_path.is_symlink():
                try:
                    resolved_d = d_path.resolve()
                    if not (resolved_d == root_resolved or resolved_d.is_relative_to(root_resolved)):
                        logger.warning("Skipping escaping symlink directory: %s", d_path)
                        dirs_to_remove.append(d)
                        continue
                    # Check loop detection via both canonical path and inode
                    stat_info = resolved_d.stat()
                    if resolved_d in visited_paths or (stat_info.st_ino and stat_info.st_ino in visited_inodes):
                        logger.warning("Skipping cyclic symlink directory: %s", d_path)
                        dirs_to_remove.append(d)
                        continue
                    visited_paths.add(resolved_d)
                    if stat_info.st_ino:
                        visited_inodes.add(stat_info.st_ino)
                except (RuntimeError, ValueError, OSError):
                    dirs_to_remove.append(d)
                    continue

        for d in dirs_to_remove:
            dirnames.remove(d)

        # Record directory relative path
        try:
            rel_dir = current_path.relative_to(root_resolved).as_posix()
            if rel_dir and rel_dir != ".":
                result.directories.add(rel_dir)
        except ValueError:
            pass

        # 3. Process files deterministically
        # Sort filenames for deterministic ordering across OS file systems
        for file_name in sorted(filenames):
            file_path = current_path / file_name

            # Symlink escape check
            if file_path.is_symlink():
                try:
                    resolved_file = file_path.resolve()
                    if not (resolved_file == root_resolved or resolved_file.is_relative_to(root_resolved)):
                        logger.warning("Skipping file symlink escaping repo root: %s", file_path)
                        result.ignored_files_count += 1
                        continue
                except (RuntimeError, ValueError, OSError):
                    result.ignored_files_count += 1
                    continue

            try:
                st = file_path.stat()
                file_size = st.st_size
            except OSError as exc:
                logger.warning("Could not stat file %s: %s", file_path, exc)
                result.ignored_files_count += 1
                continue

            # Calculate relative path with standard forward slashes
            try:
                rel_path = file_path.relative_to(root_resolved).as_posix()
            except ValueError:
                continue

            # Classify language & category
            classification = detect_file_language(file_name)
            ext = Path(file_name).suffix.lower()

            # Binary detection
            is_bin = is_known_binary_extension(file_name)
            if not is_bin and file_size > 0:
                # Read sample bytes to detect binary content
                try:
                    with open(file_path, "rb") as f:
                        sample = f.read(8192)
                    is_bin = is_content_binary(sample)
                except OSError:
                    is_bin = True

            # Sensitive / secret file detection
            is_sensitive = is_sensitive_filename(file_name)

            # Enforce individual file size limit on line counting
            is_oversized = file_size > limit_file_size

            # Compute line count if safe and source/text
            line_count = None
            if not is_bin and not is_sensitive and not is_oversized:
                line_count = count_file_lines(file_path)

            # Compute sha256
            sha256 = calculate_file_sha256(file_path)

            discovered = DiscoveredFile(
                relative_path=rel_path,
                file_name=file_name,
                extension=ext,
                language=classification.language,
                category=classification.category,
                size_bytes=file_size,
                is_source_file=classification.is_source_file and not is_bin,
                is_binary=is_bin,
                line_count=line_count,
                sha256=sha256,
            )

            result.files.append(discovered)
            result.total_files += 1
            if discovered.is_source_file:
                result.source_files += 1
            result.total_size_bytes += file_size

            # Enforce bounds
            if result.total_files > limit_files:
                raise RepositoryLimitExceededError(
                    f"Repository exceeds maximum allowed files ({limit_files}).",
                    details={"discovered_files": result.total_files, "limit": limit_files},
                )

            if result.total_size_bytes > limit_total_size:
                raise RepositoryLimitExceededError(
                    f"Repository exceeds maximum allowed size ({limit_total_size} bytes).",
                    details={"total_size_bytes": result.total_size_bytes, "limit": limit_total_size},
                )

    result.directory_count = len(result.directories)
    return result
