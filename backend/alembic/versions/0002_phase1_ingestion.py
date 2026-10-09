"""0002_phase1_ingestion

Revision ID: 0002_phase1
Revises: 0001_initial
Create Date: 2026-10-09 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0002_phase1"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Alter repositories table to add Phase 1 ingestion fields
    op.add_column(
        "repositories",
        sa.Column("source_type", sa.String(length=32), nullable=False, server_default="github"),
    )
    op.add_column(
        "repositories",
        sa.Column("source_url", sa.String(length=1024), nullable=True),
    )
    op.add_column(
        "repositories",
        sa.Column("source_identifier", sa.String(length=512), nullable=False, server_default=""),
    )
    op.add_column(
        "repositories",
        sa.Column("last_ingested_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "repositories",
        sa.Column("error_code", sa.String(length=64), nullable=True),
    )
    op.create_index(
        op.f("ix_repositories_source_identifier"),
        "repositories",
        ["source_identifier"],
        unique=False,
    )

    # 2. Create repository_snapshots table
    op.create_table(
        "repository_snapshots",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("repository_id", sa.String(length=36), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="processing"),
        sa.Column("commit_sha", sa.String(length=64), nullable=True),
        sa.Column("branch", sa.String(length=128), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("file_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("source_file_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("ignored_file_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_size_bytes", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("directory_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_lines_of_code", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("language_distribution", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("metrics_json", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("failure_code", sa.String(length=64), nullable=True),
        sa.Column("failure_reason", sa.String(length=1024), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["repository_id"], ["repositories.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_repository_snapshots_repository_id"),
        "repository_snapshots",
        ["repository_id"],
        unique=False,
    )

    # 3. Create repository_files table
    op.create_table(
        "repository_files",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("snapshot_id", sa.String(length=36), nullable=False),
        sa.Column("relative_path", sa.String(length=1024), nullable=False),
        sa.Column("file_name", sa.String(length=255), nullable=False),
        sa.Column("extension", sa.String(length=64), nullable=False, server_default=""),
        sa.Column("language", sa.String(length=64), nullable=False, server_default="Unknown"),
        sa.Column("category", sa.String(length=32), nullable=False, server_default="other"),
        sa.Column("size_bytes", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("is_source_file", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_binary", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("line_count", sa.Integer(), nullable=True),
        sa.Column("sha256", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["snapshot_id"], ["repository_snapshots.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_repository_files_snapshot_id"),
        "repository_files",
        ["snapshot_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_repository_files_relative_path"),
        "repository_files",
        ["relative_path"],
        unique=False,
    )
    op.create_index(
        op.f("ix_repository_files_file_name"),
        "repository_files",
        ["file_name"],
        unique=False,
    )
    op.create_index(
        op.f("ix_repository_files_extension"),
        "repository_files",
        ["extension"],
        unique=False,
    )
    op.create_index(
        op.f("ix_repository_files_language"),
        "repository_files",
        ["language"],
        unique=False,
    )
    op.create_index(
        op.f("ix_repository_files_category"),
        "repository_files",
        ["category"],
        unique=False,
    )
    op.create_index(
        "ix_repository_files_snapshot_lang",
        "repository_files",
        ["snapshot_id", "language"],
        unique=False,
    )
    op.create_index(
        "ix_repository_files_snapshot_cat",
        "repository_files",
        ["snapshot_id", "category"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_repository_files_snapshot_cat", table_name="repository_files")
    op.drop_index("ix_repository_files_snapshot_lang", table_name="repository_files")
    op.drop_index(op.f("ix_repository_files_category"), table_name="repository_files")
    op.drop_index(op.f("ix_repository_files_language"), table_name="repository_files")
    op.drop_index(op.f("ix_repository_files_extension"), table_name="repository_files")
    op.drop_index(op.f("ix_repository_files_file_name"), table_name="repository_files")
    op.drop_index(op.f("ix_repository_files_relative_path"), table_name="repository_files")
    op.drop_index(op.f("ix_repository_files_snapshot_id"), table_name="repository_files")
    op.drop_table("repository_files")

    op.drop_index(op.f("ix_repository_snapshots_repository_id"), table_name="repository_snapshots")
    op.drop_table("repository_snapshots")

    op.drop_index(op.f("ix_repositories_source_identifier"), table_name="repositories")
    op.drop_column("repositories", "error_code")
    op.drop_column("repositories", "last_ingested_at")
    op.drop_column("repositories", "source_identifier")
    op.drop_column("repositories", "source_url")
    op.drop_column("repositories", "source_type")
