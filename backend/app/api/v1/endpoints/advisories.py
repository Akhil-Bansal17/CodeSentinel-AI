"""API endpoints for security advisory dataset provenance and controlled ingestion."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.schemas.dependencies import (
    AdvisoryImportRequest,
    AdvisoryImportResponse,
    AdvisoryStatusResponse,
)
from backend.app.services.dependencies.advisory_service import AdvisoryService

router = APIRouter(prefix="/advisories", tags=["Advisories"])


@router.get(
    "/status",
    response_model=AdvisoryStatusResponse,
    summary="Get active vulnerability advisory dataset status and provenance",
)
def get_advisory_dataset_status(
    db: Session = Depends(get_db),
) -> AdvisoryStatusResponse:
    """Retrieve authoritative provenance, version, and record counts of the active advisory catalog."""
    service = AdvisoryService(db)
    service.load_initial_dataset_if_empty()
    status_data = service.get_dataset_status()
    return AdvisoryStatusResponse(**status_data)


@router.post(
    "/import",
    response_model=AdvisoryImportResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Import or refresh vulnerability advisory dataset",
)
def import_advisory_dataset(
    request: AdvisoryImportRequest,
    db: Session = Depends(get_db),
) -> AdvisoryImportResponse:
    """Perform controlled validation and atomic import of advisory records."""
    service = AdvisoryService(db)
    dataset, accepted, rejected = service.import_advisories(
        raw_advisories=request.advisories,
        dataset_version=request.dataset_version,
        source_name=request.source_name,
    )
    return AdvisoryImportResponse(
        dataset_version=dataset.dataset_version,
        source_name=dataset.source_name,
        status=dataset.status,
        accepted_count=accepted,
        rejected_count=rejected,
        checksum=dataset.checksum,
    )
