import pytest
from pathlib import Path

from backend.app.core.config import settings
from backend.app.models.base import Repository, RepositoryFile, RepositorySnapshot
from backend.app.schemas.repository import RepositoryCreateRequest, RepositorySourceType
from backend.app.services.repository_service import RepositoryService


@pytest.mark.asyncio
async def test_end_to_end_fixture_repository_ingestion(test_db_session, tmp_path, monkeypatch):
    """Deterministic End-to-End ingestion test against a real fixture repository.

    Contains:
    - Python source file (main.py)
    - TypeScript source file (client.ts)
    - Markdown documentation (README.md)
    - JSON configuration (settings.json)
    - Ignored directory (node_modules/dep.js)
    - Ignored directory (.git/config)
    - Binary fixture (asset.png)
    """
    # 1. Setup allowed root and fixture directory
    allowed_root = tmp_path / "workspaces"
    allowed_root.mkdir()
    fixture_repo = allowed_root / "e2e-fixture-repo"
    fixture_repo.mkdir()

    monkeypatch.setattr(settings, "LOCAL_REPOSITORY_ROOTS", str(allowed_root))

    # 2. Populate fixture files
    # Python source
    (fixture_repo / "main.py").write_text("def run():\n    return 'Hello CodeSentinel'\n\nif __name__ == '__main__':\n    run()\n")

    # TypeScript source
    (fixture_repo / "client.ts").write_text("export interface User {\n  id: string;\n  name: string;\n}\n")

    # Markdown doc
    (fixture_repo / "README.md").write_text("# E2E Fixture Repository\nDeterministic test suite fixture.\n")

    # JSON config
    (fixture_repo / "settings.json").write_text('{\n  "mode": "deterministic",\n  "version": 1\n}\n')

    # Binary fixture
    (fixture_repo / "asset.png").write_bytes(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01")

    # Ignored directories
    node_modules = fixture_repo / "node_modules"
    node_modules.mkdir()
    (node_modules / "dep.js").write_text("module.exports = {};\n")

    git_dir = fixture_repo / ".git"
    git_dir.mkdir()
    (git_dir / "config").write_text("[core]\n")

    # 3. Execute real ingestion using RepositoryService
    service = RepositoryService(test_db_session)
    request = RepositoryCreateRequest(
        source_type=RepositorySourceType.LOCAL,
        local_path=str(fixture_repo),
        name="E2E Fixture Repo",
        default_branch="main",
    )

    repo_response = await service.ingest_repository(request)

    # 4. Verify Repository record
    assert repo_response.name == "E2E Fixture Repo"
    assert repo_response.source_type == "local"
    assert repo_response.status == "completed"
    assert repo_response.error_code is None
    assert repo_response.last_ingested_at is not None

    # Check database direct entity
    repo_db = test_db_session.query(Repository).filter_by(id=repo_response.id).first()
    assert repo_db is not None
    assert repo_db.status == "completed"

    # 5. Verify Snapshot record & metrics
    snapshot_response = repo_response.latest_snapshot
    assert snapshot_response is not None
    assert snapshot_response.status == "completed"
    assert snapshot_response.file_count == 5  # main.py, client.ts, README.md, settings.json, asset.png
    assert snapshot_response.source_file_count == 2  # main.py, client.ts

    # Verify node_modules and .git were completely excluded!
    snapshot_db = test_db_session.query(RepositorySnapshot).filter_by(id=snapshot_response.id).first()
    assert snapshot_db is not None

    files_db = test_db_session.query(RepositoryFile).filter_by(snapshot_id=snapshot_db.id).all()
    assert len(files_db) == 5

    persisted_paths = {f.relative_path for f in files_db}
    assert "main.py" in persisted_paths
    assert "client.ts" in persisted_paths
    assert "README.md" in persisted_paths
    assert "settings.json" in persisted_paths
    assert "asset.png" in persisted_paths

    assert not any("node_modules" in p for p in persisted_paths)
    assert not any(".git" in p for p in persisted_paths)

    # 6. Verify language detection and categories
    file_map = {f.relative_path: f for f in files_db}
    assert file_map["main.py"].language == "Python"
    assert file_map["main.py"].is_source_file is True
    assert file_map["main.py"].is_binary is False
    assert file_map["main.py"].line_count == 5

    assert file_map["client.ts"].language == "TypeScript"
    assert file_map["client.ts"].is_source_file is True
    assert file_map["client.ts"].is_binary is False

    assert file_map["README.md"].language == "Markdown"
    assert file_map["README.md"].category == "documentation"
    assert file_map["README.md"].is_source_file is False

    assert file_map["settings.json"].language == "JSON"
    assert file_map["settings.json"].category == "configuration"
    assert file_map["settings.json"].is_source_file is False

    assert file_map["asset.png"].is_binary is True
    assert file_map["asset.png"].line_count is None

    # 7. Verify Language distribution
    lang_dist = snapshot_response.language_distribution
    assert "Python" in lang_dist
    assert "TypeScript" in lang_dist
    assert "Markdown" in lang_dist
    assert "JSON" in lang_dist
    assert "PNG Image" in lang_dist
