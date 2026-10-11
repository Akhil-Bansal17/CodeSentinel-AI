"""0003_phase2_analysis

Revision ID: 0003_phase2
Revises: 0002_phase1
Create Date: 2026-10-11 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0003_phase2"
down_revision: Union[str, None] = "0002_phase1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create analysis_runs table
    op.create_table(
        "analysis_runs",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("repository_id", sa.String(length=36), nullable=False),
        sa.Column("snapshot_id", sa.String(length=36), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("rule_set_version", sa.String(length=32), nullable=False, server_default="1.0.0"),
        sa.Column("files_discovered", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("files_analyzed", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("files_skipped", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("findings_count", sa.Integer(), nullable=False, server_default="0"),
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
        op.f("ix_analysis_runs_repository_id"),
        "analysis_runs",
        ["repository_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_analysis_runs_snapshot_id"),
        "analysis_runs",
        ["snapshot_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_analysis_runs_status"),
        "analysis_runs",
        ["status"],
        unique=False,
    )

    # 2. Create analysis_findings table
    op.create_table(
        "analysis_findings",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("analysis_run_id", sa.String(length=36), nullable=False),
        sa.Column("repository_id", sa.String(length=36), nullable=False),
        sa.Column("snapshot_id", sa.String(length=36), nullable=False),
        sa.Column("rule_id", sa.String(length=64), nullable=False),
        sa.Column("rule_name", sa.String(length=255), nullable=False),
        sa.Column("rule_version", sa.String(length=32), nullable=False, server_default="1.0.0"),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.String(length=1024), nullable=False),
        sa.Column("severity", sa.String(length=32), nullable=False),
        sa.Column("category", sa.String(length=64), nullable=False),
        sa.Column("file_path", sa.String(length=1024), nullable=False),
        sa.Column("start_line", sa.Integer(), nullable=False),
        sa.Column("start_column", sa.Integer(), nullable=True),
        sa.Column("end_line", sa.Integer(), nullable=True),
        sa.Column("end_column", sa.Integer(), nullable=True),
        sa.Column("evidence_summary", sa.String(length=1024), nullable=False),
        sa.Column("fingerprint", sa.String(length=64), nullable=False),
        sa.Column("metadata_json", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["analysis_run_id"], ["analysis_runs.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["repository_id"], ["repositories.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["snapshot_id"], ["repository_snapshots.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_analysis_findings_analysis_run_id"),
        "analysis_findings",
        ["analysis_run_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_analysis_findings_repository_id"),
        "analysis_findings",
        ["repository_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_analysis_findings_snapshot_id"),
        "analysis_findings",
        ["snapshot_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_analysis_findings_rule_id"),
        "analysis_findings",
        ["rule_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_analysis_findings_severity"),
        "analysis_findings",
        ["severity"],
        unique=False,
    )
    op.create_index(
        op.f("ix_analysis_findings_category"),
        "analysis_findings",
        ["category"],
        unique=False,
    )
    op.create_index(
        op.f("ix_analysis_findings_file_path"),
        "analysis_findings",
        ["file_path"],
        unique=False,
    )
    op.create_index(
        op.f("ix_analysis_findings_fingerprint"),
        "analysis_findings",
        ["fingerprint"],
        unique=False,
    )
    op.create_index(
        "ix_analysis_findings_run_sev",
        "analysis_findings",
        ["analysis_run_id", "severity"],
        unique=False,
    )
    op.create_index(
        "ix_analysis_findings_run_cat",
        "analysis_findings",
        ["analysis_run_id", "category"],
        unique=False,
    )
    op.create_index(
        "ix_analysis_findings_run_file",
        "analysis_findings",
        ["analysis_run_id", "file_path"],
        unique=False,
    )
    op.create_index(
        "ix_analysis_findings_run_rule",
        "analysis_findings",
        ["analysis_run_id", "rule_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_analysis_findings_run_rule", table_name="analysis_findings")
    op.drop_index("ix_analysis_findings_run_file", table_name="analysis_findings")
    op.drop_index("ix_analysis_findings_run_cat", table_name="analysis_findings")
    op.drop_index("ix_analysis_findings_run_sev", table_name="analysis_findings")
    op.drop_index(op.f("ix_analysis_findings_fingerprint"), table_name="analysis_findings")
    op.drop_index(op.f("ix_analysis_findings_file_path"), table_name="analysis_findings")
    op.drop_index(op.f("ix_analysis_findings_category"), table_name="analysis_findings")
    op.drop_index(op.f("ix_analysis_findings_severity"), table_name="analysis_findings")
    op.drop_index(op.f("ix_analysis_findings_rule_id"), table_name="analysis_findings")
    op.drop_index(op.f("ix_analysis_findings_snapshot_id"), table_name="analysis_findings")
    op.drop_index(op.f("ix_analysis_findings_repository_id"), table_name="analysis_findings")
    op.drop_index(op.f("ix_analysis_findings_analysis_run_id"), table_name="analysis_findings")
    op.drop_table("analysis_findings")

    op.drop_index(op.f("ix_analysis_runs_status"), table_name="analysis_runs")
    op.drop_index(op.f("ix_analysis_runs_snapshot_id"), table_name="analysis_runs")
    op.drop_index(op.f("ix_analysis_runs_repository_id"), table_name="analysis_runs")
    op.drop_table("analysis_runs")
