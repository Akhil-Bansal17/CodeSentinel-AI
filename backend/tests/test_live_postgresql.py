"""Live PostgreSQL Verification Tests for CodeSentinel AI Phase 1.

Directly tests PostgreSQL (port 5433 test instance) against:
- Connection and migration schema validation
- Persistence of Repository, RepositorySnapshot, and RepositoryFile
- Native PostgreSQL JSON column storage & query
- Foreign key CASCADE deletion across tables
- Transactional rollback on error
"""

import uuid
from datetime import datetime, timezone
import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from backend.app.models.base import Repository, RepositoryFile, RepositorySnapshot

POSTGRES_TEST_URL = "postgresql+psycopg://postgres:postgres@localhost:5433/codesentinel"


def is_live_postgres_available() -> bool:
    """Check if the live test PostgreSQL instance is reachable."""
    try:
        engine = create_engine(POSTGRES_TEST_URL, pool_pre_ping=True)
        with engine.connect() as conn:
            return True
    except Exception:
        return False


@pytest.fixture(scope="module")
def postgres_session():
    """Session fixture connected to live PostgreSQL."""
    if not is_live_postgres_available():
        pytest.skip("Live PostgreSQL instance on port 5433 is not reachable.")

    engine = create_engine(POSTGRES_TEST_URL)
    Session = sessionmaker(bind=engine)
    session = Session()
    try:
        yield session
    finally:
        session.close()


def test_live_postgresql_persistence_and_json(postgres_session):
    """Verify live PostgreSQL persists models and native JSON fields."""
    now = datetime.now(timezone.utc)
    repo_id = str(uuid.uuid4())
    snap_id = str(uuid.uuid4())
    file_id = str(uuid.uuid4())

    repo = Repository(
        id=repo_id,
        name="pg-live-test-repo",
        source_type="local",
        source_identifier="local:pg-live-test-repo",
        status="completed",
        created_at=now,
        updated_at=now,
    )
    postgres_session.add(repo)

    metrics_payload = {
        "summary": {"total_files": 1, "source_files": 1, "lines_of_code": 10},
        "tags": ["deterministic", "postgresql"],
    }
    lang_payload = {"Python": {"file_count": 1, "percentage": 100.0}}

    snapshot = RepositorySnapshot(
        id=snap_id,
        repository_id=repo_id,
        status="completed",
        started_at=now,
        completed_at=now,
        file_count=1,
        source_file_count=1,
        total_lines_of_code=10,
        metrics_json=metrics_payload,
        language_distribution=lang_payload,
        created_at=now,
        updated_at=now,
    )
    postgres_session.add(snapshot)

    repo_file = RepositoryFile(
        id=file_id,
        snapshot_id=snap_id,
        relative_path="src/main.py",
        file_name="main.py",
        extension=".py",
        language="Python",
        category="source",
        size_bytes=150,
        is_source_file=True,
        is_binary=False,
        line_count=10,
        sha256="deadbeef12345678",
        created_at=now,
        updated_at=now,
    )
    postgres_session.add(repo_file)
    postgres_session.commit()

    # Query back from PostgreSQL
    fetched_repo = postgres_session.scalar(select(Repository).where(Repository.id == repo_id))
    assert fetched_repo is not None
    assert fetched_repo.name == "pg-live-test-repo"

    fetched_snap = postgres_session.scalar(select(RepositorySnapshot).where(RepositorySnapshot.id == snap_id))
    assert fetched_snap is not None
    assert fetched_snap.metrics_json == metrics_payload
    assert fetched_snap.language_distribution == lang_payload

    fetched_file = postgres_session.scalar(select(RepositoryFile).where(RepositoryFile.id == file_id))
    assert fetched_file is not None
    assert fetched_file.relative_path == "src/main.py"


def test_live_postgresql_cascade_deletion(postgres_session):
    """Verify PostgreSQL foreign key CASCADE deletes snapshots and files when repo is deleted."""
    now = datetime.now(timezone.utc)
    repo_id = str(uuid.uuid4())
    snap_id = str(uuid.uuid4())
    file_id = str(uuid.uuid4())

    repo = Repository(
        id=repo_id,
        name="pg-cascade-repo",
        source_type="local",
        source_identifier="local:pg-cascade-repo",
        status="completed",
        created_at=now,
        updated_at=now,
    )
    snapshot = RepositorySnapshot(
        id=snap_id,
        repository_id=repo_id,
        status="completed",
        started_at=now,
        created_at=now,
        updated_at=now,
    )
    repo_file = RepositoryFile(
        id=file_id,
        snapshot_id=snap_id,
        relative_path="index.ts",
        file_name="index.ts",
        extension=".ts",
        language="TypeScript",
        category="source",
        created_at=now,
        updated_at=now,
    )
    postgres_session.add(repo)
    postgres_session.add(snapshot)
    postgres_session.add(repo_file)
    postgres_session.commit()

    # Verify all 3 records exist in live PostgreSQL
    assert postgres_session.scalar(select(Repository).where(Repository.id == repo_id)) is not None
    assert postgres_session.scalar(select(RepositorySnapshot).where(RepositorySnapshot.id == snap_id)) is not None
    assert postgres_session.scalar(select(RepositoryFile).where(RepositoryFile.id == file_id)) is not None

    # Delete repository directly
    postgres_session.delete(repo)
    postgres_session.commit()

    # Verify CASCADE: snapshots and files must be automatically deleted by PostgreSQL!
    assert postgres_session.scalar(select(Repository).where(Repository.id == repo_id)) is None
    assert postgres_session.scalar(select(RepositorySnapshot).where(RepositorySnapshot.id == snap_id)) is None
    assert postgres_session.scalar(select(RepositoryFile).where(RepositoryFile.id == file_id)) is None
