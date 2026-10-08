from typing import Optional
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Schema for the GET /api/health endpoint response."""

    status: str = Field(..., description="Overall service status, e.g. ok")
    service: str = Field(..., description="Service identifier name")
    version: str = Field(..., description="Service version string")
    database: Optional[str] = Field(default=None, description="Database connection health status")
    environment: Optional[str] = Field(default=None, description="Active execution environment")

    model_config = {
        "json_schema_extra": {
            "example": {
                "status": "ok",
                "service": "codesentinel-api",
                "version": "0.1.0",
                "database": "connected",
                "environment": "development",
            }
        }
    }
