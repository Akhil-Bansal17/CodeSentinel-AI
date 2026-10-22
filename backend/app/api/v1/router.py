from fastapi import APIRouter
from backend.app.api.v1.endpoints import (
    advisories,
    analyses,
    architecture,
    cicd,
    codebase_health,
    dependencies,
    health,
    metrics,
    remediation,
    repositories,
    search,
)

api_router = APIRouter()

# Register health check endpoint under /api/health
api_router.include_router(health.router, tags=["Health"])

# Register operational metrics endpoints under /api/v1/metrics and /api/metrics
api_router.include_router(metrics.router, prefix="/v1", tags=["Metrics"])
api_router.include_router(metrics.router, tags=["Metrics"])

# Register repository endpoints under /api/v1/repositories and /api/repositories

api_router.include_router(repositories.router, prefix="/v1")
api_router.include_router(repositories.router)

# Register Phase 2 static analysis endpoints under /api/v1 and /api
api_router.include_router(analyses.repo_analyses_router, prefix="/v1")
api_router.include_router(analyses.repo_analyses_router)
api_router.include_router(analyses.analyses_router, prefix="/v1")
api_router.include_router(analyses.analyses_router)

# Register Phase 3 Dependency Intelligence & SCA endpoints under /api/v1 and /api
api_router.include_router(dependencies.repo_dependency_router, prefix="/v1")
api_router.include_router(dependencies.repo_dependency_router)
api_router.include_router(dependencies.dependency_analyses_router, prefix="/v1")
api_router.include_router(dependencies.dependency_analyses_router)
api_router.include_router(advisories.router, prefix="/v1")
api_router.include_router(advisories.router)

# Register Phase 5 Architectural Intelligence and Governance endpoints under /api/v1 and /api
api_router.include_router(architecture.repo_architecture_router, prefix="/v1")
api_router.include_router(architecture.repo_architecture_router)
api_router.include_router(architecture.architecture_router, prefix="/v1")
api_router.include_router(architecture.architecture_router)

# Register Phase 5 Codebase Health Intelligence endpoints under /api/v1 and /api
api_router.include_router(codebase_health.repo_health_router, prefix="/v1")
api_router.include_router(codebase_health.repo_health_router)
api_router.include_router(codebase_health.health_assessments_router, prefix="/v1")
api_router.include_router(codebase_health.health_assessments_router)

# Register Phase 6 Code Search & Repository Q&A endpoints under /api/v1 and /api
api_router.include_router(search.repo_search_router, prefix="/v1")
api_router.include_router(search.repo_search_router)
api_router.include_router(search.search_router, prefix="/v1")
api_router.include_router(search.search_router)

# Register Phase 7 Automated Remediation & Safe Patches endpoints under /api/v1 and /api
api_router.include_router(remediation.remediation_router, prefix="/v1")
api_router.include_router(remediation.remediation_router)

# Register Phase 8 CI/CD Automation, Audits, and PR Synthesis endpoints under /api/v1/cicd and /api/cicd
api_router.include_router(cicd.router, prefix="/v1/cicd", tags=["CI/CD & Audits"])
api_router.include_router(cicd.router, prefix="/cicd", tags=["CI/CD & Audits"])


