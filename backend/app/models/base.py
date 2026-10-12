import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import BigInteger, Boolean, DateTime, Float, ForeignKey, Index, Integer, JSON, String
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
    analyses: Mapped[List["AnalysisRun"]] = relationship(
        "AnalysisRun",
        back_populates="repository",
        cascade="all, delete-orphan",
        order_by="desc(AnalysisRun.started_at)",
    )
    dependency_analyses: Mapped[List["DependencyRun"]] = relationship(
        "DependencyRun",
        back_populates="repository",
        cascade="all, delete-orphan",
        order_by="desc(DependencyRun.started_at)",
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
    analyses: Mapped[List["AnalysisRun"]] = relationship(
        "AnalysisRun",
        back_populates="snapshot",
        cascade="all, delete-orphan",
        order_by="desc(AnalysisRun.started_at)",
    )
    dependency_analyses: Mapped[List["DependencyRun"]] = relationship(
        "DependencyRun",
        back_populates="snapshot",
        cascade="all, delete-orphan",
        order_by="desc(DependencyRun.started_at)",
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


class AnalysisRun(Base, TimestampMixin):
    """Execution run of deterministic static analysis on a specific repository snapshot."""

    __tablename__ = "analysis_runs"

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
    snapshot_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("repository_snapshots.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(String(32), default="pending", nullable=False, index=True)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    rule_set_version: Mapped[str] = mapped_column(String(32), default="1.0.0", nullable=False)
    files_discovered: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    files_analyzed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    files_skipped: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    findings_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    failure_code: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    failure_reason: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    summary_json: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    # Relationships
    repository: Mapped["Repository"] = relationship("Repository", back_populates="analyses")
    snapshot: Mapped["RepositorySnapshot"] = relationship("RepositorySnapshot", back_populates="analyses")
    findings: Mapped[List["AnalysisFinding"]] = relationship(
        "AnalysisFinding",
        back_populates="analysis_run",
        cascade="all, delete-orphan",
        order_by="AnalysisFinding.start_line",
    )


class AnalysisFinding(Base, TimestampMixin):
    """Deterministic static analysis finding with exact source coordinates and evidence."""

    __tablename__ = "analysis_findings"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    analysis_run_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("analysis_runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    repository_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("repositories.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    snapshot_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("repository_snapshots.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    rule_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    rule_name: Mapped[str] = mapped_column(String(255), nullable=False)
    rule_version: Mapped[str] = mapped_column(String(32), default="1.0.0", nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(String(1024), nullable=False)
    severity: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    file_path: Mapped[str] = mapped_column(String(1024), nullable=False, index=True)
    start_line: Mapped[int] = mapped_column(Integer, nullable=False)
    start_column: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    end_line: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    end_column: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    evidence_summary: Mapped[str] = mapped_column(String(1024), nullable=False)
    fingerprint: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    metadata_json: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    # Relationships
    analysis_run: Mapped["AnalysisRun"] = relationship("AnalysisRun", back_populates="findings")
    repository: Mapped["Repository"] = relationship("Repository")
    snapshot: Mapped["RepositorySnapshot"] = relationship("RepositorySnapshot")

    __table_args__ = (
        Index("ix_analysis_findings_run_sev", "analysis_run_id", "severity"),
        Index("ix_analysis_findings_run_cat", "analysis_run_id", "category"),
        Index("ix_analysis_findings_run_file", "analysis_run_id", "file_path"),
        Index("ix_analysis_findings_run_rule", "analysis_run_id", "rule_id"),
    )


class AdvisoryDataset(Base, TimestampMixin):
    """Import batch or catalog version of validated security advisories."""

    __tablename__ = "advisory_datasets"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    dataset_version: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    source_name: Mapped[str] = mapped_column(String(64), nullable=False, default="codesentinel_curated")
    status: Mapped[str] = mapped_column(String(32), default="active", nullable=False, index=True)
    records_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    checksum: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    metadata_json: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    # Relationships
    advisories: Mapped[List["VulnerabilityAdvisory"]] = relationship(
        "VulnerabilityAdvisory",
        back_populates="dataset",
        cascade="all, delete-orphan",
    )


class VulnerabilityAdvisory(Base, TimestampMixin):
    """Validated security vulnerability advisory record with affected version criteria."""

    __tablename__ = "vulnerability_advisories"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    dataset_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("advisory_datasets.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    advisory_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    ecosystem: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    package_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    summary: Mapped[str] = mapped_column(String(1024), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(4096), nullable=True)
    severity: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    severity_source: Mapped[str] = mapped_column(String(64), default="AUTHORITATIVE", nullable=False)
    cvss_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    cve_ids: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    affected_ranges_json: Mapped[List[Any]] = mapped_column(JSON, default=list, nullable=False)
    fixed_versions_json: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    source_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    modified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    dataset: Mapped[Optional["AdvisoryDataset"]] = relationship("AdvisoryDataset", back_populates="advisories")

    __table_args__ = (
        Index("ix_vulnerability_advisories_lookup", "ecosystem", "package_name"),
        Index("ix_vulnerability_advisories_advisory_eco", "advisory_id", "ecosystem"),
    )


class DependencyRun(Base, TimestampMixin):
    """Execution run of deterministic dependency discovery and SCA on a repository snapshot."""

    __tablename__ = "dependency_runs"

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
    snapshot_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("repository_snapshots.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(String(32), default="pending", nullable=False, index=True)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    advisory_dataset_version: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    parser_version: Mapped[str] = mapped_column(String(32), default="1.0.0", nullable=False)
    matching_engine_version: Mapped[str] = mapped_column(String(32), default="1.0.0", nullable=False)
    dependencies_discovered: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    dependencies_resolved: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    dependencies_unresolved: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    vulnerabilities_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    manifest_files_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    failure_code: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    failure_reason: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    summary_json: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    # Relationships
    repository: Mapped["Repository"] = relationship("Repository", back_populates="dependency_analyses")
    snapshot: Mapped["RepositorySnapshot"] = relationship("RepositorySnapshot", back_populates="dependency_analyses")
    dependencies: Mapped[List["RepositoryDependency"]] = relationship(
        "RepositoryDependency",
        back_populates="dependency_run",
        cascade="all, delete-orphan",
        order_by="RepositoryDependency.package_name",
    )
    vulnerabilities: Mapped[List["DependencyVulnerability"]] = relationship(
        "DependencyVulnerability",
        back_populates="dependency_run",
        cascade="all, delete-orphan",
        order_by="DependencyVulnerability.package_name",
    )


class RepositoryDependency(Base, TimestampMixin):
    """Normalized dependency inventory record discovered from a manifest or lockfile."""

    __tablename__ = "repository_dependencies"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    dependency_run_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("dependency_runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    repository_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("repositories.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    snapshot_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("repository_snapshots.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    manifest_path: Mapped[str] = mapped_column(String(1024), nullable=False, index=True)
    lockfile_path: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True, index=True)
    ecosystem: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    package_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    original_package_name: Mapped[str] = mapped_column(String(255), nullable=False)
    version_constraint: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    resolved_version: Mapped[Optional[str]] = mapped_column(String(128), nullable=True, index=True)
    dependency_type: Mapped[str] = mapped_column(String(32), default="direct", nullable=False, index=True)
    is_direct: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True, index=True)
    scope: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    parser_name: Mapped[str] = mapped_column(String(64), nullable=False)
    parser_version: Mapped[str] = mapped_column(String(32), default="1.0.0", nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="resolved", nullable=False, index=True)
    metadata_json: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    # Relationships
    dependency_run: Mapped["DependencyRun"] = relationship("DependencyRun", back_populates="dependencies")
    vulnerabilities: Mapped[List["DependencyVulnerability"]] = relationship(
        "DependencyVulnerability",
        back_populates="dependency",
    )

    __table_args__ = (
        Index("ix_repo_deps_run_eco_pkg", "dependency_run_id", "ecosystem", "package_name"),
        Index("ix_repo_deps_snap_eco", "snapshot_id", "ecosystem"),
    )


class DependencyVulnerability(Base, TimestampMixin):
    """Evidence-backed security vulnerability finding matching a package version."""

    __tablename__ = "dependency_vulnerabilities"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    dependency_run_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("dependency_runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    dependency_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("repository_dependencies.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    repository_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("repositories.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    snapshot_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("repository_snapshots.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    advisory_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    ecosystem: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    package_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    resolved_version: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    affected_range: Mapped[str] = mapped_column(String(255), nullable=False)
    severity: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    severity_source: Mapped[str] = mapped_column(String(64), default="AUTHORITATIVE", nullable=False)
    cvss_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    remediation_version: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    manifest_path: Mapped[str] = mapped_column(String(1024), nullable=False, index=True)
    line_number: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    evidence_summary: Mapped[str] = mapped_column(String(1024), nullable=False)
    fingerprint: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    cve_ids: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    advisory_dataset_version: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    metadata_json: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    # Relationships
    dependency_run: Mapped["DependencyRun"] = relationship("DependencyRun", back_populates="vulnerabilities")
    dependency: Mapped[Optional["RepositoryDependency"]] = relationship("RepositoryDependency", back_populates="vulnerabilities")
    repository: Mapped["Repository"] = relationship("Repository")
    snapshot: Mapped["RepositorySnapshot"] = relationship("RepositorySnapshot")

    __table_args__ = (
        Index("ix_dep_vulns_run_sev", "dependency_run_id", "severity"),
        Index("ix_dep_vulns_run_eco", "dependency_run_id", "ecosystem"),
        Index("ix_dep_vulns_fingerprint", "fingerprint"),
    )
