import pytest
from pydantic import ValidationError
from backend.app.core.config import Settings


def test_default_configuration_loads():
    """Verify that settings can be instantiated with default values."""
    config = Settings()
    assert config.PROJECT_NAME == "CodeSentinel AI"
    assert config.SERVICE_NAME == "codesentinel-api"
    assert config.VERSION == "0.1.0"
    assert config.API_PREFIX == "/api"
    assert isinstance(config.CORS_ORIGINS, list)
    assert len(config.CORS_ORIGINS) > 0


def test_custom_cors_string_assembly():
    """Verify comma-separated CORS string is correctly assembled into a list."""
    config = Settings(CORS_ORIGINS="http://example.com, https://app.example.com")
    assert config.CORS_ORIGINS == ["http://example.com", "https://app.example.com"]


def test_invalid_log_level_fails_safely():
    """Verify that an invalid log level fails validation with a clear error."""
    with pytest.raises(ValidationError) as exc_info:
        Settings(LOG_LEVEL="INVALID_LEVEL")
    assert "LOG_LEVEL" in str(exc_info.value)


def test_invalid_pool_size_fails_safely():
    """Verify that out-of-bounds DB pool configuration fails validation."""
    with pytest.raises(ValidationError):
        Settings(DB_POOL_SIZE=0)  # ge=1

    with pytest.raises(ValidationError):
        Settings(DB_POOL_SIZE=100)  # le=50
