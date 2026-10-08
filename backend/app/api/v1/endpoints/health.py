from fastapi import APIRouter
from backend.app.core.config import settings
from backend.app.core.database import check_database_health
from backend.app.schemas.health import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse, summary="Service health check")
def get_health() -> HealthResponse:
    """Returns service health status, service name, version, and database status."""
    db_status = check_database_health()
    return HealthResponse(
        status="ok",
        service=settings.SERVICE_NAME,
        version=settings.VERSION,
        database=db_status,
        environment=settings.ENVIRONMENT,
    )
