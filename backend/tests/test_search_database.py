"""Database tests for Phase 6 search models, migrations, and cascade behavior."""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app.models.base import Base, CodeChunk, CodeIndexRun, Repository, RepositorySnapshot


def test_code_index_models_and_cascade_delete():
    """Verify CodeIndexRun and CodeChunk mapping and cascade delete on Repository."""
    test_engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=test_engine)

    TestSession = sessionmaker(bind=test_engine)
    session = TestSession()

    repo = Repository(
        id="repo-db-test",
        name="test-repo",
        source_identifier="local:test-repo",
    )
    snap = RepositorySnapshot(
        id="snap-db-test",
        repository_id=repo.id,
        status="completed",
    )
    session.add(repo)
    session.add(snap)
    session.commit()

    run = CodeIndexRun(
        id="run-db-test",
        repository_id=repo.id,
        snapshot_id=snap.id,
        status="completed",
        chunk_count=1,
    )
    session.add(run)

    chunk = CodeChunk(
        id="chunk-db-test",
        index_run_id=run.id,
        repository_id=repo.id,
        snapshot_id=snap.id,
        relative_path="src/index.py",
        file_name="index.py",
        language="Python",
        chunk_index=0,
        chunk_type="function",
        symbol_name="main",
        start_line=1,
        end_line=5,
        content="def main(): pass",
        content_hash="h1",
        chunk_fingerprint="fp1",
    )
    session.add(chunk)
    session.commit()

    # Verify query
    saved_chunk = session.query(CodeChunk).filter_by(id="chunk-db-test").first()
    assert saved_chunk is not None
    assert saved_chunk.symbol_name == "main"
    assert saved_chunk.relative_path == "src/index.py"

    # Delete repository and verify cascade
    session.delete(repo)
    session.commit()

    remaining_runs = session.query(CodeIndexRun).filter_by(id="run-db-test").all()
    remaining_chunks = session.query(CodeChunk).filter_by(id="chunk-db-test").all()
    assert len(remaining_runs) == 0
    assert len(remaining_chunks) == 0

    session.close()
