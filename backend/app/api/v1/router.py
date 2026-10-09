from fastapi import APIRouter
from backend.app.api.v1.endpoints import health, repositories

api_router = APIRouter()

# Register health check endpoint under /api/health
api_router.include_router(health.router, tags=["Health"])

# Register repository endpoints under /api/v1/repositories and /api/repositories
api_router.include_router(repositories.router, prefix="/v1")
api_router.include_router(repositories.router)
