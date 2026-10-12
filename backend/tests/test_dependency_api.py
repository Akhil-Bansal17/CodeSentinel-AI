"""End-to-end API integration tests for Phase 3 Dependency Intelligence & SCA."""

import pytest
from backend.app.core.config import settings


def test_dependency_analysis_api_workflow(test_client_with_db, tmp_path, monkeypatch):
    """Test full dependency analysis workflow: ingest, trigger SCA, query inventory, filter vulnerabilities."""
    allowed_root = tmp_path / "dep_repos"
    allowed_root.mkdir()
    repo_dir = allowed_root / "multi-ecosystem-app"
    repo_dir.mkdir()

    # 1. Create Python requirements.txt with vulnerable requests 2.28.1 (< 2.31.0) and safe pytest
    (repo_dir / "requirements.txt").write_text(
        "requests==2.28.1\n"
        "pytest==8.1.1\n",
        encoding="utf-8",
    )

    # 2. Create package.json and package-lock.json with vulnerable lodash 4.17.20 (< 4.17.21)
    (repo_dir / "package.json").write_text(
        """{
            "name": "demo-node-app",
            "version": "1.0.0",
            "dependencies": {
                "lodash": "^4.17.20"
            }
        }""",
        encoding="utf-8",
    )

    (repo_dir / "package-lock.json").write_text(
        """{
            "name": "demo-node-app",
            "version": "1.0.0",
            "lockfileVersion": 3,
            "packages": {
                "": {
                    "dependencies": {
                        "lodash": "^4.17.20"
                    }
                },
                "node_modules/lodash": {
                    "version": "4.17.20",
                    "resolved": "https://registry.npmjs.org/lodash/-/lodash-4.17.20.tgz"
                }
            }
        }""",
        encoding="utf-8",
    )

    monkeypatch.setattr(settings, "LOCAL_REPOSITORY_ROOTS", str(allowed_root))

    # Ingest repository
    repo_res = test_client_with_db.post(
        "/api/v1/repositories",
        json={
            "source_type": "local",
            "local_path": str(repo_dir),
            "name": "Multi Ecosystem Test",
        },
    )
    assert repo_res.status_code == 201
    repo_data = repo_res.json()
    repo_id = repo_data["id"]
    snapshot_id = repo_data["latest_snapshot"]["id"]

    # 3. Trigger dependency analysis
    dep_run_res = test_client_with_db.post(
        f"/api/v1/repositories/{repo_id}/dependency-analyses",
        json={"snapshot_id": snapshot_id},
    )
    assert dep_run_res.status_code == 201, dep_run_res.text
    run_data = dep_run_res.json()
    run_id = run_data["id"]

    assert run_data["status"] == "completed"
    assert run_data["dependencies_discovered"] >= 3
    assert run_data["dependencies_resolved"] >= 3
    assert run_data["vulnerabilities_count"] >= 2  # requests and lodash

    # 4. List dependency runs
    list_runs_res = test_client_with_db.get(f"/api/v1/repositories/{repo_id}/dependency-analyses")
    assert list_runs_res.status_code == 200
    runs_list = list_runs_res.json()
    assert runs_list["total"] >= 1
    assert runs_list["items"][0]["id"] == run_id

    # 5. Retrieve dependencies inventory
    deps_res = test_client_with_db.get(f"/api/v1/dependency-analyses/{run_id}/dependencies")
    assert deps_res.status_code == 200
    deps_data = deps_res.json()
    assert deps_data["total"] >= 3

    # Check ecosystem filter
    pypi_deps = test_client_with_db.get(f"/api/v1/dependency-analyses/{run_id}/dependencies?ecosystem=pypi").json()
    assert any(d["package_name"] == "requests" for d in pypi_deps["items"])
    assert all(d["ecosystem"] == "pypi" for d in pypi_deps["items"])

    npm_deps = test_client_with_db.get(f"/api/v1/dependency-analyses/{run_id}/dependencies?ecosystem=npm").json()
    assert any(d["package_name"] == "lodash" for d in npm_deps["items"])

    # 6. Retrieve vulnerability findings
    vulns_res = test_client_with_db.get(f"/api/v1/dependency-analyses/{run_id}/vulnerabilities")
    assert vulns_res.status_code == 200
    vulns_data = vulns_res.json()
    assert vulns_data["total"] >= 2

    # Check that both requests and lodash are identified with evidence and remediation
    vuln_pkgs = {v["package_name"]: v for v in vulns_data["items"]}
    assert "requests" in vuln_pkgs
    assert vuln_pkgs["requests"]["severity"] in ("CRITICAL", "HIGH", "MEDIUM", "LOW")
    assert vuln_pkgs["requests"]["remediation_version"] == "2.31.0"
    assert vuln_pkgs["requests"]["resolved_version"] == "2.28.1"
    assert "CVE-2023-32681" in vuln_pkgs["requests"]["cve_ids"]

    assert "lodash" in vuln_pkgs
    assert vuln_pkgs["lodash"]["remediation_version"] == "4.17.21"
    assert vuln_pkgs["lodash"]["resolved_version"] == "4.17.20"
    assert "CVE-2020-8203" in vuln_pkgs["lodash"]["cve_ids"]

    # Filter vulnerabilities by severity
    high_vulns = test_client_with_db.get(f"/api/v1/dependency-analyses/{run_id}/vulnerabilities?severity=HIGH").json()
    assert all(v["severity"] == "HIGH" for v in high_vulns["items"])


def test_dependency_api_advisory_status(test_client_with_db):
    """Verify GET /api/v1/advisories/status returns active dataset provenance."""
    res = test_client_with_db.get("/api/v1/advisories/status")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ("POPULATED", "EMPTY_VALID")
    assert data["dataset_version"] is not None
    assert data["records_count"] > 0


def test_dependency_api_invalid_repository_404(test_client_with_db):
    """Verify attempting to analyze non-existent repository returns 404."""
    res = test_client_with_db.post("/api/v1/repositories/non-existent-uuid/dependency-analyses")
    assert res.status_code == 404
