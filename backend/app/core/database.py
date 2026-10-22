from typing import Generator
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from backend.app.core.config import settings
from backend.app.core.logging import logger

# Configure connection arguments based on database dialect
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
elif "postgresql" in settings.DATABASE_URL:
    connect_args = {"connect_timeout": 3}

engine_kwargs = {
    "pool_pre_ping": True,
    "echo": settings.DEBUG,
    "connect_args": connect_args,
}
if not settings.DATABASE_URL.startswith("sqlite"):
    engine_kwargs["pool_size"] = settings.DB_POOL_SIZE
    engine_kwargs["max_overflow"] = settings.DB_MAX_OVERFLOW
    engine_kwargs["pool_timeout"] = settings.DB_POOL_TIMEOUT
    engine_kwargs["pool_recycle"] = 3600

try:
    engine = create_engine(
        settings.DATABASE_URL,
        **engine_kwargs,
    )
except Exception as e:
    logger.warning("Failed to initialize primary database engine: %s", str(e))
    if settings.ENVIRONMENT.lower() in ("production", "staging"):
        raise RuntimeError(
            f"Database engine initialization failed in {settings.ENVIRONMENT} mode: {e}. "
            f"Silent fallback to in-memory database is prohibited in production/staging environments."
        ) from e
    # Fallback in-memory engine to guarantee app startup in development/test environments
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


def dispose_engine() -> None:
    """Closes all checked-in connections in the connection pool cleanly during application shutdown."""
    global engine
    if engine is not None:
        try:
            engine.dispose()
            logger.info("Database engine connection pool disposed successfully.")
        except Exception as e:
            logger.warning("Error disposing database engine connection pool: %s", str(e))

