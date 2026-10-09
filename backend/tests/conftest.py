import os
import sys
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app.main import create_application
from backend.app.core.config import Settings
from backend.app.core.database import get_db
from backend.app.models.base import Base


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


from sqlalchemy.pool import StaticPool


@pytest.fixture
def test_db_session():
    """Isolated in-memory SQLite database session for unit and integration tests."""
    test_engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=test_engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=test_engine)



@pytest.fixture
def test_client_with_db(app, test_db_session):
    """TestClient with get_db dependency overridden to isolated test session."""
    def override_get_db():
        try:
            yield test_db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
