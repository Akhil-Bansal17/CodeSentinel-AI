"""Tests for static analysis execution, persistence, and lifecycle management."""

from datetime import datetime, timezone
from pathlib import Path
import tempfile
import uuid
import pytest
from sqlalchemy import select

from backend.app.core.database import engine, get_db
from backend.app.models.base import Base
from backend.app.core.exceptions import ConflictError, ValidationError
from backend.app.models.base import (
    AnalysisFinding,
    AnalysisRun,
    Repository,
    RepositoryFile,
    RepositorySnapshot,
)
from backend.app.services.analysis.analysis_service import AnalysisService


@pytest.fixture
def test_db_session(tmp_path):
    """Provide a fresh SQLite test session for lifecycle tests."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    db_file = tmp_path / "lifecycle_test.db"
    test_engine = create_engine(f"sqlite:///{db_file}")
    Base.metadata.create_all(bind=test_engine)
    TestingSession = sessionmaker(bind=test_engine)
    session = TestingSession()

    try:
        yield session
    finally:
        session.close()


@pytest.mark.asyncio
async def test_analysis_lifecycle_end_to_end(test_db_session, monkeypatch, tmp_path):
    """Verify end-to-end static analysis run execution, findings persistence, and filtering."""
    # 1. Setup local fixture directory
    fixtures_dir = tmp_path / "repo_src"
    fixtures_dir.mkdir()
    py_file = fixtures_dir / "calculator.py"
    py_file.write_text(
        "import os\n"
        "import os\n"  # Duplicate import -> PY-IMPORT-001
        "\n"
        "def compute_score(x, y, z):\n"
        "    if x:\n"
        "        if y:\n"
        "            if z:\n"
        "                return 100\n"
        "    return 0\n",
        encoding="utf-8",
    )

    from backend.app.core.config import settings
    monkeypatch.setattr(settings, "LOCAL_REPOSITORY_ROOTS", [str(tmp_path)])

    now = datetime.now(timezone.utc)
    repo = Repository(
        id=str(uuid.uuid4()),
        name="test-analysis-repo",
        source_type="local",
        source_identifier=f"local:{fixtures_dir}",
        status="completed",
        created_at=now,
        updated_at=now,
    )
    test_db_session.add(repo)

    snapshot = RepositorySnapshot(
        id=str(uuid.uuid4()),
        repository_id=repo.id,
        status="completed",
        started_at=now,
        completed_at=now,
        file_count=1,
        source_file_count=1,
        total_lines_of_code=10,
        metrics_json={},
        language_distribution={"Python": {"file_count": 1, "percentage": 100.0}},
        created_at=now,
        updated_at=now,
    )
    test_db_session.add(snapshot)

    repo_file = RepositoryFile(
        id=str(uuid.uuid4()),
        snapshot_id=snapshot.id,
        relative_path="calculator.py",
        file_name="calculator.py",
        extension=".py",
        language="Python",
        category="source",
        size_bytes=py_file.stat().st_size,
        is_source_file=True,
        is_binary=False,
        line_count=10,
        sha256="dummy_hash",
        created_at=now,
        updated_at=now,
    )
    test_db_session.add(repo_file)
    test_db_session.commit()

    # 2. Run analysis with complexity threshold = 2
    service = AnalysisService(test_db_session)
    run = await service.execute_analysis_run(
        repository_id=repo.id,
        snapshot_id=snapshot.id,
        config={"complexity_threshold": 2},
    )

    # 3. Verify AnalysisRun fields
    assert run.status == "completed"
    assert run.files_discovered == 1
    assert run.files_analyzed == 1
    assert run.findings_count >= 2  # Duplicate import + Complexity >= 4

    # 4. Verify findings query & filtering
    findings, total = service.list_analysis_findings(run.id)
    assert total >= 2
    assert len(findings) == total

    # Filter by category
    import_findings, import_total = service.list_analysis_findings(run.id, category="CODE_SMELL")
    assert import_total == 1
    assert import_findings[0].rule_id == "PY-IMPORT-001"

    # Filter by rule_id
    comp_findings, comp_total = service.list_analysis_findings(run.id, rule_id="PY-COMPLEXITY-001")
    assert comp_total == 1
    assert comp_findings[0].rule_id == "PY-COMPLEXITY-001"

    # 5. Verify CASCADE deletion
    test_db_session.delete(repo)
    test_db_session.commit()

    assert test_db_session.scalar(select(AnalysisRun).where(AnalysisRun.id == run.id)) is None
    assert test_db_session.scalar(select(AnalysisFinding).where(AnalysisFinding.analysis_run_id == run.id)) is None


@pytest.mark.asyncio
async def test_analysis_rejects_non_completed_snapshot(test_db_session):
    """Verify analysis fails safely if snapshot is still processing or failed."""
    now = datetime.now(timezone.utc)
    repo = Repository(
        id=str(uuid.uuid4()),
        name="incomplete-repo",
        source_type="local",
        source_identifier="local:dummy",
        status="processing",
        created_at=now,
        updated_at=now,
    )
    snapshot = RepositorySnapshot(
        id=str(uuid.uuid4()),
        repository_id=repo.id,
        status="processing",
        started_at=now,
        created_at=now,
        updated_at=now,
    )
    test_db_session.add(repo)
    test_db_session.add(snapshot)
    test_db_session.commit()

    service = AnalysisService(test_db_session)
    with pytest.raises(ValidationError):
        await service.execute_analysis_run(repository_id=repo.id, snapshot_id=snapshot.id)
