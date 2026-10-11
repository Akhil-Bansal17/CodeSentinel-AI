from fastapi import APIRouter
from backend.app.api.v1.endpoints import analyses, health, repositories

api_router = APIRouter()

# Register health check endpoint under /api/health
api_router.include_router(health.router, tags=["Health"])

# Register repository endpoints under /api/v1/repositories and /api/repositories
api_router.include_router(repositories.router, prefix="/v1")
api_router.include_router(repositories.router)

# Register Phase 2 analysis endpoints under /api/v1 and /api
api_router.include_router(analyses.repo_analyses_router, prefix="/v1")
api_router.include_router(analyses.repo_analyses_router)
api_router.include_router(analyses.analyses_router, prefix="/v1")
api_router.include_router(analyses.analyses_router)
