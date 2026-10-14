"""0006_phase5_architecture_health

Revision ID: 0006_phase5
Revises: 0005_phase4
Create Date: 2026-10-14 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0006_phase5"
down_revision: Union[str, None] = "0005_phase4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. architecture_runs table
    op.create_table(
        "architecture_runs",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("repository_id", sa.String(length=36), sa.ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False),
        sa.Column("snapshot_id", sa.String(length=36), sa.ForeignKey("repository_snapshots.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("modules_analyzed", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("internal_edges_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("external_deps_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("unresolved_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("cycles_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("violations_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("policy_configured", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("policy_path", sa.String(length=255), nullable=True),
        sa.Column("failure_code", sa.String(length=64), nullable=True),
        sa.Column("failure_reason", sa.String(length=1024), nullable=True),
        sa.Column("summary_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_architecture_runs_repository_id", "architecture_runs", ["repository_id"], unique=False)
    op.create_index("ix_architecture_runs_snapshot_id", "architecture_runs", ["snapshot_id"], unique=False)
    op.create_index("ix_architecture_runs_status", "architecture_runs", ["status"], unique=False)

    # 2. architecture_violations table
    op.create_table(
        "architecture_violations",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("architecture_run_id", sa.String(length=36), sa.ForeignKey("architecture_runs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("repository_id", sa.String(length=36), sa.ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False),
        sa.Column("snapshot_id", sa.String(length=36), sa.ForeignKey("repository_snapshots.id", ondelete="CASCADE"), nullable=False),
        sa.Column("rule_id", sa.String(length=64), nullable=False),
        sa.Column("policy_id", sa.String(length=255), nullable=False),
        sa.Column("source_module", sa.String(length=1024), nullable=False),
        sa.Column("target_module", sa.String(length=1024), nullable=False),
        sa.Column("edge_specifier", sa.String(length=255), nullable=False),
        sa.Column("line_number", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("violated_boundary", sa.String(length=255), nullable=False),
        sa.Column("description", sa.String(length=1024), nullable=False),
        sa.Column("remediation", sa.String(length=1024), nullable=False),
        sa.Column("severity", sa.String(length=32), nullable=False, server_default="HIGH"),
        sa.Column("confidence", sa.String(length=32), nullable=False, server_default="HIGH"),
        sa.Column("fingerprint", sa.String(length=64), nullable=False),
        sa.Column("metadata_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_arch_violations_run_sev", "architecture_violations", ["architecture_run_id", "severity"], unique=False)
    op.create_index("ix_arch_violations_fingerprint", "architecture_violations", ["fingerprint"], unique=False)
    op.create_index("ix_arch_violations_rule_id", "architecture_violations", ["rule_id"], unique=False)
    op.create_index("ix_arch_violations_source_module", "architecture_violations", ["source_module"], unique=False)
    op.create_index("ix_arch_violations_target_module", "architecture_violations", ["target_module"], unique=False)

    # 3. codebase_health_assessments table
    op.create_table(
        "codebase_health_assessments",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("repository_id", sa.String(length=36), sa.ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False),
        sa.Column("snapshot_id", sa.String(length=36), sa.ForeignKey("repository_snapshots.id", ondelete="CASCADE"), nullable=False),
        sa.Column("analysis_run_id", sa.String(length=36), sa.ForeignKey("analysis_runs.id", ondelete="SET NULL"), nullable=True),
        sa.Column("dependency_run_id", sa.String(length=36), sa.ForeignKey("dependency_runs.id", ondelete="SET NULL"), nullable=True),
        sa.Column("architecture_run_id", sa.String(length=36), sa.ForeignKey("architecture_runs.id", ondelete="SET NULL"), nullable=True),
        sa.Column("scoring_version", sa.String(length=32), nullable=False, server_default="1.0.0"),
        sa.Column("overall_score", sa.Float(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="completed"),
        sa.Column("dimensions_json", sa.JSON(), nullable=False),
        sa.Column("metrics_json", sa.JSON(), nullable=False),
        sa.Column("recommendations_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_health_assessments_repo_snap", "codebase_health_assessments", ["repository_id", "snapshot_id"], unique=False)
    op.create_index("ix_health_assessments_status", "codebase_health_assessments", ["status"], unique=False)


def downgrade() -> None:
    op.drop_table("codebase_health_assessments")
    op.drop_table("architecture_violations")
    op.drop_table("architecture_runs")
