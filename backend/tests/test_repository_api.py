import pytest
from pathlib import Path

from backend.app.core.config import settings


def test_create_and_ingest_local_repository_api(test_client_with_db, tmp_path, monkeypatch):
    """End-to-end API test: create & ingest local repository within allowed root."""
    allowed_root = tmp_path / "allowed_repos"
    allowed_root.mkdir()
    repo_dir = allowed_root / "sample-project"
    repo_dir.mkdir()

    # Create test repository content
    (repo_dir / "main.py").write_text("print('CodeSentinel AI')\n")
    (repo_dir / "config.json").write_text('{"version": "1.0"}\n')
    (repo_dir / "README.md").write_text("# Sample Project\n")

    monkeypatch.setattr(settings, "LOCAL_REPOSITORY_ROOTS", str(allowed_root))

    # 1. Ingest via API
    payload = {
        "source_type": "local",
        "local_path": str(repo_dir),
        "name": "Sample Test Project",
    }
    response = test_client_with_db.post("/api/v1/repositories", json=payload)
    assert response.status_code == 201, response.text
    data = response.json()

    assert data["name"] == "Sample Test Project"
    assert data["source_type"] == "local"
    assert data["status"] == "completed"
    repo_id = data["id"]

    latest_snap = data["latest_snapshot"]
    assert latest_snap is not None
    assert latest_snap["status"] == "completed"
    assert latest_snap["file_count"] == 3
    assert latest_snap["source_file_count"] == 1  # only main.py
    snap_id = latest_snap["id"]

    # 2. List repositories
    list_res = test_client_with_db.get("/api/v1/repositories")
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert list_data["total"] >= 1
    assert any(r["id"] == repo_id for r in list_data["items"])

    # 3. Get repository details
    detail_res = test_client_with_db.get(f"/api/v1/repositories/{repo_id}")
    assert detail_res.status_code == 200
    assert detail_res.json()["id"] == repo_id

    # 4. List repository files
    files_res = test_client_with_db.get(f"/api/v1/repositories/{repo_id}/files")
    assert files_res.status_code == 200
    files_data = files_res.json()
    assert files_data["total"] == 3
    file_paths = [f["relative_path"] for f in files_data["items"]]
    assert "main.py" in file_paths
    assert "config.json" in file_paths
    assert "README.md" in file_paths

    # 5. Filter files by language
    py_files_res = test_client_with_db.get(f"/api/v1/repositories/{repo_id}/files?language=Python")
    assert py_files_res.status_code == 200
    assert py_files_res.json()["total"] == 1
    assert py_files_res.json()["items"][0]["file_name"] == "main.py"

    # 6. Get snapshot details
    snap_res = test_client_with_db.get(f"/api/v1/repositories/{repo_id}/snapshots/{snap_id}")
    assert snap_res.status_code == 200
    assert snap_res.json()["id"] == snap_id
    assert snap_res.json()["file_count"] == 3

    # 7. Delete repository
    del_res = test_client_with_db.delete(f"/api/v1/repositories/{repo_id}")
    assert del_res.status_code == 204

    # Verify repository is gone from DB
    get_after_del = test_client_with_db.get(f"/api/v1/repositories/{repo_id}")
    assert get_after_del.status_code == 404

    # Verify local filesystem was NOT deleted!
    assert repo_dir.exists()
    assert (repo_dir / "main.py").exists()


def test_reject_local_path_outside_allowed_roots_api(test_client_with_db, tmp_path, monkeypatch):
    """Reject repository creation for local paths outside allowed roots."""
    allowed_root = tmp_path / "allowed"
    allowed_root.mkdir()
    outside_dir = tmp_path / "disallowed_folder"
    outside_dir.mkdir()

    monkeypatch.setattr(settings, "LOCAL_REPOSITORY_ROOTS", str(allowed_root))

    payload = {
        "source_type": "local",
        "local_path": str(outside_dir),
    }
    response = test_client_with_db.post("/api/v1/repositories", json=payload)
    assert response.status_code == 400
    assert "SECURITY_VIOLATION" in response.text or "outside allowed" in response.text


def test_reject_invalid_github_url_api(test_client_with_db):
    """Reject repository creation for invalid or malicious GitHub URL."""
    payload = {
        "source_type": "github",
        "source_url": "http://insecure-host.com/repo",
    }
    response = test_client_with_db.post("/api/v1/repositories", json=payload)
    assert response.status_code == 400


def test_repository_not_found_404(test_client_with_db):
    """Verify non-existent repository returns safe 404."""
    response = test_client_with_db.get("/api/v1/repositories/non-existent-uuid-123")
    assert response.status_code == 404
    data = response.json()
    assert data["error"]["code"] == "NOT_FOUND"
