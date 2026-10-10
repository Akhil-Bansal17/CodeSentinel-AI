"""Secure archive extraction service for CodeSentinel AI.

Protects against:
- TarSlip / ZipSlip path traversal (relative escapes, absolute paths, Windows drive letters, UNC paths)
- Symlink escapes
- Decompression bombs (expansion ratio limit, total size limit, file count limit)
- Strips GitHub top-level archive wrapper directory.
"""

import os
import shutil
import tarfile
import zipfile
from pathlib import Path
from typing import Optional, Set

from backend.app.core.config import settings
from backend.app.core.exceptions import RepositoryLimitExceededError, SecurityViolationError
from backend.app.core.logging import logger


def _is_path_safe_under_destination(target_path: Path, destination_dir: Path) -> bool:
    """Verify that target_path strictly resolves inside destination_dir."""
    try:
        resolved_target = target_path.resolve()
        resolved_dest = destination_dir.resolve()
        return resolved_target == resolved_dest or resolved_target.is_relative_to(resolved_dest)
    except (ValueError, RuntimeError):
        return False


def _sanitize_member_relpath(member_name: str) -> str:
    """Clean and normalize an archive member path, rejecting malicious prefixes."""
    # Normalize slashes
    clean = member_name.replace("\\", "/").strip()

    # Reject Windows drive letters (e.g. C:, D:)
    if len(clean) >= 2 and clean[1] == ":" and clean[0].isalpha():
        raise SecurityViolationError(
            f"Archive member contains forbidden drive prefix: '{member_name}'",
            details={"member": member_name},
        )

    # Reject UNC paths
    if clean.startswith("//") or clean.startswith(r"\\"):
        raise SecurityViolationError(
            f"Archive member contains forbidden UNC path: '{member_name}'",
            details={"member": member_name},
        )

    # Strip any leading slashes
    clean = clean.lstrip("/")

    # Check for path traversal elements
    parts = clean.split("/")
    if ".." in parts:
        raise SecurityViolationError(
            f"Archive member contains forbidden '..' path traversal: '{member_name}'",
            details={"member": member_name},
        )

    return clean


def _copy_with_limits(
    src_f,
    dst_f,
    current_total_uncompressed: int,
    limit_extracted_bytes: int,
    limit_file_bytes: int,
    archive_size: int,
    limit_ratio: float,
    chunk_size: int = 65536,
) -> int:
    """Stream copy enforcing individual file limit, total extracted bytes limit, and expansion ratio."""
    bytes_in_file = 0
    while chunk := src_f.read(chunk_size):
        bytes_in_file += len(chunk)
        if bytes_in_file > limit_file_bytes:
            raise RepositoryLimitExceededError(
                f"Archive member exceeds maximum allowed file size ({limit_file_bytes} bytes).",
                details={"file_bytes": bytes_in_file, "limit": limit_file_bytes},
            )
        total_now = current_total_uncompressed + bytes_in_file
        if total_now > limit_extracted_bytes:
            raise RepositoryLimitExceededError(
                f"Extracted repository size exceeds maximum allowed ({limit_extracted_bytes} bytes).",
                details={"size_bytes": total_now, "limit": limit_extracted_bytes},
            )
        if archive_size > 0 and total_now > (1024 * 1024):  # 1 MB threshold
            ratio = total_now / archive_size
            if ratio > limit_ratio:
                raise RepositoryLimitExceededError(
                    f"Archive exceeds safe expansion ratio ({ratio:.1f}x > {limit_ratio}x).",
                    details={"ratio": ratio, "limit": limit_ratio},
                )
        dst_f.write(chunk)
    return bytes_in_file


def extract_tar_archive_safely(
    archive_path: Path,
    destination_dir: Path,
    max_extracted_bytes: Optional[int] = None,
    max_files: Optional[int] = None,
    max_expansion_ratio: Optional[float] = None,
    max_file_bytes: Optional[int] = None,
) -> Path:
    """Safely extract a tar.gz / tar archive with strict traversal and bomb checks."""
    limit_extracted_bytes = max_extracted_bytes or settings.MAX_REPOSITORY_EXTRACTED_BYTES
    limit_files = max_files or settings.MAX_REPOSITORY_FILES
    limit_ratio = max_expansion_ratio or settings.MAX_ARCHIVE_EXPANSION_RATIO
    limit_file_bytes = max_file_bytes or settings.MAX_REPOSITORY_FILE_BYTES

    archive_size = archive_path.stat().st_size
    dest_dir = destination_dir.resolve()
    dest_dir.mkdir(parents=True, exist_ok=True)

    total_uncompressed_bytes = 0
    extracted_file_count = 0

    try:
        with tarfile.open(archive_path, mode="r:*") as tar:
            for member in tar:
                # 1. Traversal check
                clean_rel = _sanitize_member_relpath(member.name)
                if not clean_rel:
                    continue

                target_path = dest_dir / clean_rel

                if not _is_path_safe_under_destination(target_path, dest_dir):
                    raise SecurityViolationError(
                        f"Archive member attempts escape from extraction directory: '{member.name}'",
                        details={"member": member.name},
                    )

                # 2. Symlink escape check
                if member.issym() or member.islnk():
                    link_target = member.linkname
                    # Disallow absolute links or links pointing outside
                    clean_link = link_target.replace("\\", "/").strip()
                    if clean_link.startswith("/") or (len(clean_link) >= 2 and clean_link[1] == ":"):
                        logger.warning("Skipping absolute symlink in archive: %s -> %s", member.name, link_target)
                        continue
                    resolved_link_dest = (target_path.parent / clean_link).resolve()
                    if not _is_path_safe_under_destination(resolved_link_dest, dest_dir):
                        logger.warning("Skipping escaping symlink in archive: %s -> %s", member.name, link_target)
                        continue

                # 3. File count check
                if member.isfile():
                    extracted_file_count += 1
                    if extracted_file_count > limit_files:
                        raise RepositoryLimitExceededError(
                            f"Archive exceeds maximum allowed files limit ({limit_files}).",
                            details={"file_count": extracted_file_count, "limit": limit_files},
                        )

                    # Path conflict check
                    if target_path.exists() and target_path.is_dir():
                        raise SecurityViolationError(
                            f"Archive member conflict: '{member.name}' is a file but directory exists.",
                            details={"member": member.name},
                        )

                    target_path.parent.mkdir(parents=True, exist_ok=True)
                    with tar.extractfile(member) as src_f:
                        if src_f is not None:
                            with open(target_path, "wb") as dst_f:
                                written = _copy_with_limits(
                                    src_f,
                                    dst_f,
                                    current_total_uncompressed=total_uncompressed_bytes,
                                    limit_extracted_bytes=limit_extracted_bytes,
                                    limit_file_bytes=limit_file_bytes,
                                    archive_size=archive_size,
                                    limit_ratio=limit_ratio,
                                )
                                total_uncompressed_bytes += written

                elif member.isdir():
                    if target_path.exists() and target_path.is_file():
                        raise SecurityViolationError(
                            f"Archive member conflict: '{member.name}' is a directory but file exists.",
                            details={"member": member.name},
                        )
                    target_path.mkdir(parents=True, exist_ok=True)

        return _normalize_single_root_directory(dest_dir)

    except Exception:
        shutil.rmtree(dest_dir, ignore_errors=True)
        raise


def extract_zip_archive_safely(
    archive_path: Path,
    destination_dir: Path,
    max_extracted_bytes: Optional[int] = None,
    max_files: Optional[int] = None,
    max_expansion_ratio: Optional[float] = None,
    max_file_bytes: Optional[int] = None,
) -> Path:
    """Safely extract a zip archive with strict traversal and bomb checks."""
    limit_extracted_bytes = max_extracted_bytes or settings.MAX_REPOSITORY_EXTRACTED_BYTES
    limit_files = max_files or settings.MAX_REPOSITORY_FILES
    limit_ratio = max_expansion_ratio or settings.MAX_ARCHIVE_EXPANSION_RATIO
    limit_file_bytes = max_file_bytes or settings.MAX_REPOSITORY_FILE_BYTES

    archive_size = archive_path.stat().st_size
    dest_dir = destination_dir.resolve()
    dest_dir.mkdir(parents=True, exist_ok=True)

    total_uncompressed_bytes = 0
    extracted_file_count = 0

    try:
        with zipfile.ZipFile(archive_path, "r") as zf:
            for info in zf.infolist():
                clean_rel = _sanitize_member_relpath(info.filename)
                if not clean_rel:
                    continue

                target_path = dest_dir / clean_rel

                if not _is_path_safe_under_destination(target_path, dest_dir):
                    raise SecurityViolationError(
                        f"Archive member attempts escape from extraction directory: '{info.filename}'",
                        details={"member": info.filename},
                    )

                is_dir = info.is_dir() or clean_rel.endswith("/")

                if not is_dir:
                    extracted_file_count += 1
                    if extracted_file_count > limit_files:
                        raise RepositoryLimitExceededError(
                            f"Archive exceeds maximum allowed files limit ({limit_files}).",
                            details={"file_count": extracted_file_count, "limit": limit_files},
                        )

                    if target_path.exists() and target_path.is_dir():
                        raise SecurityViolationError(
                            f"Archive member conflict: '{info.filename}' is a file but directory exists.",
                            details={"member": info.filename},
                        )

                    target_path.parent.mkdir(parents=True, exist_ok=True)
                    with zf.open(info) as src_f, open(target_path, "wb") as dst_f:
                        written = _copy_with_limits(
                            src_f,
                            dst_f,
                            current_total_uncompressed=total_uncompressed_bytes,
                            limit_extracted_bytes=limit_extracted_bytes,
                            limit_file_bytes=limit_file_bytes,
                            archive_size=archive_size,
                            limit_ratio=limit_ratio,
                        )
                        total_uncompressed_bytes += written
                else:
                    if target_path.exists() and target_path.is_file():
                        raise SecurityViolationError(
                            f"Archive member conflict: '{info.filename}' is a directory but file exists.",
                            details={"member": info.filename},
                        )
                    target_path.mkdir(parents=True, exist_ok=True)

        return _normalize_single_root_directory(dest_dir)

    except Exception:
        shutil.rmtree(dest_dir, ignore_errors=True)
        raise


def _normalize_single_root_directory(dest_dir: Path) -> Path:
    """If the archive unpacked into a single top-level wrapper directory (like GitHub tarballs),

    returns that inner directory as the repository root, or moves contents up if appropriate.
    """
    children = [p for p in dest_dir.iterdir() if p.name not in {"__MACOSX"}]
    if len(children) == 1 and children[0].is_dir():
        return children[0]
    return dest_dir
