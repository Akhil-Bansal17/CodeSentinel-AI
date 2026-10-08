"""0001_initial_repositories

Revision ID: 0001_initial
Revises: 
Create Date: 2026-10-08 21:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "repositories",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("remote_url", sa.String(length=1024), nullable=True),
        sa.Column("default_branch", sa.String(length=128), nullable=False, server_default="main"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="registered"),
        sa.Column("description", sa.String(length=1024), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_repositories_name"), "repositories", ["name"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_repositories_name"), table_name="repositories")
    op.drop_table("repositories")
