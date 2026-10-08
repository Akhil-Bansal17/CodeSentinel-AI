from typing import Generator
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from backend.app.core.config import settings
from backend.app.core.logging import logger

# Configure connection arguments based on database dialect
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

try:
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,
        connect_args=connect_args,
        echo=settings.DEBUG,
    )
except Exception as e:
    logger.warning("Failed to initialize primary database engine: %s", str(e))
    # Fallback in-memory engine to guarantee app startup even if misconfigured
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """Dependency that provides a transactional database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_database_health() -> str:
    """Verifies database connectivity safely.

    Returns:
        'connected' if the database responds to a ping,
        'disconnected' if an error occurs,
        'unconfigured' if no database is specified.
    """
    if not settings.DATABASE_URL:
        return "unconfigured"

    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return "connected"
    except Exception as e:
        logger.debug("Database health check ping failed: %s", str(e))
        return "disconnected"
