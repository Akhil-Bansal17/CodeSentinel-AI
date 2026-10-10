"""Repository and Ingestion Pydantic schemas for CodeSentinel AI Phase 1."""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class RepositorySourceType(str, Enum):
    GITHUB = "github"
    LOCAL = "local"


class RepositoryStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class SnapshotStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


# --- Request Models ---

class RepositoryCreateRequest(BaseModel):
    """Payload to register and ingest a new repository."""

    source_type: RepositorySourceType = Field(
        ...,
        description="Source type: 'github' or 'local'",
    )
    source_url: Optional[str] = Field(
        None,
        description="Public GitHub repository URL (e.g. https://github.com/owner/repo)",
    )
    local_path: Optional[str] = Field(
        None,
        description="Absolute filesystem path for local repositories (must be within LOCAL_REPOSITORY_ROOTS)",
    )
    name: Optional[str] = Field(
        None,
        description="Optional display name override. Defaults to repo directory/slug name.",
    )
    default_branch: Optional[str] = Field(
        None,
        description="Branch name (default: auto-detected or 'main')",
    )


class RepositoryReingestRequest(BaseModel):
    """Optional payload for re-ingestion, used for local repositories."""

    local_path: Optional[str] = Field(
        None,
        description="Filesystem path for local repositories (must be within LOCAL_REPOSITORY_ROOTS)",
    )


# --- Response Models ---

class RepositoryFileResponse(BaseModel):
    """Metadata response for a discovered repository file."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    snapshot_id: str
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


class RepositorySnapshotResponse(BaseModel):
    """Snapshot metadata and computed metrics for an ingestion run."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    repository_id: str
    status: str
    commit_sha: Optional[str] = None
    branch: Optional[str] = None
    started_at: datetime
    completed_at: Optional[datetime] = None
    file_count: int
    source_file_count: int
    ignored_file_count: int
    total_size_bytes: int
    directory_count: int
    total_lines_of_code: int
    language_distribution: Dict[str, Any] = Field(default_factory=dict)
    metrics_json: Dict[str, Any] = Field(default_factory=dict)
    failure_code: Optional[str] = None
    failure_reason: Optional[str] = None


class RepositoryResponse(BaseModel):
    """Tracked repository details including latest snapshot summary."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    source_type: str
    source_url: Optional[str] = None
    source_identifier: str
    default_branch: Optional[str] = None
    status: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    last_ingested_at: Optional[datetime] = None
    error_code: Optional[str] = None
    latest_snapshot: Optional[RepositorySnapshotResponse] = None


class RepositoryListResponse(BaseModel):
    """Paginated list of repositories."""

    items: List[RepositoryResponse]
    total: int
    page: int
    page_size: int


class RepositoryFileListResponse(BaseModel):
    """Paginated list of files belonging to a repository snapshot."""

    items: List[RepositoryFileResponse]
    total: int
    page: int
    page_size: int
    snapshot_id: str
