from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class ErrorDetail(BaseModel):
    """Detailed error payload for consistent API error responses."""

    code: str = Field(..., description="Machine-readable error classification code")
    message: str = Field(..., description="Human-readable explanation of what went wrong")
    details: Optional[Dict[str, Any]] = Field(default=None, description="Additional context or validation errors")


class ErrorResponse(BaseModel):
    """Uniform standard error response model."""

    error: ErrorDetail

    model_config = {
        "json_schema_extra": {
            "example": {
                "error": {
                    "code": "NOT_FOUND",
                    "message": "Repository 'repo_123' was not found.",
                    "details": {"repository_id": "repo_123"},
                }
            }
        }
    }
