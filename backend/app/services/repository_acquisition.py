"""Repository acquisition service for CodeSentinel AI.

Safely fetches public GitHub archives via streaming HTTP with redirect re-validation,
size checks, and isolated temporary extraction. Handles local repository directories.
"""

import shutil
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

import httpx

from backend.app.core.config import settings
from backend.app.core.exceptions import (
    RepositoryAccessError,
    RepositoryLimitExceededError,
    SecurityViolationError,
)
from backend.app.core.logging import logger
from backend.app.services.safe_extractor import extract_tar_archive_safely
from backend.app.services.source_validator import (
    ValidatedSource,
    validate_hostname_safe,
)

# Allowed hosts for GitHub redirects
ALLOWED_GITHUB_DOWNLOAD_HOSTS = {
    "github.com",
    "codeload.github.com",
    "api.github.com",
}


@dataclass
class AcquiredRepository:
    """Represents an acquired repository ready for safe file discovery."""

    root_path: Path
    is_temporary: bool
    temp_dir_path: Optional[Path] = None
    default_branch: Optional[str] = None
    commit_sha: Optional[str] = None

    def cleanup(self) -> None:
        """Reliably clean up any temporary workspace directories created."""
        if self.is_temporary and self.temp_dir_path and self.temp_dir_path.exists():
            try:
                shutil.rmtree(self.temp_dir_path, ignore_errors=True)
                logger.info("Cleaned up temporary workspace: %s", self.temp_dir_path)
            except Exception as exc:
                logger.warning("Failed to clean up temporary workspace %s: %s", self.temp_dir_path, exc)


async def _stream_download_github_archive(
    owner: str,
    repo: str,
    branch: str,
    dest_tar_path: Path,
) -> bool:
    """Stream archive from GitHub with SSRF protection, size limits, and timeout.

    Returns True if successful, False if 404 (e.g. branch doesn't exist).
    """
    download_url = f"https://codeload.github.com/{owner}/{repo}/tar.gz/refs/heads/{branch}"
    timeout = httpx.Timeout(
        connect=10.0,
        read=float(settings.REPOSITORY_HTTP_TIMEOUT_SECONDS),
        write=10.0,
        pool=10.0,
    )

    async with httpx.AsyncClient(timeout=timeout, follow_redirects=False) as client:
        current_url = download_url
        max_redirects = 5
        redirect_count = 0

        while redirect_count <= max_redirects:
            parsed = urlparse(current_url)
            host = (parsed.hostname or "").lower()

            # SSRF re-validation on every hop
            if host not in ALLOWED_GITHUB_DOWNLOAD_HOSTS:
                raise SecurityViolationError(
                    f"Redirect to unauthorized host '{host}' rejected for security.",
                    details={"host": host},
                )
            validate_hostname_safe(host)

            try:
                response = await client.get(
                    current_url,
                    headers={"User-Agent": f"CodeSentinel-AI/{settings.VERSION}"},
                )
            except httpx.TimeoutException:
                raise RepositoryAccessError(
                    f"Connection timed out while downloading repository archive from GitHub.",
                    details={"owner": owner, "repo": repo},
                )
            except httpx.RequestError as exc:
                raise RepositoryAccessError(
                    f"Network error downloading repository: {exc}",
                    details={"owner": owner, "repo": repo},
                )

            # Handle Redirects manually to re-verify each URL
            if response.status_code in {301, 302, 303, 307, 308}:
                location = response.headers.get("Location")
                if not location:
                    raise RepositoryAccessError("Received redirect without Location header.")
                redirect_count += 1
                current_url = location
                continue

            if response.status_code == 404:
                return False

            if response.status_code == 429:
                raise RepositoryAccessError(
                    "GitHub download rate limit exceeded. Please wait before retrying.",
                    details={"status_code": 429},
                )

            if response.status_code != 200:
                raise RepositoryAccessError(
                    f"GitHub returned HTTP status {response.status_code} while downloading archive.",
                    details={"status_code": response.status_code},
                )

            # Stream response body with size limit enforcement
            downloaded_bytes = 0
            limit = settings.MAX_REPOSITORY_DOWNLOAD_BYTES

            with open(dest_tar_path, "wb") as f:
                async for chunk in response.aiter_bytes(chunk_size=65536):
                    downloaded_bytes += len(chunk)
                    if downloaded_bytes > limit:
                        raise RepositoryLimitExceededError(
                            f"Archive download exceeded maximum allowed size ({limit} bytes).",
                            details={"downloaded_bytes": downloaded_bytes, "limit": limit},
                        )
                    f.write(chunk)

            return True

        raise RepositoryAccessError("Exceeded maximum redirects while downloading repository.")


async def acquire_github_repository(validated_source: ValidatedSource) -> AcquiredRepository:
    """Acquire a public GitHub repository by downloading and safely extracting its archive."""
    owner = validated_source.owner
    repo = validated_source.repo_name

    if not owner or not repo:
        raise RepositoryAccessError("Owner and repo name are required for GitHub acquisition.")

    temp_dir = Path(tempfile.mkdtemp(prefix="codesentinel_repo_"))
    tar_path = temp_dir / "archive.tar.gz"
    extract_dest = temp_dir / "workspace"

    branches_to_try = []
    if validated_source.default_branch:
        branches_to_try.append(validated_source.default_branch)
    if "main" not in branches_to_try:
        branches_to_try.append("main")
    if "master" not in branches_to_try:
        branches_to_try.append("master")

    successful_branch = None

    try:
        for branch in branches_to_try:
            logger.info("Attempting to download GitHub archive: %s/%s branch=%s", owner, repo, branch)
            success = await _stream_download_github_archive(owner, repo, branch, tar_path)
            if success:
                successful_branch = branch
                break

        if not successful_branch:
            raise RepositoryAccessError(
                f"Repository '{owner}/{repo}' could not be downloaded. Verify the repository is public and accessible.",
                details={"owner": owner, "repo": repo, "tried_branches": branches_to_try},
            )

        logger.info("Extracting repository archive safely for %s/%s", owner, repo)
        workspace_root = extract_tar_archive_safely(tar_path, extract_dest)

        # Remove archive tarball to free temporary disk space
        if tar_path.exists():
            tar_path.unlink()

        return AcquiredRepository(
            root_path=workspace_root,
            is_temporary=True,
            temp_dir_path=temp_dir,
            default_branch=successful_branch,
        )

    except Exception:
        # Guarantee cleanup on failure
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise


def acquire_local_repository(validated_source: ValidatedSource) -> AcquiredRepository:
    """Acquire a local repository directory safely (read-only in place)."""
    if not validated_source.local_path:
        raise RepositoryAccessError("Local path is required for local acquisition.")

    return AcquiredRepository(
        root_path=validated_source.local_path,
        is_temporary=False,
        default_branch=validated_source.default_branch or "main",
    )


async def acquire_repository(validated_source: ValidatedSource) -> AcquiredRepository:
    """Unified repository acquisition dispatcher."""
    if validated_source.source_type.value == "github":
        return await acquire_github_repository(validated_source)
    else:
        return acquire_local_repository(validated_source)
