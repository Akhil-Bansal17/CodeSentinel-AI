"""0004_phase3_dependency_sca

Revision ID: 0004_phase3
Revises: 0003_phase2
Create Date: 2026-10-12 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0004_phase3"
down_revision: Union[str, None] = "0003_phase2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create advisory_datasets table
    op.create_table(
        "advisory_datasets",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("dataset_version", sa.String(length=64), nullable=False),
        sa.Column("source_name", sa.String(length=64), nullable=False, server_default="codesentinel_curated"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="active"),
        sa.Column("records_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("checksum", sa.String(length=64), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("dataset_version"),
    )
    op.create_index(
        op.f("ix_advisory_datasets_dataset_version"),
        "advisory_datasets",
        ["dataset_version"],
        unique=True,
    )
    op.create_index(
        op.f("ix_advisory_datasets_status"),
        "advisory_datasets",
        ["status"],
        unique=False,
    )

    # 2. Create vulnerability_advisories table
    op.create_table(
        "vulnerability_advisories",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("dataset_id", sa.String(length=36), nullable=True),
        sa.Column("advisory_id", sa.String(length=64), nullable=False),
        sa.Column("ecosystem", sa.String(length=32), nullable=False),
        sa.Column("package_name", sa.String(length=255), nullable=False),
        sa.Column("summary", sa.String(length=1024), nullable=False),
        sa.Column("description", sa.String(length=4096), nullable=True),
        sa.Column("severity", sa.String(length=32), nullable=False),
        sa.Column("severity_source", sa.String(length=64), nullable=False, server_default="AUTHORITATIVE"),
        sa.Column("cvss_score", sa.Float(), nullable=True),
        sa.Column("cve_ids", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("affected_ranges_json", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("fixed_versions_json", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("source_url", sa.String(length=1024), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("modified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["dataset_id"], ["advisory_datasets.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_vulnerability_advisories_advisory_id"),
        "vulnerability_advisories",
        ["advisory_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_vulnerability_advisories_ecosystem"),
        "vulnerability_advisories",
        ["ecosystem"],
        unique=False,
    )
    op.create_index(
        op.f("ix_vulnerability_advisories_package_name"),
        "vulnerability_advisories",
        ["package_name"],
        unique=False,
    )
    op.create_index(
        op.f("ix_vulnerability_advisories_severity"),
        "vulnerability_advisories",
        ["severity"],
        unique=False,
    )
    op.create_index(
        op.f("ix_vulnerability_advisories_dataset_id"),
        "vulnerability_advisories",
        ["dataset_id"],
        unique=False,
    )
    op.create_index(
        "ix_vulnerability_advisories_lookup",
        "vulnerability_advisories",
        ["ecosystem", "package_name"],
        unique=False,
    )
    op.create_index(
        "ix_vulnerability_advisories_advisory_eco",
        "vulnerability_advisories",
        ["advisory_id", "ecosystem"],
        unique=False,
    )

    # 3. Create dependency_runs table
    op.create_table(
        "dependency_runs",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("repository_id", sa.String(length=36), nullable=False),
        sa.Column("snapshot_id", sa.String(length=36), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("advisory_dataset_version", sa.String(length=64), nullable=True),
        sa.Column("parser_version", sa.String(length=32), nullable=False, server_default="1.0.0"),
        sa.Column("matching_engine_version", sa.String(length=32), nullable=False, server_default="1.0.0"),
        sa.Column("dependencies_discovered", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("dependencies_resolved", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("dependencies_unresolved", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("vulnerabilities_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("manifest_files_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("failure_code", sa.String(length=64), nullable=True),
        sa.Column("failure_reason", sa.String(length=1024), nullable=True),
        sa.Column("summary_json", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["repository_id"], ["repositories.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["snapshot_id"], ["repository_snapshots.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_dependency_runs_repository_id"),
        "dependency_runs",
        ["repository_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_dependency_runs_snapshot_id"),
        "dependency_runs",
        ["snapshot_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_dependency_runs_status"),
        "dependency_runs",
        ["status"],
        unique=False,
    )

    # 4. Create repository_dependencies table
    op.create_table(
        "repository_dependencies",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("dependency_run_id", sa.String(length=36), nullable=False),
        sa.Column("repository_id", sa.String(length=36), nullable=False),
        sa.Column("snapshot_id", sa.String(length=36), nullable=False),
        sa.Column("manifest_path", sa.String(length=1024), nullable=False),
        sa.Column("lockfile_path", sa.String(length=1024), nullable=True),
        sa.Column("ecosystem", sa.String(length=32), nullable=False),
        sa.Column("package_name", sa.String(length=255), nullable=False),
        sa.Column("original_package_name", sa.String(length=255), nullable=False),
        sa.Column("version_constraint", sa.String(length=255), nullable=True),
        sa.Column("resolved_version", sa.String(length=128), nullable=True),
        sa.Column("dependency_type", sa.String(length=32), nullable=False, server_default="direct"),
        sa.Column("is_direct", sa.Boolean(), nullable=True),
        sa.Column("scope", sa.String(length=64), nullable=True),
        sa.Column("parser_name", sa.String(length=64), nullable=False),
        sa.Column("parser_version", sa.String(length=32), nullable=False, server_default="1.0.0"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="resolved"),
        sa.Column("metadata_json", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["dependency_run_id"], ["dependency_runs.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["repository_id"], ["repositories.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["snapshot_id"], ["repository_snapshots.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_repository_dependencies_dependency_run_id"),
        "repository_dependencies",
        ["dependency_run_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_repository_dependencies_ecosystem"),
        "repository_dependencies",
        ["ecosystem"],
        unique=False,
    )
    op.create_index(
        op.f("ix_repository_dependencies_package_name"),
        "repository_dependencies",
        ["package_name"],
        unique=False,
    )
    op.create_index(
        op.f("ix_repository_dependencies_resolved_version"),
        "repository_dependencies",
        ["resolved_version"],
        unique=False,
    )
    op.create_index(
        op.f("ix_repository_dependencies_status"),
        "repository_dependencies",
        ["status"],
        unique=False,
    )
    op.create_index(
        "ix_repo_deps_run_eco_pkg",
        "repository_dependencies",
        ["dependency_run_id", "ecosystem", "package_name"],
        unique=False,
    )
    op.create_index(
        "ix_repo_deps_snap_eco",
        "repository_dependencies",
        ["snapshot_id", "ecosystem"],
        unique=False,
    )

    # 5. Create dependency_vulnerabilities table
    op.create_table(
        "dependency_vulnerabilities",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("dependency_run_id", sa.String(length=36), nullable=False),
        sa.Column("dependency_id", sa.String(length=36), nullable=True),
        sa.Column("repository_id", sa.String(length=36), nullable=False),
        sa.Column("snapshot_id", sa.String(length=36), nullable=False),
        sa.Column("advisory_id", sa.String(length=64), nullable=False),
        sa.Column("ecosystem", sa.String(length=32), nullable=False),
        sa.Column("package_name", sa.String(length=255), nullable=False),
        sa.Column("resolved_version", sa.String(length=128), nullable=True),
        sa.Column("affected_range", sa.String(length=255), nullable=False),
        sa.Column("severity", sa.String(length=32), nullable=False),
        sa.Column("severity_source", sa.String(length=64), nullable=False, server_default="AUTHORITATIVE"),
        sa.Column("cvss_score", sa.Float(), nullable=True),
        sa.Column("remediation_version", sa.String(length=128), nullable=True),
        sa.Column("manifest_path", sa.String(length=1024), nullable=False),
        sa.Column("line_number", sa.Integer(), nullable=True),
        sa.Column("evidence_summary", sa.String(length=1024), nullable=False),
        sa.Column("fingerprint", sa.String(length=64), nullable=False),
        sa.Column("cve_ids", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("advisory_dataset_version", sa.String(length=64), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["dependency_run_id"], ["dependency_runs.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["dependency_id"], ["repository_dependencies.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["repository_id"], ["repositories.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["snapshot_id"], ["repository_snapshots.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_dependency_vulnerabilities_dependency_run_id"),
        "dependency_vulnerabilities",
        ["dependency_run_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_dependency_vulnerabilities_advisory_id"),
        "dependency_vulnerabilities",
        ["advisory_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_dependency_vulnerabilities_severity"),
        "dependency_vulnerabilities",
        ["severity"],
        unique=False,
    )
    op.create_index(
        op.f("ix_dependency_vulnerabilities_fingerprint"),
        "dependency_vulnerabilities",
        ["fingerprint"],
        unique=False,
    )
    op.create_index(
        "ix_dep_vulns_run_sev",
        "dependency_vulnerabilities",
        ["dependency_run_id", "severity"],
        unique=False,
    )
    op.create_index(
        "ix_dep_vulns_run_eco",
        "dependency_vulnerabilities",
        ["dependency_run_id", "ecosystem"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_table("dependency_vulnerabilities")
    op.drop_table("repository_dependencies")
    op.drop_table("dependency_runs")
    op.drop_table("vulnerability_advisories")
    op.drop_table("advisory_datasets")
