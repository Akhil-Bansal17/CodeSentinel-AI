"""Comprehensive Repository Lifecycle & Re-ingestion Tests for CodeSentinel AI Phase 1.

Verifies:
- Full lifecycle: initial ingestion, fixture modification, re-ingestion, and updated snapshots
- Preservation of historical snapshot records and files
- Failure recovery: forced re-ingestion failure preserves previous successful snapshot and status
- Concurrent re-ingestion conflict rejection (409 Conflict)
- Local repository re-ingestion via endpoint
"""

import uuid
from datetime import datetime, timezone
import pytest
from pathlib import Path

from backend.app.core.config import settings
from backend.app.core.exceptions import ConflictError, RepositoryLimitExceededError
from backend.app.models.base import Repository, RepositoryFile, RepositorySnapshot
from backend.app.schemas.repository import RepositoryCreateRequest, RepositorySourceType
from backend.app.services.repository_service import RepositoryService


@pytest.mark.asyncio
async def test_full_repository_lifecycle_and_reingestion(test_db_session, tmp_path, monkeypatch):
    """Exercise complete repository lifecycle: ingest -> modify -> re-ingest -> snapshot history."""
    allowed_root = tmp_path / "lifecycle_roots"
    allowed_root.mkdir()
    fixture = allowed_root / "lifecycle_repo"
    fixture.mkdir()

    monkeypatch.setattr(settings, "LOCAL_REPOSITORY_ROOTS", str(allowed_root))

    # Phase A: Initial Ingestion (3 files)
    (fixture / "main.py").write_text("print('v1')\nprint('code')\n")
    (fixture / "util.py").write_text("def helper(): pass\n")
    (fixture / "README.md").write_text("# Version 1\n")

    service = RepositoryService(test_db_session)
    req1 = RepositoryCreateRequest(
        source_type=RepositorySourceType.LOCAL,
        local_path=str(fixture),
        name="Lifecycle Project",
        default_branch="main",
    )

    res1 = await service.ingest_repository(req1)
    repo_id = res1.id
    snap1_id = res1.latest_snapshot.id

    assert res1.status == "completed"
    assert res1.latest_snapshot.file_count == 3
    assert res1.latest_snapshot.source_file_count == 2
    assert res1.latest_snapshot.total_lines_of_code == 4

    # Verify Snapshot 1 files in DB
    files_snap1 = test_db_session.query(RepositoryFile).filter_by(snapshot_id=snap1_id).all()
    assert len(files_snap1) == 3
    snap1_paths = {f.relative_path for f in files_snap1}
    assert snap1_paths == {"main.py", "util.py", "README.md"}

    # Phase B: Modify Fixture (add feature.py, edit main.py, remove util.py)
    (fixture / "main.py").write_text("print('v2')\nprint('new')\nprint('expanded')\n")
    (fixture / "feature.py").write_text("class Feature:\n    pass\n")
    (fixture / "util.py").unlink()  # Removed!

    # Phase C: Re-ingest
    res2 = await service.reingest_repository(repo_id, local_path=str(fixture))

    assert res2.id == repo_id
    assert res2.status == "completed"
    snap2_id = res2.latest_snapshot.id
    assert snap2_id != snap1_id

    # Verify Snapshot 2 metrics
    assert res2.latest_snapshot.file_count == 3  # main.py, feature.py, README.md
    assert res2.latest_snapshot.source_file_count == 2  # main.py, feature.py

    files_snap2 = test_db_session.query(RepositoryFile).filter_by(snapshot_id=snap2_id).all()
    assert len(files_snap2) == 3
    snap2_paths = {f.relative_path for f in files_snap2}
    assert snap2_paths == {"main.py", "feature.py", "README.md"}
    assert "util.py" not in snap2_paths

    # Phase D: Confirm Snapshot 1 historical files are untouched and preserved!
    files_snap1_recheck = test_db_session.query(RepositoryFile).filter_by(snapshot_id=snap1_id).all()
    assert len(files_snap1_recheck) == 3
    assert {f.relative_path for f in files_snap1_recheck} == {"main.py", "util.py", "README.md"}

    # Total snapshots for repo must be 2
    total_snaps = test_db_session.query(RepositorySnapshot).filter_by(repository_id=repo_id).count()
    assert total_snaps == 2


@pytest.mark.asyncio
async def test_reingestion_failure_recovery_preserves_successful_state(test_db_session, tmp_path, monkeypatch):
    """Forced failure during re-ingestion must preserve the previous successful snapshot and status."""
    allowed_root = tmp_path / "fail_roots"
    allowed_root.mkdir()
    fixture = allowed_root / "stable_repo"
    fixture.mkdir()

    monkeypatch.setattr(settings, "LOCAL_REPOSITORY_ROOTS", str(allowed_root))

    (fixture / "app.py").write_text("print('ok')\n")

    service = RepositoryService(test_db_session)
    res = await service.ingest_repository(
        RepositoryCreateRequest(
            source_type=RepositorySourceType.LOCAL,
            local_path=str(fixture),
            name="Stable Repo",
        )
    )
    repo_id = res.id
    initial_snap_id = res.latest_snapshot.id
    assert res.status == "completed"

    # Force a limit error during re-ingestion by setting max_files = 0
    monkeypatch.setattr(settings, "MAX_REPOSITORY_FILES", 0)

    with pytest.raises(RepositoryLimitExceededError):
        await service.reingest_repository(repo_id, local_path=str(fixture))

    # Repository status must preserve "completed" because a valid prior snapshot exists!
    repo_db = test_db_session.query(Repository).filter_by(id=repo_id).first()
    assert repo_db.status == "completed"
    assert repo_db.error_code == "REPOSITORY_LIMIT_EXCEEDED"

    # Last successful snapshot must remain accessible
    last_successful = service.get_latest_snapshot(repo_id, only_completed=True)
    assert last_successful is not None
    assert last_successful.id == initial_snap_id
    assert last_successful.status == "completed"

    # The failed snapshot must be recorded as "failed"
    failed_snap = (
        test_db_session.query(RepositorySnapshot)
        .filter_by(repository_id=repo_id, status="failed")
        .first()
    )
    assert failed_snap is not None
    assert failed_snap.failure_code == "REPOSITORY_LIMIT_EXCEEDED"


@pytest.mark.asyncio
async def test_concurrent_ingestion_conflict_detection(test_db_session, tmp_path, monkeypatch):
    """Attempting re-ingestion while a job is actively processing raises ConflictError."""
    allowed_root = tmp_path / "conflict_roots"
    allowed_root.mkdir()
    fixture = allowed_root / "conflict_repo"
    fixture.mkdir()
    (fixture / "index.js").write_text("console.log(1);\n")

    monkeypatch.setattr(settings, "LOCAL_REPOSITORY_ROOTS", str(allowed_root))

    service = RepositoryService(test_db_session)
    res = await service.ingest_repository(
        RepositoryCreateRequest(
            source_type=RepositorySourceType.LOCAL,
            local_path=str(fixture),
            name="Conflict Repo",
        )
    )

    # Artificially set repo and active snapshot to 'processing' started 10s ago
    repo_db = test_db_session.query(Repository).filter_by(id=res.id).first()
    repo_db.status = "processing"
    active_snap = (
        test_db_session.query(RepositorySnapshot)
        .filter_by(id=res.latest_snapshot.id)
        .first()
    )
    active_snap.status = "processing"
    active_snap.started_at = datetime.now(timezone.utc)
    test_db_session.commit()

    # Re-ingestion attempt while processing should raise ConflictError
    with pytest.raises(ConflictError, match="already actively processing"):
        await service.ingest_repository(
            RepositoryCreateRequest(
                source_type=RepositorySourceType.LOCAL,
                local_path=str(fixture),
                name="Conflict Repo",
            )
        )
