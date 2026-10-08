from typing import Generator
from sqlalchemy.orm import Session
from backend.app.core.database import get_db

# Re-export database dependency for API routes
__all__ = ["get_db", "Session"]
