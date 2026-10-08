from typing import Any, Dict, Optional


class AppException(Exception):
    """Base application exception for CodeSentinel AI."""

    def __init__(
        self,
        message: str,
        status_code: int = 500,
        error_code: str = "INTERNAL_ERROR",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.details = details or {}


class NotFoundError(AppException):
    """Raised when an entity or resource is not found."""

    def __init__(self, resource: str, identifier: Any, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=f"{resource} '{identifier}' was not found.",
            status_code=404,
            error_code="NOT_FOUND",
            details=details,
        )


class EntityValidationError(AppException):
    """Raised when business validation rules fail."""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=422,
            error_code="VALIDATION_ERROR",
            details=details,
        )


class DatabaseConnectionError(AppException):
    """Raised when database connection fails safely."""

    def __init__(self, message: str = "Database connection error.", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=503,
            error_code="DATABASE_UNAVAILABLE",
            details=details,
        )


class ConflictError(AppException):
    """Raised when an operation conflicts with existing resource state."""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=409,
            error_code="CONFLICT",
            details=details,
        )


class RepositoryAccessError(AppException):
    """Raised when reading or connecting to a repository fails safely."""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=400,
            error_code="REPOSITORY_ACCESS_ERROR",
            details=details,
        )
