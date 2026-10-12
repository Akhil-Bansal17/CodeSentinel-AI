"""Security regression and untrusted input tests for Phase 3 Dependency Intelligence."""

import pytest
from backend.app.core.config import settings
from backend.app.services.dependencies.parsers.package_json_parser import MAX_PACKAGE_JSON_BYTES, PackageJsonParser
from backend.app.services.dependencies.parsers.requirements_parser import MAX_REQUIREMENTS_BYTES, RequirementsTxtParser


def test_manifest_path_traversal_blocked(tmp_path):
    """Verify that path traversal in requirements -r cannot escape or leak host files."""
    parser = RequirementsTxtParser()
    content = "-r ../../../../../etc/shadow\n-r ..\\..\\..\\windows\\system.ini\n"
    # Even if relative references attempt to escape, parser isolates to internal map
    files_map = {}
    res = parser.parse("requirements.txt", content, all_files_content=files_map)
    # Target file is not read from host OS disk; marked as unresolved inclusion
    assert all(d.status == "unresolved_inclusion" for d in res.dependencies)


def test_oversized_manifest_rejected_safely():
    """Verify oversized manifest files are aborted without resource exhaustion."""
    parser = PackageJsonParser()
    large_content = '{"dependencies": {' + ",".join(f'"pkg-{i}": "1.0.0"' for i in range(100000)) + "}}"
    if len(large_content.encode("utf-8")) > MAX_PACKAGE_JSON_BYTES:
        res = parser.parse("package.json", large_content)
        assert res.status == "error"
        assert "exceeds" in res.errors[0]


def test_cross_repository_snapshot_mismatch(test_client_with_db, tmp_path, monkeypatch):
    """Verify a snapshot belonging to Repository A cannot be analyzed under Repository B."""
    allowed_root = tmp_path / "repos"
    allowed_root.mkdir()

    repo1_dir = allowed_root / "repo-1"
    repo1_dir.mkdir()
    (repo1_dir / "requirements.txt").write_text("requests==2.31.0\n")

    repo2_dir = allowed_root / "repo-2"
    repo2_dir.mkdir()
    (repo2_dir / "requirements.txt").write_text("flask==2.2.5\n")

    monkeypatch.setattr(settings, "LOCAL_REPOSITORY_ROOTS", str(allowed_root))

    r1 = test_client_with_db.post("/api/v1/repositories", json={"source_type": "local", "local_path": str(repo1_dir), "name": "Repo 1"}).json()
    r2 = test_client_with_db.post("/api/v1/repositories", json={"source_type": "local", "local_path": str(repo2_dir), "name": "Repo 2"}).json()

    repo1_id = r1["id"]
    repo2_id = r2["id"]
    snapshot1_id = r1["latest_snapshot"]["id"]

    # Attempt to trigger dependency analysis on repo 2 with snapshot 1
    mismatch_res = test_client_with_db.post(
        f"/api/v1/repositories/{repo2_id}/dependency-analyses",
        json={"snapshot_id": snapshot1_id},
    )
    assert mismatch_res.status_code == 404
