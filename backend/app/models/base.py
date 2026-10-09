import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Index, Integer, JSON, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


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
    """Tracked software repository (GitHub or local directory)."""

    __tablename__ = "repositories"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    source_type: Mapped[str] = mapped_column(String(32), default="github", nullable=False)
    source_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    source_identifier: Mapped[str] = mapped_column(String(512), default="", nullable=False, index=True)
    remote_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    default_branch: Mapped[Optional[str]] = mapped_column(String(128), default="main", nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="registered", nullable=False)

    description: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    last_ingested_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    error_code: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    # Relationships
    snapshots: Mapped[List["RepositorySnapshot"]] = relationship(
        "RepositorySnapshot",
        back_populates="repository",
        cascade="all, delete-orphan",
        order_by="desc(RepositorySnapshot.started_at)",
    )


class RepositorySnapshot(Base, TimestampMixin):
    """Point-in-time snapshot of an ingestion run."""

    __tablename__ = "repository_snapshots"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    repository_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("repositories.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(String(32), default="processing", nullable=False)
    commit_sha: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    branch: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    file_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    source_file_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    ignored_file_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_size_bytes: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    directory_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_lines_of_code: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    language_distribution: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    metrics_json: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    failure_code: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    failure_reason: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)

    # Relationships
    repository: Mapped["Repository"] = relationship("Repository", back_populates="snapshots")
    files: Mapped[List["RepositoryFile"]] = relationship(
        "RepositoryFile",
        back_populates="snapshot",
        cascade="all, delete-orphan",
        order_by="RepositoryFile.relative_path",
    )


class RepositoryFile(Base, TimestampMixin):
    """Metadata record for a discovered repository file within a snapshot."""

    __tablename__ = "repository_files"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    snapshot_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("repository_snapshots.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    relative_path: Mapped[str] = mapped_column(String(1024), nullable=False, index=True)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    extension: Mapped[str] = mapped_column(String(64), default="", nullable=False, index=True)
    language: Mapped[str] = mapped_column(String(64), default="Unknown", nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(32), default="other", nullable=False, index=True)
    size_bytes: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    is_source_file: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_binary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    line_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    sha256: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    # Relationship
    snapshot: Mapped["RepositorySnapshot"] = relationship("RepositorySnapshot", back_populates="files")

    __table_args__ = (
        Index("ix_repository_files_snapshot_lang", "snapshot_id", "language"),
        Index("ix_repository_files_snapshot_cat", "snapshot_id", "category"),
    )
