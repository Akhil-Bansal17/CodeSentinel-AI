import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import BigInteger, Boolean, DateTime, Float, ForeignKey, Index, Integer, JSON, String, Text
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
    architecture_analyses: Mapped[List["ArchitectureRun"]] = relationship(
        "ArchitectureRun",
        back_populates="repository",
        cascade="all, delete-orphan",
        order_by="desc(ArchitectureRun.started_at)",
    )
    index_runs: Mapped[List["CodeIndexRun"]] = relationship(
        "CodeIndexRun",
        back_populates="repository",
        cascade="all, delete-orphan",
        order_by="desc(CodeIndexRun.started_at)",
    )
    remediation_proposals: Mapped[List["RemediationProposal"]] = relationship(
        "RemediationProposal",
        back_populates="repository",
        cascade="all, delete-orphan",
        order_by="desc(RemediationProposal.created_at)",
    )
    audit_runs: Mapped[List["AuditRun"]] = relationship(
        "AuditRun",
        back_populates="repository",
        cascade="all, delete-orphan",
        order_by="desc(AuditRun.created_at)",
    )
    ci_audit_runs: Mapped[List["CIAuditRun"]] = relationship(
        "CIAuditRun",
        back_populates="repository",
        cascade="all, delete-orphan",
        order_by="desc(CIAuditRun.created_at)",
    )
    pr_preparations: Mapped[List["PrPreparation"]] = relationship(
        "PrPreparation",
        back_populates="repository",
        cascade="all, delete-orphan",
        order_by="desc(PrPreparation.created_at)",
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
    architecture_analyses: Mapped[List["ArchitectureRun"]] = relationship(
        "ArchitectureRun",
        back_populates="snapshot",
        cascade="all, delete-orphan",
        order_by="desc(ArchitectureRun.started_at)",
    )
    index_runs: Mapped[List["CodeIndexRun"]] = relationship(
        "CodeIndexRun",
        back_populates="snapshot",
        cascade="all, delete-orphan",
        order_by="desc(CodeIndexRun.started_at)",
    )
    remediation_proposals: Mapped[List["RemediationProposal"]] = relationship(
        "RemediationProposal",
        back_populates="snapshot",
        cascade="all, delete-orphan",
        order_by="desc(RemediationProposal.created_at)",
    )
    audit_runs: Mapped[List["AuditRun"]] = relationship(
        "AuditRun",
        back_populates="snapshot",
        cascade="all, delete-orphan",
        order_by="desc(AuditRun.created_at)",
    )
    pr_preparations: Mapped[List["PrPreparation"]] = relationship(
        "PrPreparation",
        back_populates="snapshot",
        cascade="all, delete-orphan",
        order_by="desc(PrPreparation.created_at)",
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
    confidence: Mapped[str] = mapped_column(String(32), default="MEDIUM", nullable=False, server_default="MEDIUM", index=True)
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
    remediation_proposals: Mapped[List["RemediationProposal"]] = relationship(
        "RemediationProposal",
        back_populates="finding",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("ix_analysis_findings_run_sev", "analysis_run_id", "severity"),
        Index("ix_analysis_findings_run_conf", "analysis_run_id", "confidence"),
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


class ArchitectureRun(Base, TimestampMixin):
    """Execution run of deterministic architectural dependency and governance analysis on a snapshot."""

    __tablename__ = "architecture_runs"

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
    modules_analyzed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    internal_edges_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    external_deps_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    unresolved_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    cycles_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    violations_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    policy_configured: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    policy_path: Mapped[Optional[str]] = mapped_column(String(255), default="codesentinel.architecture.json", nullable=True)
    failure_code: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    failure_reason: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    summary_json: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    # Relationships
    repository: Mapped["Repository"] = relationship("Repository", back_populates="architecture_analyses")
    snapshot: Mapped["RepositorySnapshot"] = relationship("RepositorySnapshot", back_populates="architecture_analyses")
    violations: Mapped[List["ArchitectureViolation"]] = relationship(
        "ArchitectureViolation",
        back_populates="architecture_run",
        cascade="all, delete-orphan",
        order_by="ArchitectureViolation.rule_id",
    )


class ArchitectureViolation(Base, TimestampMixin):
    """Evidence-backed architectural layer or boundary policy violation."""

    __tablename__ = "architecture_violations"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    architecture_run_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("architecture_runs.id", ondelete="CASCADE"),
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
    policy_id: Mapped[str] = mapped_column(String(255), nullable=False)
    source_module: Mapped[str] = mapped_column(String(1024), nullable=False, index=True)
    target_module: Mapped[str] = mapped_column(String(1024), nullable=False, index=True)
    edge_specifier: Mapped[str] = mapped_column(String(255), nullable=False)
    line_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    violated_boundary: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(String(1024), nullable=False)
    remediation: Mapped[str] = mapped_column(String(1024), nullable=False)
    severity: Mapped[str] = mapped_column(String(32), default="HIGH", nullable=False, index=True)
    confidence: Mapped[str] = mapped_column(String(32), default="HIGH", nullable=False, index=True)
    fingerprint: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    metadata_json: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    # Relationships
    architecture_run: Mapped["ArchitectureRun"] = relationship("ArchitectureRun", back_populates="violations")
    repository: Mapped["Repository"] = relationship("Repository")
    snapshot: Mapped["RepositorySnapshot"] = relationship("RepositorySnapshot")

    __table_args__ = (
        Index("ix_arch_violations_run_sev", "architecture_run_id", "severity"),
        Index("ix_arch_violations_fingerprint", "fingerprint"),
    )


class CodebaseHealthAssessment(Base, TimestampMixin):
    """Synthesized deterministic codebase health assessment record."""

    __tablename__ = "codebase_health_assessments"

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
    analysis_run_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("analysis_runs.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    dependency_run_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("dependency_runs.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    architecture_run_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("architecture_runs.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    scoring_version: Mapped[str] = mapped_column(String(32), default="1.0.0", nullable=False)
    overall_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="completed", nullable=False, index=True)
    dimensions_json: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    metrics_json: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    recommendations_json: Mapped[List[Any]] = mapped_column(JSON, default=list, nullable=False)

    # Relationships
    repository: Mapped["Repository"] = relationship("Repository")
    snapshot: Mapped["RepositorySnapshot"] = relationship("RepositorySnapshot")
    analysis_run: Mapped[Optional["AnalysisRun"]] = relationship("AnalysisRun")
    dependency_run: Mapped[Optional["DependencyRun"]] = relationship("DependencyRun")
    architecture_run: Mapped[Optional["ArchitectureRun"]] = relationship("ArchitectureRun")

    __table_args__ = (
        Index("ix_health_assessments_repo_snap", "repository_id", "snapshot_id"),
    )


class CodeIndexRun(Base, TimestampMixin):
    """Execution run of source code indexing and vector embedding for search & Q&A."""

    __tablename__ = "code_index_runs"

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
    index_version: Mapped[str] = mapped_column(String(32), default="1.0.0", nullable=False)
    chunk_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    files_indexed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    files_skipped: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    embedding_provider: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    embedding_model: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    embedding_dimension: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    failure_code: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    failure_reason: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    summary_json: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    # Relationships
    repository: Mapped["Repository"] = relationship("Repository", back_populates="index_runs")
    snapshot: Mapped["RepositorySnapshot"] = relationship("RepositorySnapshot", back_populates="index_runs")
    chunks: Mapped[List["CodeChunk"]] = relationship(
        "CodeChunk",
        back_populates="index_run",
        cascade="all, delete-orphan",
        order_by="CodeChunk.chunk_index",
    )


class CodeChunk(Base, TimestampMixin):
    """Syntax-aware or line-bounded code/doc chunk with coordinates and optional embedding."""

    __tablename__ = "code_chunks"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    index_run_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("code_index_runs.id", ondelete="CASCADE"),
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
    relative_path: Mapped[str] = mapped_column(String(1024), nullable=False, index=True)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    language: Mapped[str] = mapped_column(String(64), default="Unknown", nullable=False, index=True)
    chunk_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    chunk_type: Mapped[str] = mapped_column(String(32), default="code_block", nullable=False, index=True)
    symbol_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    symbol_type: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    start_line: Mapped[int] = mapped_column(Integer, nullable=False)
    end_line: Mapped[int] = mapped_column(Integer, nullable=False)
    start_column: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    end_column: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    chunk_fingerprint: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    embedding: Mapped[Optional[List[float]]] = mapped_column(JSON, nullable=True)
    metadata_json: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    # Relationships
    index_run: Mapped["CodeIndexRun"] = relationship("CodeIndexRun", back_populates="chunks")
    repository: Mapped["Repository"] = relationship("Repository")
    snapshot: Mapped["RepositorySnapshot"] = relationship("RepositorySnapshot")

    __table_args__ = (
        Index("ix_code_chunks_snap_lang", "snapshot_id", "language"),
        Index("ix_code_chunks_snap_path", "snapshot_id", "relative_path"),
        Index("ix_code_chunks_snap_sym", "snapshot_id", "symbol_name"),
    )


class RemediationProposal(Base, TimestampMixin):
    """Proposal for automated or reviewable remediation patch of a finding."""

    __tablename__ = "remediation_proposals"

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
    finding_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("analysis_findings.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    finding_type: Mapped[str] = mapped_column(String(32), default="STATIC_ANALYSIS", nullable=False)
    remediation_rule_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(32), default="PROPOSED", nullable=False, index=True)
    file_path: Mapped[str] = mapped_column(String(1024), nullable=False, index=True)
    original_content_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    target_content_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    start_line: Mapped[int] = mapped_column(Integer, nullable=False)
    end_line: Mapped[int] = mapped_column(Integer, nullable=False)
    start_column: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    end_column: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    original_code_snippet: Mapped[str] = mapped_column(Text, nullable=False)
    proposed_code_snippet: Mapped[str] = mapped_column(Text, nullable=False)
    unified_diff: Mapped[str] = mapped_column(Text, nullable=False)
    rationale: Mapped[str] = mapped_column(Text, nullable=False)
    confidence: Mapped[str] = mapped_column(String(32), default="HIGH", nullable=False)
    risk_level: Mapped[str] = mapped_column(String(32), default="LOW", nullable=False)
    is_llm_assisted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    failure_reason: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    applied_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    applied_by: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    metadata_json: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    # Relationships
    repository: Mapped["Repository"] = relationship("Repository", back_populates="remediation_proposals")
    snapshot: Mapped["RepositorySnapshot"] = relationship("RepositorySnapshot", back_populates="remediation_proposals")
    finding: Mapped[Optional["AnalysisFinding"]] = relationship("AnalysisFinding", back_populates="remediation_proposals")
    validations: Mapped[List["RemediationValidation"]] = relationship(
        "RemediationValidation",
        back_populates="proposal",
        cascade="all, delete-orphan",
        order_by="RemediationValidation.created_at",
    )
    audits: Mapped[List["RemediationAudit"]] = relationship(
        "RemediationAudit",
        back_populates="proposal",
        cascade="all, delete-orphan",
        order_by="desc(RemediationAudit.created_at)",
    )

    __table_args__ = (
        Index("ix_remediation_props_repo_snap", "repository_id", "snapshot_id"),
        Index("ix_remediation_props_status", "status"),
        Index("ix_remediation_props_finding", "finding_id"),
    )


class RemediationValidation(Base, TimestampMixin):
    """Validation check result executed against a proposed patch in memory."""

    __tablename__ = "remediation_validations"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    proposal_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("remediation_proposals.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    check_id: Mapped[str] = mapped_column(String(64), nullable=False)
    check_name: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    diagnostic_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    proposal: Mapped["RemediationProposal"] = relationship("RemediationProposal", back_populates="validations")

    __table_args__ = (
        Index("ix_remediation_val_prop", "proposal_id"),
    )


class RemediationAudit(Base, TimestampMixin):
    """Audit log entry capturing state transitions, reviews, and applications."""

    __tablename__ = "remediation_audits"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    proposal_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("remediation_proposals.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    repository_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("repositories.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    action: Mapped[str] = mapped_column(String(64), nullable=False)
    actor: Mapped[str] = mapped_column(String(128), default="system", nullable=False)
    details_json: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    # Relationships
    proposal: Mapped["RemediationProposal"] = relationship("RemediationProposal", back_populates="audits")
    repository: Mapped["Repository"] = relationship("Repository")

    __table_args__ = (
        Index("ix_remediation_audit_prop", "proposal_id"),
    )


class AuditRun(Base, TimestampMixin):
    """Execution record for a unified multi-pillar audit run."""

    __tablename__ = "audit_runs"

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
    status: Mapped[str] = mapped_column(String(32), default="COMPLETED", nullable=False)
    overall_status: Mapped[str] = mapped_column(String(32), default="PASSED", nullable=False)
    summary_json: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    checks_json: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    findings_json: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    markdown_report: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sarif_json: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    repository: Mapped["Repository"] = relationship("Repository", back_populates="audit_runs")
    snapshot: Mapped["RepositorySnapshot"] = relationship("RepositorySnapshot", back_populates="audit_runs")

    __table_args__ = (
        Index("ix_audit_runs_repo_snap", "repository_id", "snapshot_id"),
        Index("ix_audit_runs_overall", "overall_status"),
    )


class CIAuditRun(Base, TimestampMixin):
    """External CI run results ingested via secure webhook."""

    __tablename__ = "ci_audit_runs"

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
    idempotency_key: Mapped[str] = mapped_column(String(128), nullable=False, unique=True, index=True)
    ci_provider: Mapped[str] = mapped_column(String(64), default="github_actions", nullable=False)
    commit_sha: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    branch: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    event_name: Mapped[str] = mapped_column(String(64), default="push", nullable=False)
    workflow_name: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="SUCCESS", nullable=False)
    payload_json: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    signature_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    repository: Mapped["Repository"] = relationship("Repository", back_populates="ci_audit_runs")

    __table_args__ = (
        Index("ix_ci_audit_runs_repo_key", "repository_id", "idempotency_key"),
    )


class PrPreparation(Base, TimestampMixin):
    """Change set synthesis for human-reviewed Pull Request creation."""

    __tablename__ = "pr_preparations"

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
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="PREPARED", nullable=False)
    proposal_ids_json: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    combined_diff: Mapped[str] = mapped_column(Text, nullable=False)
    patch_bundle: Mapped[str] = mapped_column(Text, nullable=False)
    conflict_details_json: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    risk_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    repository: Mapped["Repository"] = relationship("Repository", back_populates="pr_preparations")
    snapshot: Mapped["RepositorySnapshot"] = relationship("RepositorySnapshot", back_populates="pr_preparations")

    __table_args__ = (
        Index("ix_pr_preparations_repo_snap", "repository_id", "snapshot_id"),
        Index("ix_pr_preparations_status", "status"),
    )


