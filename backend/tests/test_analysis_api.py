"""End-to-end API integration tests for Phase 2 Static Analysis endpoints."""

import pytest
from pathlib import Path

from backend.app.core.config import settings


def test_analysis_api_workflow(test_client_with_db, tmp_path, monkeypatch):
    """Test full analysis API flow: ingest repository, trigger analysis, list runs, get findings."""
    allowed_root = tmp_path / "analysis_repos"
    allowed_root.mkdir()
    repo_dir = allowed_root / "python-project"
    repo_dir.mkdir()

    # Create sample Python file with deterministic issues
    (repo_dir / "calculator.py").write_text(
        "import math\n"
        "import math\n"  # Duplicate import -> PY-IMPORT-001
        "\n"
        "def compute(a, b, c, d):\n"
        "    if a:\n"
        "        if b:\n"
        "            if c:\n"
        "                if d:\n"
        "                    return 42\n"
        "    return 0\n",
        encoding="utf-8",
    )

    monkeypatch.setattr(settings, "LOCAL_REPOSITORY_ROOTS", str(allowed_root))

    # 1. Ingest repository
    repo_res = test_client_with_db.post(
        "/api/v1/repositories",
        json={
            "source_type": "local",
            "local_path": str(repo_dir),
            "name": "Analysis Test Project",
        },
    )
    assert repo_res.status_code == 201
    repo_data = repo_res.json()
    repo_id = repo_data["id"]
    snapshot_id = repo_data["latest_snapshot"]["id"]

    # 2. Trigger analysis via POST /api/v1/repositories/{id}/analyses
    analysis_res = test_client_with_db.post(
        f"/api/v1/repositories/{repo_id}/analyses",
        json={
            "snapshot_id": snapshot_id,
            "config": {"complexity_threshold": 3},
        },
    )
    assert analysis_res.status_code == 201, analysis_res.text
    run_data = analysis_res.json()
    analysis_id = run_data["id"]

    assert run_data["repository_id"] == repo_id
    assert run_data["snapshot_id"] == snapshot_id
    assert run_data["status"] == "completed"
    assert run_data["files_analyzed"] == 1
    assert run_data["findings_count"] >= 2

    # 3. List analyses via GET /api/v1/repositories/{id}/analyses
    list_runs_res = test_client_with_db.get(f"/api/v1/repositories/{repo_id}/analyses")
    assert list_runs_res.status_code == 200
    list_runs_data = list_runs_res.json()
    assert list_runs_data["total"] >= 1
    assert any(r["id"] == analysis_id for r in list_runs_data["items"])

    # 4. Get run details via GET /api/v1/analyses/{id}
    run_detail_res = test_client_with_db.get(f"/api/v1/analyses/{analysis_id}")
    assert run_detail_res.status_code == 200
    assert run_detail_res.json()["id"] == analysis_id
    assert "severity_distribution" in run_detail_res.json()["summary_json"]

    # 5. List findings via GET /api/v1/analyses/{id}/findings
    findings_res = test_client_with_db.get(f"/api/v1/analyses/{analysis_id}/findings")
    assert findings_res.status_code == 200
    findings_data = findings_res.json()
    assert findings_data["total"] >= 2
    rule_ids = [f["rule_id"] for f in findings_data["items"]]
    assert "PY-IMPORT-001" in rule_ids
    assert "PY-COMPLEXITY-001" in rule_ids

    # 6. Filter findings by category
    filter_res = test_client_with_db.get(
        f"/api/v1/analyses/{analysis_id}/findings?category=CODE_SMELL"
    )
    assert filter_res.status_code == 200
    assert filter_res.json()["total"] == 1
    assert filter_res.json()["items"][0]["rule_id"] == "PY-IMPORT-001"

    # 7. Filter findings by file path
    path_filter_res = test_client_with_db.get(
        f"/api/v1/analyses/{analysis_id}/findings?file_path=calculator"
    )
    assert path_filter_res.status_code == 200
    assert path_filter_res.json()["total"] >= 2


def test_analysis_api_invalid_repository_404(test_client_with_db):
    """Verify triggering analysis for non-existent repository returns 404."""
    res = test_client_with_db.post("/api/v1/repositories/non-existent-uuid/analyses")
    assert res.status_code == 404
    assert res.json()["error"]["code"] == "NOT_FOUND"


def test_analysis_api_invalid_snapshot_belonging_to_another_repo(test_client_with_db, tmp_path, monkeypatch):
    """Verify rejecting snapshot that does not belong to the requested repository."""
    allowed_root = tmp_path / "repos"
    allowed_root.mkdir()
    r1_dir = allowed_root / "r1"
    r1_dir.mkdir()
    (r1_dir / "index.py").write_text("print(1)\n")

    r2_dir = allowed_root / "r2"
    r2_dir.mkdir()
    (r2_dir / "index.py").write_text("print(2)\n")

    monkeypatch.setattr(settings, "LOCAL_REPOSITORY_ROOTS", str(allowed_root))

    # Ingest repo 1
    r1_res = test_client_with_db.post("/api/v1/repositories", json={"source_type": "local", "local_path": str(r1_dir), "name": "Repo 1"})
    r1_id = r1_res.json()["id"]

    # Ingest repo 2
    r2_res = test_client_with_db.post("/api/v1/repositories", json={"source_type": "local", "local_path": str(r2_dir), "name": "Repo 2"})
    r2_id = r2_res.json()["id"]
    r2_snap_id = r2_res.json()["latest_snapshot"]["id"]

    # Try to analyze repo 1 with repo 2's snapshot!
    cross_res = test_client_with_db.post(
        f"/api/v1/repositories/{r1_id}/analyses",
        json={"snapshot_id": r2_snap_id},
    )
    # Must be rejected (404 Snapshot not found in this repo)
    assert cross_res.status_code == 404
