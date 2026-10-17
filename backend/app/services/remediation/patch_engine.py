"""Deterministic Patch and Unified Diff Engine for CodeSentinel AI (Phase 7).

Provides exact line-range replacements, unified diff generation, protected-path
enforcement, content hashing (SHA-256), and drift detection.
Zero LLM dependencies; enforces safety strictly in deterministic application code.
"""

import difflib
import hashlib
import os
import re
from pathlib import PurePosixPath
from typing import List, Optional, Tuple


class PatchError(Exception):
    """Base exception for patch engine failures."""
    pass


class PatchConflictError(PatchError):
    """Raised when source content does not match expected target region."""
    pass


class ProtectedPathError(PatchError):
    """Raised when an operation targets a sensitive or forbidden path."""
    pass


class PatchBoundsError(PatchError):
    """Raised when a patch exceeds safe line or byte boundaries."""
    pass


# Strict list of protected file patterns (secrets, credentials, VCS internals)
PROTECTED_PATH_PATTERNS = [
    re.compile(r"(^|/)\.env(\..+)?$", re.IGNORECASE),
    re.compile(r"(^|/)\.git(/|$)", re.IGNORECASE),
    re.compile(r"(^|/)\.ssh(/|$)", re.IGNORECASE),
    re.compile(r"\.(pem|key|pkcs12|pfx|crt|cer)$", re.IGNORECASE),
    re.compile(r"(^|/)(id_rsa|id_ecdsa|id_ed25519)(\..+)?$", re.IGNORECASE),
    re.compile(r"(^|/)(credentials|secrets|token|master_key)(\.json|\.yaml|\.yml|\.txt)?$", re.IGNORECASE),
]

MAX_PATCH_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB
MAX_PATCH_LINES = 1000


def compute_content_hash(content: str) -> str:
    """Compute deterministic SHA-256 hex digest of string content (UTF-8)."""
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def is_protected_path(relative_path: str) -> bool:
    """Determine whether a relative file path targets a protected system/credential file."""
    normalized = relative_path.replace("\\", "/").strip().lstrip("/")
    
    # Path traversal detection
    if ".." in normalized or normalized.startswith("/") or ":" in normalized:
        return True

    for pattern in PROTECTED_PATH_PATTERNS:
        if pattern.search(normalized):
            return True

    return False


def validate_path_safety(relative_path: str) -> None:
    """Assert that a path is safe to inspect, diff, or patch."""
    if not relative_path or not relative_path.strip():
        raise ProtectedPathError("File path cannot be empty.")

    normalized = relative_path.replace("\\", "/").strip()

    # Reject traversal or absolute paths
    if ".." in normalized or normalized.startswith("/") or ":" in normalized:
        raise ProtectedPathError(f"Path traversal or absolute path forbidden: {relative_path}")

    if is_protected_path(normalized):
        raise ProtectedPathError(f"Modification of protected file path forbidden: {relative_path}")


def detect_line_ending(content: str) -> str:
    """Detect dominant newline convention in source string."""
    if "\r\n" in content:
        return "\r\n"
    return "\n"


def generate_unified_diff(
    file_path: str,
    original_content: str,
    modified_content: str,
    context_lines: int = 3,
) -> str:
    """Generate a clean, deterministic unified diff matching standard git/patch format."""
    norm_path = file_path.replace("\\", "/").lstrip("/")

    orig_lines = original_content.splitlines(keepends=True)
    mod_lines = modified_content.splitlines(keepends=True)

    diff = difflib.unified_diff(
        orig_lines,
        mod_lines,
        fromfile=f"a/{norm_path}",
        tofile=f"b/{norm_path}",
        n=context_lines,
    )
    return "".join(diff)


def apply_replacement_to_source(
    original_content: str,
    start_line: int,
    end_line: int,
    expected_original_snippet: str,
    proposed_snippet: str,
) -> Tuple[str, str]:
    """Apply a replacement to specified 1-indexed line range.
    
    Verifies that the target region matches `expected_original_snippet`.
    Returns tuple of (modified_content, new_content_hash).
    Fails closed if the region diverges or bounds are violated.
    """
    if "\x00" in original_content:
        raise PatchBoundsError("Binary files containing null bytes cannot be patched.")

    if len(original_content.encode("utf-8")) > MAX_PATCH_FILE_SIZE_BYTES:
        raise PatchBoundsError("Source file exceeds maximum allowed patch size (5MB).")

    lines = original_content.splitlines(keepends=True)
    total_lines = len(lines)

    if start_line < 1 or end_line < start_line or start_line > total_lines:
        raise PatchConflictError(
            f"Invalid target line coordinates {start_line}-{end_line} for file with {total_lines} lines."
        )

    # Slice actual lines to replace (0-indexed: start_line - 1 to end_line)
    actual_region_lines = lines[start_line - 1 : min(end_line, total_lines)]
    actual_region_str = "".join(actual_region_lines)

    # Normalize whitespace/line-endings for comparison
    norm_actual = actual_region_str.replace("\r\n", "\n").rstrip()
    norm_expected = expected_original_snippet.replace("\r\n", "\n").rstrip()

    if norm_actual != norm_expected:
        raise PatchConflictError(
            f"Target region (lines {start_line}-{end_line}) does not match expected snippet.\n"
            f"Expected:\n{norm_expected}\nActual:\n{norm_actual}"
        )

    # Detect newline style to preserve
    preferred_newline = detect_line_ending(original_content)

    # Format proposed snippet lines with appropriate newlines
    proposed_lines = []
    for line in proposed_snippet.splitlines():
        proposed_lines.append(line + preferred_newline)
    
    # If proposed_snippet ends with nothing or is empty
    if not proposed_snippet:
        proposed_lines = []

    # Assemble modified content
    before_lines = lines[: start_line - 1]
    after_lines = lines[end_line:]
    new_lines = before_lines + proposed_lines + after_lines
    modified_content = "".join(new_lines)

    new_hash = compute_content_hash(modified_content)
    return modified_content, new_hash
