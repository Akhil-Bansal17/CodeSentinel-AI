"""0007_phase6_search_qa

Revision ID: 0007_phase6
Revises: 0006_phase5
Create Date: 2026-10-15 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0007_phase6"
down_revision: Union[str, None] = "0006_phase5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. code_index_runs table
    op.create_table(
        "code_index_runs",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("repository_id", sa.String(length=36), sa.ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False),
        sa.Column("snapshot_id", sa.String(length=36), sa.ForeignKey("repository_snapshots.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("index_version", sa.String(length=32), nullable=False, server_default="1.0.0"),
        sa.Column("chunk_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("files_indexed", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("files_skipped", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("embedding_provider", sa.String(length=64), nullable=True),
        sa.Column("embedding_model", sa.String(length=128), nullable=True),
        sa.Column("embedding_dimension", sa.Integer(), nullable=True),
        sa.Column("failure_code", sa.String(length=64), nullable=True),
        sa.Column("failure_reason", sa.String(length=1024), nullable=True),
        sa.Column("summary_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_code_index_runs_repository_id", "code_index_runs", ["repository_id"], unique=False)
    op.create_index("ix_code_index_runs_snapshot_id", "code_index_runs", ["snapshot_id"], unique=False)
    op.create_index("ix_code_index_runs_status", "code_index_runs", ["status"], unique=False)

    # 2. code_chunks table
    op.create_table(
        "code_chunks",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("index_run_id", sa.String(length=36), sa.ForeignKey("code_index_runs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("repository_id", sa.String(length=36), sa.ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False),
        sa.Column("snapshot_id", sa.String(length=36), sa.ForeignKey("repository_snapshots.id", ondelete="CASCADE"), nullable=False),
        sa.Column("relative_path", sa.String(length=1024), nullable=False),
        sa.Column("file_name", sa.String(length=255), nullable=False),
        sa.Column("language", sa.String(length=64), nullable=False, server_default="Unknown"),
        sa.Column("chunk_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("chunk_type", sa.String(length=32), nullable=False, server_default="code_block"),
        sa.Column("symbol_name", sa.String(length=255), nullable=True),
        sa.Column("symbol_type", sa.String(length=64), nullable=True),
        sa.Column("start_line", sa.Integer(), nullable=False),
        sa.Column("end_line", sa.Integer(), nullable=False),
        sa.Column("start_column", sa.Integer(), nullable=True),
        sa.Column("end_column", sa.Integer(), nullable=True),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("content_hash", sa.String(length=64), nullable=False),
        sa.Column("chunk_fingerprint", sa.String(length=64), nullable=False),
        sa.Column("embedding", sa.JSON(), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_code_chunks_index_run_id", "code_chunks", ["index_run_id"], unique=False)
    op.create_index("ix_code_chunks_repository_id", "code_chunks", ["repository_id"], unique=False)
    op.create_index("ix_code_chunks_snapshot_id", "code_chunks", ["snapshot_id"], unique=False)
    op.create_index("ix_code_chunks_relative_path", "code_chunks", ["relative_path"], unique=False)
    op.create_index("ix_code_chunks_language", "code_chunks", ["language"], unique=False)
    op.create_index("ix_code_chunks_chunk_type", "code_chunks", ["chunk_type"], unique=False)
    op.create_index("ix_code_chunks_symbol_name", "code_chunks", ["symbol_name"], unique=False)
    op.create_index("ix_code_chunks_fingerprint", "code_chunks", ["chunk_fingerprint"], unique=False)
    op.create_index("ix_code_chunks_snap_lang", "code_chunks", ["snapshot_id", "language"], unique=False)
    op.create_index("ix_code_chunks_snap_path", "code_chunks", ["snapshot_id", "relative_path"], unique=False)
    op.create_index("ix_code_chunks_snap_sym", "code_chunks", ["snapshot_id", "symbol_name"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_code_chunks_snap_sym", table_name="code_chunks")
    op.drop_index("ix_code_chunks_snap_path", table_name="code_chunks")
    op.drop_index("ix_code_chunks_snap_lang", table_name="code_chunks")
    op.drop_index("ix_code_chunks_fingerprint", table_name="code_chunks")
    op.drop_index("ix_code_chunks_symbol_name", table_name="code_chunks")
    op.drop_index("ix_code_chunks_chunk_type", table_name="code_chunks")
    op.drop_index("ix_code_chunks_language", table_name="code_chunks")
    op.drop_index("ix_code_chunks_relative_path", table_name="code_chunks")
    op.drop_index("ix_code_chunks_snapshot_id", table_name="code_chunks")
    op.drop_index("ix_code_chunks_repository_id", table_name="code_chunks")
    op.drop_index("ix_code_chunks_index_run_id", table_name="code_chunks")
    op.drop_table("code_chunks")

    op.drop_index("ix_code_index_runs_status", table_name="code_index_runs")
    op.drop_index("ix_code_index_runs_snapshot_id", table_name="code_index_runs")
    op.drop_index("ix_code_index_runs_repository_id", table_name="code_index_runs")
    op.drop_table("code_index_runs")
