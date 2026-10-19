from fastapi import APIRouter, Response, status
from backend.app.core.config import settings
from backend.app.core.database import check_database_health
from backend.app.schemas.health import HealthResponse, ReadinessResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse, summary="Service liveness and health check")
@router.get("/health/live", response_model=HealthResponse, summary="Service liveness probe")
def get_health() -> HealthResponse:
    """Returns service process liveness status, service name, version, and database status."""
    db_status = check_database_health()
    return HealthResponse(
        status="ok",
        service=settings.SERVICE_NAME,
        version=settings.VERSION,
        database=db_status,
        environment=settings.ENVIRONMENT,
    )


@router.get("/health/ready", response_model=ReadinessResponse, summary="Service readiness probe")
def get_readiness(response: Response) -> ReadinessResponse:
    """Verifies that critical dependencies (database) are ready to accept traffic.

    Returns HTTP 200 with status='ready' when database connection succeeds.
    Returns HTTP 503 with status='not_ready' when database is unreachable.
    """
    db_status = check_database_health()
    is_ready = db_status == "connected"

    if not is_ready:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return ReadinessResponse(
            status="not_ready",
            service=settings.SERVICE_NAME,
            version=settings.VERSION,
            database=db_status,
            environment=settings.ENVIRONMENT,
        )

    return ReadinessResponse(
        status="ready",
        service=settings.SERVICE_NAME,
        version=settings.VERSION,
        database=db_status,
        environment=settings.ENVIRONMENT,
    )
