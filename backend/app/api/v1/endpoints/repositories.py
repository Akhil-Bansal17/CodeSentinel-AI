"""Repository and Ingestion API endpoints for CodeSentinel AI Phase 1."""

from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.schemas.repository import (
    RepositoryCreateRequest,
    RepositoryFileListResponse,
    RepositoryListResponse,
    RepositoryReingestRequest,
    RepositoryResponse,
    RepositorySnapshotResponse,
)
from backend.app.services.repository_service import RepositoryService

router = APIRouter(prefix="/repositories", tags=["Repositories"])


@router.post(
    "",
    response_model=RepositoryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create and ingest a repository",
)
async def create_and_ingest_repository(
    request: RepositoryCreateRequest,
    db: Session = Depends(get_db),
) -> RepositoryResponse:
    """Register and deterministically ingest a software repository (public GitHub or local)."""
    service = RepositoryService(db)
    return await service.ingest_repository(request)


@router.get(
    "",
    response_model=RepositoryListResponse,
    summary="List all tracked repositories",
)
def list_repositories(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
) -> RepositoryListResponse:
    """Retrieve paginated repositories with latest ingestion snapshots."""
    service = RepositoryService(db)
    return service.list_repositories(page=page, page_size=page_size)


@router.get(
    "/{repository_id}",
    response_model=RepositoryResponse,
    summary="Get repository details",
)
def get_repository(
    repository_id: str,
    db: Session = Depends(get_db),
) -> RepositoryResponse:
    """Retrieve details for a specific repository including its latest snapshot."""
    service = RepositoryService(db)
    return service.get_repository_details(repository_id)


@router.get(
    "/{repository_id}/files",
    response_model=RepositoryFileListResponse,
    summary="List files in a repository snapshot",
)
def list_repository_files(
    repository_id: str,
    snapshot_id: Optional[str] = Query(None, description="Optional snapshot ID (defaults to latest)"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    language: Optional[str] = Query(None, description="Filter by language"),
    category: Optional[str] = Query(None, description="Filter by category (source, configuration, etc.)"),
    search: Optional[str] = Query(None, description="Search by path or file name"),
    is_source_file: Optional[bool] = Query(None, description="Filter by source file flag"),
    db: Session = Depends(get_db),
) -> RepositoryFileListResponse:
    """Retrieve paginated file metadata for a repository snapshot."""
    service = RepositoryService(db)
    files, total, resolved_snap_id = service.list_snapshot_files(
        repository_id=repository_id,
        snapshot_id=snapshot_id,
        page=page,
        page_size=page_size,
        language=language,
        category=category,
        search=search,
        is_source_file=is_source_file,
    )
    return RepositoryFileListResponse(
        items=files,
        total=total,
        page=page,
        page_size=page_size,
        snapshot_id=resolved_snap_id,
    )


@router.get(
    "/{repository_id}/snapshots/{snapshot_id}",
    response_model=RepositorySnapshotResponse,
    summary="Get snapshot details and metrics",
)
def get_snapshot(
    repository_id: str,
    snapshot_id: str,
    db: Session = Depends(get_db),
) -> RepositorySnapshotResponse:
    """Retrieve metrics and details for a specific snapshot."""
    service = RepositoryService(db)
    return service.get_snapshot_details(repository_id, snapshot_id)


@router.post(
    "/{repository_id}/reingest",
    response_model=RepositoryResponse,
    summary="Re-ingest repository",
)
async def reingest_repository(
    repository_id: str,
    request: Optional[RepositoryReingestRequest] = None,
    db: Session = Depends(get_db),
) -> RepositoryResponse:
    """Trigger re-ingestion of a repository, creating a new snapshot."""
    service = RepositoryService(db)
    local_path = request.local_path if request else None
    return await service.reingest_repository(repository_id, local_path=local_path)


@router.delete(
    "/{repository_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete repository",
)
def delete_repository(
    repository_id: str,
    db: Session = Depends(get_db),
) -> None:
    """Delete a repository database record and its snapshot data."""
    service = RepositoryService(db)
    service.delete_repository(repository_id)
