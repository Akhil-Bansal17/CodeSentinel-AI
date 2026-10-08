import uuid
from datetime import datetime, timezone
from sqlalchemy import DateTime, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Base declarative class for all SQLAlchemy models in CodeSentinel AI."""

    pass


class TimestampMixin:
    """Standard timestamp mixin for consistent auditing fields."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class Repository(Base, TimestampMixin):
    """Foundational repository entity for Phase 0.

    Stores registered repositories without prematurely triggering analysis.
    Future phases extend this with snapshots, branches, and findings.
    """

    __tablename__ = "repositories"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    remote_url: Mapped[str] = mapped_column(String(1024), nullable=True)
    default_branch: Mapped[str] = mapped_column(String(128), default="main", nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="registered", nullable=False)
    description: Mapped[str] = mapped_column(String(1024), nullable=True)
