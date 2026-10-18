"""API integration tests for Phase 8 CI/CD Workflow Generation, Audits, and PR Synthesis."""

import hashlib
import hmac
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.models.base import (
    AnalysisFinding,
    AnalysisRun,
    AuditRun,
    RemediationProposal,
    Repository,
    RepositorySnapshot,
)


@pytest.fixture
def cicd_seed(test_db_session: Session):
    """Seed repository, snapshot, analysis, and validated proposal."""
    repo = Repository(id="repo-cicd-api", name="CiCdApiRepo", source_type="local")
    test_db_session.add(repo)

    snap = RepositorySnapshot(
        id="snap-cicd-api",
        repository_id="repo-cicd-api",
        status="completed",
        file_count=20,
        source_file_count=15,
    )
    test_db_session.add(snap)

    analysis = AnalysisRun(
        id="analysis-cicd-1",
        repository_id="repo-cicd-api",
        snapshot_id="snap-cicd-api",
        status="completed",
        findings_count=1,
    )
    test_db_session.add(analysis)

    finding = AnalysisFinding(
        id="finding-cicd-1",
        analysis_run_id="analysis-cicd-1",
        repository_id="repo-cicd-api",
        snapshot_id="snap-cicd-api",
        rule_id="PYSEC001",
        rule_name="Dynamic Code Evaluation",
        title="Dynamic Code Evaluation",
        description="Dynamic Code Evaluation in main",
        category="SECURITY",
        severity="HIGH",
        confidence="HIGH",
        file_path="src/main.py",
        start_line=10,
        start_column=5,
        end_line=10,
        end_column=25,
        evidence_summary="eval() detected",
        fingerprint="fp-cicd-1",
    )
    test_db_session.add(finding)

    prop = RemediationProposal(
        id="prop-cicd-1",
        repository_id="repo-cicd-api",
        snapshot_id="snap-cicd-api",
        remediation_rule_id="FIX-PYSEC001-LITERAL-EVAL",
        file_path="src/main.py",
        original_content_hash="hash1",
        target_content_hash="hash2",
        start_line=10,
        end_line=10,
        original_code_snippet="eval(val)",
        proposed_code_snippet="ast.literal_eval(val)",
        unified_diff="--- a/src/main.py\n+++ b/src/main.py\n@@ -10,1 +10,1 @@\n-eval(val)\n+ast.literal_eval(val)",
        rationale="Safe AST replacement",
        risk_level="LOW",
        confidence="HIGH",
        status="APPROVED",
    )
    test_db_session.add(prop)
    test_db_session.commit()

    return {"repo_id": repo.id, "snapshot_id": snap.id, "prop_id": prop.id}


def test_api_workflow_generation(test_client_with_db, cicd_seed):
    payload = {
        "repository_id": cicd_seed["repo_id"],
        "ecosystem": "python",
        "include_lint": True,
        "include_test": True,
        "include_security_audit": True,
        "workflow_name": "API Test Workflow",
    }
    resp = test_client_with_db.post("/api/v1/cicd/workflows/generate", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["ecosystem_detected"] == "python"
    assert "name: 'API Test Workflow'" in data["yaml_content"]
    assert "actions/checkout@" in data["yaml_content"]
    assert data["permissions_summary"] == {"contents": "read"}


def test_api_workflow_generation_injection_blocked(test_client_with_db, cicd_seed):
    payload = {
        "repository_id": cicd_seed["repo_id"],
        "workflow_name": "Bad; rm -rf /",
    }
    resp = test_client_with_db.post("/api/v1/cicd/workflows/generate", json=payload)
    assert resp.status_code == 400
    assert "Unsafe characters detected" in resp.json()["detail"]


def test_api_audit_run_and_download(test_client_with_db, cicd_seed):
    # 1. Run audit
    run_resp = test_client_with_db.post(
        "/api/v1/cicd/audits/run",
        json={"repository_id": cicd_seed["repo_id"], "snapshot_id": cicd_seed["snapshot_id"]},
    )
    assert run_resp.status_code == 200
    audit_data = run_resp.json()
    audit_id = audit_data["id"]
    assert audit_data["status"] == "COMPLETED"
    assert len(audit_data["checks"]) == 6
    assert audit_data["summary"]["total_checks"] == 6

    # 2. List audits
    list_resp = test_client_with_db.get(f"/api/v1/cicd/audits?repository_id={cicd_seed['repo_id']}")
    assert list_resp.status_code == 200
    assert list_resp.json()["total"] >= 1

    # 3. Get single audit
    get_resp = test_client_with_db.get(f"/api/v1/cicd/audits/{audit_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == audit_id

    # 4. Download SARIF
    sarif_resp = test_client_with_db.get(f"/api/v1/cicd/audits/{audit_id}/sarif")
    assert sarif_resp.status_code == 200
    sarif = sarif_resp.json()
    assert sarif["version"] == "2.1.0"
    assert len(sarif["runs"]) == 1

    # 5. Download Markdown
    md_resp = test_client_with_db.get(f"/api/v1/cicd/audits/{audit_id}/markdown")
    assert md_resp.status_code == 200
    assert md_resp.headers["content-type"].startswith("text/markdown")
    assert "# CodeSentinel AI Audit Report" in md_resp.text


def test_api_ci_ingestion(test_client_with_db, cicd_seed):
    payload = {
        "repository_id": cicd_seed["repo_id"],
        "idempotency_key": "api-ci-key-101",
        "ci_provider": "github_actions",
        "commit_sha": "1234567890abcdef",
        "branch": "main",
        "status": "SUCCESS",
        "payload": {"tests": 12, "passed": 12},
    }
    resp = test_client_with_db.post("/api/v1/cicd/ingest", json=payload)
    assert resp.status_code == 200
    assert resp.json()["status"] == "SUCCESS"
    assert resp.json()["is_duplicate"] is False

    # Second request with same idempotency_key
    dup_resp = test_client_with_db.post("/api/v1/cicd/ingest", json=payload)
    assert dup_resp.status_code == 200
    assert dup_resp.json()["is_duplicate"] is True


def test_api_pr_preparation_and_patch_download(test_client_with_db, cicd_seed):
    prep_payload = {
        "repository_id": cicd_seed["repo_id"],
        "snapshot_id": cicd_seed["snapshot_id"],
        "proposal_ids": [cicd_seed["prop_id"]],
        "custom_title": "fix: patch dynamic eval in main",
    }
    resp = test_client_with_db.post("/api/v1/cicd/pr/prepare", json=prep_payload)
    assert resp.status_code == 200
    pr_data = resp.json()
    pr_id = pr_data["id"]
    assert pr_data["status"] == "PREPARED"
    assert pr_data["has_conflicts"] is False
    assert pr_data["title"] == "fix: patch dynamic eval in main"
    assert "ast.literal_eval" in pr_data["combined_diff"]

    # Retrieve PR record
    get_resp = test_client_with_db.get(f"/api/v1/cicd/pr/{pr_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == pr_id

    # Download patch
    patch_resp = test_client_with_db.get(f"/api/v1/cicd/pr/{pr_id}/patch")
    assert patch_resp.status_code == 200
    assert patch_resp.headers["content-type"].startswith("text/x-patch")
    assert "[PATCH]" in patch_resp.text
    assert "--- a/src/main.py" in patch_resp.text
