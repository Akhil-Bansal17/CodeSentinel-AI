"""0009_phase8_cicd_audit_pr

Revision ID: 0009_phase8
Revises: 0008_phase7
Create Date: 2026-10-18 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0009_phase8"
down_revision: Union[str, None] = "0008_phase7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. audit_runs table
    op.create_table(
        "audit_runs",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("repository_id", sa.String(length=36), sa.ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False),
        sa.Column("snapshot_id", sa.String(length=36), sa.ForeignKey("repository_snapshots.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="COMPLETED"),
        sa.Column("overall_status", sa.String(length=32), nullable=False, server_default="PASSED"),
        sa.Column("summary_json", sa.JSON(), nullable=False),
        sa.Column("checks_json", sa.JSON(), nullable=False),
        sa.Column("findings_json", sa.JSON(), nullable=False),
        sa.Column("markdown_report", sa.Text(), nullable=True),
        sa.Column("sarif_json", sa.JSON(), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_audit_runs_repo_snap", "audit_runs", ["repository_id", "snapshot_id"])
    op.create_index("ix_audit_runs_overall", "audit_runs", ["overall_status"])

    # 2. ci_audit_runs table
    op.create_table(
        "ci_audit_runs",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("repository_id", sa.String(length=36), sa.ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False),
        sa.Column("idempotency_key", sa.String(length=128), nullable=False, unique=True),
        sa.Column("ci_provider", sa.String(length=64), nullable=False, server_default="github_actions"),
        sa.Column("commit_sha", sa.String(length=64), nullable=True),
        sa.Column("branch", sa.String(length=128), nullable=True),
        sa.Column("event_name", sa.String(length=64), nullable=False, server_default="push"),
        sa.Column("workflow_name", sa.String(length=128), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="SUCCESS"),
        sa.Column("payload_json", sa.JSON(), nullable=False),
        sa.Column("signature_verified", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_ci_audit_runs_repo_key", "ci_audit_runs", ["repository_id", "idempotency_key"])

    # 3. pr_preparations table
    op.create_table(
        "pr_preparations",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("repository_id", sa.String(length=36), sa.ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False),
        sa.Column("snapshot_id", sa.String(length=36), sa.ForeignKey("repository_snapshots.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="PREPARED"),
        sa.Column("proposal_ids_json", sa.JSON(), nullable=False),
        sa.Column("combined_diff", sa.Text(), nullable=False),
        sa.Column("patch_bundle", sa.Text(), nullable=False),
        sa.Column("conflict_details_json", sa.JSON(), nullable=False),
        sa.Column("risk_summary", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_pr_preparations_repo_snap", "pr_preparations", ["repository_id", "snapshot_id"])
    op.create_index("ix_pr_preparations_status", "pr_preparations", ["status"])


def downgrade() -> None:
    op.drop_table("pr_preparations")
    op.drop_table("ci_audit_runs")
    op.drop_table("audit_runs")
