"""0005_phase4_security_intelligence

Revision ID: 0005_phase4
Revises: 0004_phase3
Create Date: 2026-10-13 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0005_phase4"
down_revision: Union[str, None] = "0004_phase3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add confidence column to analysis_findings
    op.add_column(
        "analysis_findings",
        sa.Column("confidence", sa.String(length=32), nullable=False, server_default="MEDIUM"),
    )
    op.create_index(
        op.f("ix_analysis_findings_confidence"),
        "analysis_findings",
        ["confidence"],
        unique=False,
    )
    op.create_index(
        "ix_analysis_findings_run_conf",
        "analysis_findings",
        ["analysis_run_id", "confidence"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_analysis_findings_run_conf", table_name="analysis_findings")
    op.drop_index(op.f("ix_analysis_findings_confidence"), table_name="analysis_findings")
    op.drop_column("analysis_findings", "confidence")
