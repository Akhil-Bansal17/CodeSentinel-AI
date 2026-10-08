import os
import sys
import pytest
from fastapi.testclient import TestClient

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app.main import create_application
from backend.app.core.config import Settings


@pytest.fixture(scope="session")
def app():
    """Application fixture initialized for testing."""
    application = create_application()
    return application


@pytest.fixture(scope="session")
def client(app):
    """TestClient fixture for synchronous HTTP endpoint tests."""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def clean_settings():
    """Returns a fresh Settings instance."""
    return Settings(
        PROJECT_NAME="CodeSentinel AI Test",
        SERVICE_NAME="codesentinel-api",
        VERSION="0.1.0",
        ENVIRONMENT="test",
        LOG_LEVEL="DEBUG",
    )
