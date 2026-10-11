"""Source input provider for CodeSentinel AI static analysis.

Safely locates, containment-checks, and reads source files corresponding to an
ingested repository snapshot within trusted root boundaries.
Enforces file size, total byte limits, and snapshot consistency.
Never executes or imports analyzed source code.
"""

import hashlib
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from backend.app.core.config import settings
from backend.app.core.exceptions import (
    RepositoryAccessError,
    RepositoryLimitExceededError,
    SecurityViolationError,
)
from backend.app.core.logging import logger
from backend.app.models.base import Repository, RepositoryFile, RepositorySnapshot
from backend.app.services.repository_acquisition import (
    AcquiredRepository,
    acquire_repository,
)
from backend.app.services.source_validator import validate_repository_source


@dataclass
class SourceFileContent:
    """Represents safely read source file content and metadata."""

    relative_path: str
    content: Optional[str] = None
    size_bytes: int = 0
    line_count: int = 0
    sha256: Optional[str] = None
    is_available: bool = True
    is_modified: bool = False
    skip_reason: Optional[str] = None


class SourceInputProvider:
    """Context-managed provider for accessing snapshot source files safely."""

    def __init__(
        self,
        repository: Repository,
        snapshot: RepositorySnapshot,
        local_path_override: Optional[str] = None,
    ):
        self.repository = repository
        self.snapshot = snapshot
        self.local_path_override = local_path_override
        self.acquired: Optional[AcquiredRepository] = None
        self.root_path: Optional[Path] = None
        self.cumulative_bytes_read: int = 0

    async def __aenter__(self) -> "SourceInputProvider":
        await self.initialize()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        self.cleanup()

    async def initialize(self) -> None:
        """Resolve or acquire the source workspace root for the repository."""
        if self.repository.source_type == "local":
            target_path: Optional[Path] = None

            # 1. Explicit override (e.g. from request config)
            if self.local_path_override:
                candidate = Path(self.local_path_override).resolve()
                if candidate.exists() and candidate.is_dir():
                    target_path = candidate

            # 2. Check repository.source_url if it stores local path
            if not target_path and self.repository.source_url:
                candidate = Path(self.repository.source_url).resolve()
                if candidate.exists() and candidate.is_dir():
                    target_path = candidate

            # 3. Check source_identifier if it's a directory path
            raw_ident = self.repository.source_identifier
            if raw_ident.startswith("local:"):
                raw_ident = raw_ident[6:]
            if not target_path and raw_ident:
                candidate = Path(raw_ident).resolve()
                if candidate.exists() and candidate.is_dir():
                    target_path = candidate

            # 4. Search within configured LOCAL_REPOSITORY_ROOTS
            if not target_path:
                allowed_roots = settings.get_allowed_local_roots()
                for root in allowed_roots:
                    if root.name.lower() in {self.repository.name.lower(), raw_ident.lower()}:
                        target_path = root
                        break
                    try:
                        for child in root.iterdir():
                            if child.is_dir() and child.name.lower() in {self.repository.name.lower(), raw_ident.lower()}:
                                target_path = child
                                break
                    except Exception:
                        pass
                    if target_path:
                        break

            if not target_path or not target_path.exists() or not target_path.is_dir():
                raise RepositoryAccessError(
                    "Local repository source path does not exist or is not a directory.",
                    details={"repository_id": self.repository.id},
                )

            # Security check: containment within allowed local roots
            allowed_roots = settings.get_allowed_local_roots()
            if allowed_roots:
                is_contained = any(
                    target_path == root or root in target_path.parents
                    for root in allowed_roots
                )
                if not is_contained:
                    raise SecurityViolationError(
                        "Local repository path is outside configured allowed roots.",
                        details={"repository_id": self.repository.id},
                    )

            self.root_path = target_path

        elif self.repository.source_type == "github":
            validated_source = validate_repository_source(
                source_type="github",
                source_url=self.repository.source_url,
                default_branch=self.snapshot.branch or self.repository.default_branch,
            )
            self.acquired = await acquire_repository(validated_source)
            self.root_path = self.acquired.root_path
        else:
            raise RepositoryAccessError(
                f"Unsupported repository source type: {self.repository.source_type}",
                details={"repository_id": self.repository.id},
            )

    def cleanup(self) -> None:
        """Clean up acquired temporary files if applicable."""
        if self.acquired:
            try:
                self.acquired.cleanup()
            except Exception as exc:
                logger.warning("Error cleaning up acquired repository: %s", exc)
            self.acquired = None

    def read_file_content(self, file_rec: RepositoryFile) -> SourceFileContent:
        """Safely read content for a RepositoryFile record with limits and validation."""
        if not self.root_path:
            return SourceFileContent(
                relative_path=file_rec.relative_path,
                is_available=False,
                skip_reason="Source workspace is not initialized.",
            )

        # 1. Check size limit before disk read
        max_file_bytes = settings.MAX_ANALYSIS_FILE_BYTES
        if file_rec.size_bytes > max_file_bytes:
            return SourceFileContent(
                relative_path=file_rec.relative_path,
                is_available=False,
                skip_reason=f"File size ({file_rec.size_bytes} B) exceeds maximum limit ({max_file_bytes} B).",
            )

        # 2. Containment validation against root_path
        normalized_rel = Path(file_rec.relative_path.replace("\\", "/"))
        if normalized_rel.is_absolute() or ".." in normalized_rel.parts:
            return SourceFileContent(
                relative_path=file_rec.relative_path,
                is_available=False,
                skip_reason="File path violates containment boundary.",
            )

        target_file = (self.root_path / normalized_rel).resolve()
        try:
            target_file.relative_to(self.root_path.resolve())
        except ValueError:
            return SourceFileContent(
                relative_path=file_rec.relative_path,
                is_available=False,
                skip_reason="File path escapes repository root boundary.",
            )

        # 3. Check existence
        if not target_file.exists() or not target_file.is_file():
            return SourceFileContent(
                relative_path=file_rec.relative_path,
                is_available=False,
                skip_reason="File does not exist in repository workspace.",
            )

        # 4. Enforce cumulative read limit
        actual_size = target_file.stat().st_size
        if actual_size > max_file_bytes:
            return SourceFileContent(
                relative_path=file_rec.relative_path,
                is_available=False,
                skip_reason=f"File size ({actual_size} B) exceeds maximum limit ({max_file_bytes} B).",
            )

        if self.cumulative_bytes_read + actual_size > settings.MAX_ANALYSIS_TOTAL_BYTES:
            raise RepositoryLimitExceededError(
                "Cumulative source read exceeded maximum analysis total size limit.",
                details={
                    "cumulative_bytes": self.cumulative_bytes_read,
                    "limit": settings.MAX_ANALYSIS_TOTAL_BYTES,
                },
            )

        # 5. Read bytes safely
        try:
            raw_bytes = target_file.read_bytes()
        except Exception as exc:
            return SourceFileContent(
                relative_path=file_rec.relative_path,
                is_available=False,
                skip_reason=f"Failed to read file: {exc}",
            )

        self.cumulative_bytes_read += len(raw_bytes)

        # 6. Verify SHA-256 for snapshot consistency
        computed_sha = hashlib.sha256(raw_bytes).hexdigest()
        is_modified = False
        if file_rec.sha256 and file_rec.sha256 != computed_sha:
            is_modified = True

        # 7. Safe decoding (normalizing CRLF and LF)
        try:
            content_str = raw_bytes.decode("utf-8")
        except UnicodeDecodeError:
            try:
                content_str = raw_bytes.decode("latin-1")
            except Exception:
                content_str = raw_bytes.decode("utf-8", errors="replace")

        # Normalize line endings for deterministic line counting & AST offsets
        normalized_content = content_str.replace("\r\n", "\n").replace("\r", "\n")
        lines = normalized_content.split("\n")
        # If content ends with newline, standard line count convention
        line_count = len(lines)

        return SourceFileContent(
            relative_path=file_rec.relative_path,
            content=normalized_content,
            size_bytes=len(raw_bytes),
            line_count=line_count,
            sha256=computed_sha,
            is_available=True,
            is_modified=is_modified,
        )
