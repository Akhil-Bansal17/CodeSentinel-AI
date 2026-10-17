"""0008_phase7_remediation

Revision ID: 0008_phase7
Revises: 0007_phase6
Create Date: 2026-10-17 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0008_phase7"
down_revision: Union[str, None] = "0007_phase6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. remediation_proposals table
    op.create_table(
        "remediation_proposals",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("repository_id", sa.String(length=36), sa.ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False),
        sa.Column("snapshot_id", sa.String(length=36), sa.ForeignKey("repository_snapshots.id", ondelete="CASCADE"), nullable=False),
        sa.Column("finding_id", sa.String(length=36), sa.ForeignKey("analysis_findings.id", ondelete="CASCADE"), nullable=True),
        sa.Column("finding_type", sa.String(length=32), nullable=False, server_default="STATIC_ANALYSIS"),
        sa.Column("remediation_rule_id", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="PROPOSED"),
        sa.Column("file_path", sa.String(length=1024), nullable=False),
        sa.Column("original_content_hash", sa.String(length=64), nullable=False),
        sa.Column("target_content_hash", sa.String(length=64), nullable=False),
        sa.Column("start_line", sa.Integer(), nullable=False),
        sa.Column("end_line", sa.Integer(), nullable=False),
        sa.Column("start_column", sa.Integer(), nullable=True),
        sa.Column("end_column", sa.Integer(), nullable=True),
        sa.Column("original_code_snippet", sa.Text(), nullable=False),
        sa.Column("proposed_code_snippet", sa.Text(), nullable=False),
        sa.Column("unified_diff", sa.Text(), nullable=False),
        sa.Column("rationale", sa.Text(), nullable=False),
        sa.Column("confidence", sa.String(length=32), nullable=False, server_default="HIGH"),
        sa.Column("risk_level", sa.String(length=32), nullable=False, server_default="LOW"),
        sa.Column("is_llm_assisted", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("failure_reason", sa.String(length=1024), nullable=True),
        sa.Column("applied_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("applied_by", sa.String(length=128), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_remediation_props_repo_snap", "remediation_proposals", ["repository_id", "snapshot_id"])
    op.create_index("ix_remediation_props_status", "remediation_proposals", ["status"])
    op.create_index("ix_remediation_props_finding", "remediation_proposals", ["finding_id"])
    op.create_index("ix_remediation_props_rule", "remediation_proposals", ["remediation_rule_id"])

    # 2. remediation_validations table
    op.create_table(
        "remediation_validations",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("proposal_id", sa.String(length=36), sa.ForeignKey("remediation_proposals.id", ondelete="CASCADE"), nullable=False),
        sa.Column("check_id", sa.String(length=64), nullable=False),
        sa.Column("check_name", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("explanation", sa.Text(), nullable=False),
        sa.Column("diagnostic_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_remediation_val_prop", "remediation_validations", ["proposal_id"])

    # 3. remediation_audits table
    op.create_table(
        "remediation_audits",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("proposal_id", sa.String(length=36), sa.ForeignKey("remediation_proposals.id", ondelete="CASCADE"), nullable=False),
        sa.Column("repository_id", sa.String(length=36), sa.ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False),
        sa.Column("action", sa.String(length=64), nullable=False),
        sa.Column("actor", sa.String(length=128), nullable=False, server_default="system"),
        sa.Column("details_json", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_remediation_audit_prop", "remediation_audits", ["proposal_id"])
    op.create_index("ix_remediation_audit_repo", "remediation_audits", ["repository_id"])


def downgrade() -> None:
    op.drop_table("remediation_audits")
    op.drop_table("remediation_validations")
    op.drop_table("remediation_proposals")
