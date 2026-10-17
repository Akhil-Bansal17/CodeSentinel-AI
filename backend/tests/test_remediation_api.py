"""Integration tests for Phase 7 Remediation API Endpoints and Database Lifecycle."""

import os
import tempfile
import uuid
from datetime import datetime, timezone
import pytest
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.models.base import (
    AnalysisFinding,
    AnalysisRun,
    RemediationAudit,
    RemediationProposal,
    Repository,
    RepositoryFile,
    RepositorySnapshot,
)
from backend.app.services.remediation.patch_engine import compute_content_hash


@pytest.fixture
def remediation_fixture(test_db_session: Session):
    """Fixture providing a complete local repository, snapshot, file, and finding."""
    # Create temp directory inside an allowed root
    temp_dir = tempfile.mkdtemp(prefix="csai_test_repo_")
    test_file = os.path.join(temp_dir, "app.py")
    source_code = (
        "import ast\n"
        "\n"
        "def run_eval(user_data):\n"
        "    return eval(user_data)\n"
    )
    with open(test_file, "w", encoding="utf-8") as f:
        f.write(source_code)

    # Configure LOCAL_REPOSITORY_ROOTS to include temp_dir parent
    parent_dir = os.path.dirname(temp_dir)
    orig_roots = settings.LOCAL_REPOSITORY_ROOTS
    settings.LOCAL_REPOSITORY_ROOTS = [parent_dir]

    repo = Repository(
        id=str(uuid.uuid4()),
        name="Test Remediation Repo",
        source_type="local",
        source_identifier=f"local:{temp_dir}",
        source_url=temp_dir,
        status="ready",
    )
    test_db_session.add(repo)
    test_db_session.flush()

    snap = RepositorySnapshot(
        id=str(uuid.uuid4()),
        repository_id=repo.id,
        status="completed",
        file_count=1,
        source_file_count=1,
    )
    test_db_session.add(snap)
    test_db_session.flush()

    repo_file = RepositoryFile(
        id=str(uuid.uuid4()),
        snapshot_id=snap.id,
        relative_path="app.py",
        file_name="app.py",
        extension=".py",
        language="Python",
        size_bytes=len(source_code.encode("utf-8")),
        line_count=4,
        is_source_file=True,
        is_binary=False,
    )
    test_db_session.add(repo_file)
    test_db_session.flush()

    analysis_run = AnalysisRun(
        id=str(uuid.uuid4()),
        repository_id=repo.id,
        snapshot_id=snap.id,
        status="completed",
    )
    test_db_session.add(analysis_run)
    test_db_session.flush()

    finding = AnalysisFinding(
        id=str(uuid.uuid4()),
        analysis_run_id=analysis_run.id,
        repository_id=repo.id,
        snapshot_id=snap.id,
        rule_id="PYSEC001",
        rule_name="Dynamic Code Execution",
        title="Unsafe eval usage",
        description="Detected call to eval()",
        severity="HIGH",
        confidence="HIGH",
        category="security",
        file_path="app.py",
        start_line=4,
        end_line=4,
        evidence_summary="return eval(user_data)",
        fingerprint=str(uuid.uuid4()),
    )
    test_db_session.add(finding)
    test_db_session.commit()

    yield {
        "repo": repo,
        "snap": snap,
        "file": repo_file,
        "finding": finding,
        "temp_dir": temp_dir,
        "file_path": test_file,
    }

    # Teardown
    settings.LOCAL_REPOSITORY_ROOTS = orig_roots
    try:
        import shutil
        shutil.rmtree(temp_dir, ignore_errors=True)
    except Exception:
        pass


class TestRemediationAPI:
    def test_list_rules_endpoint(self, test_client_with_db):
        resp = test_client_with_db.get("/api/v1/remediation/rules")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 7
        rule_ids = [r["remediation_rule_id"] for r in data]
        assert "FIX-PYSEC001-LITERAL-EVAL" in rule_ids

    def test_check_availability_endpoint(self, test_client_with_db, remediation_fixture):
        finding_id = remediation_fixture["finding"].id
        resp = test_client_with_db.get(f"/api/v1/remediation/findings/{finding_id}/availability")
        assert resp.status_code == 200
        data = resp.json()
        assert data["is_supported"] is True
        assert data["remediation_rule_id"] == "FIX-PYSEC001-LITERAL-EVAL"
        assert data["confidence"] == "HIGH"

    def test_full_proposal_lifecycle_endpoint(self, test_client_with_db, remediation_fixture):
        repo_id = remediation_fixture["repo"].id
        finding_id = remediation_fixture["finding"].id
        file_disk_path = remediation_fixture["file_path"]

        # 1. Create Proposal
        create_payload = {
            "repository_id": repo_id,
            "finding_id": finding_id,
            "notes": "Automated test fix for eval",
        }
        resp = test_client_with_db.post("/api/v1/remediation/proposals", json=create_payload)
        assert resp.status_code == 201
        prop_data = resp.json()
        prop_id = prop_data["id"]
        assert prop_data["status"] == "VALIDATED"
        assert prop_data["unified_diff"] != ""
        assert len(prop_data["validations"]) == 5

        # 2. List proposals
        list_resp = test_client_with_db.get(f"/api/v1/remediation/proposals?repository_id={repo_id}")
        assert list_resp.status_code == 200
        assert list_resp.json()["total"] >= 1

        # 3. Get proposal detail
        get_resp = test_client_with_db.get(f"/api/v1/remediation/proposals/{prop_id}")
        assert get_resp.status_code == 200
        assert get_resp.json()["id"] == prop_id

        # 4. Attempt to Apply BEFORE approval -> Must Fail
        apply_resp = test_client_with_db.post(f"/api/v1/remediation/proposals/{prop_id}/apply")
        assert apply_resp.status_code == 400
        assert "Only proposals explicitly reviewed and APPROVED" in apply_resp.json()["detail"]

        # 5. Explicitly Approve proposal
        approve_resp = test_client_with_db.post(
            f"/api/v1/remediation/proposals/{prop_id}/approve",
            json={"notes": "Reviewed and verified safe for production."},
        )
        assert approve_resp.status_code == 200
        assert approve_resp.json()["status"] == "APPROVED"

        # 6. Apply approved proposal
        apply_resp2 = test_client_with_db.post(f"/api/v1/remediation/proposals/{prop_id}/apply")
        assert apply_resp2.status_code == 200
        apply_data = apply_resp2.json()
        assert apply_data["status"] == "APPLIED"

        # Verify file on disk actually changed
        with open(file_disk_path, "r", encoding="utf-8") as f:
            disk_content = f.read()
        assert "ast.literal_eval" in disk_content
        assert "return eval(user_data)" not in disk_content

        # 7. Apply again (Idempotency) -> Must succeed without error
        apply_resp3 = test_client_with_db.post(f"/api/v1/remediation/proposals/{prop_id}/apply")
        assert apply_resp3.status_code == 200
        assert apply_resp3.json()["status"] == "APPLIED"

        # 8. Retrieve audit history
        hist_resp = test_client_with_db.get(f"/api/v1/remediation/proposals/{prop_id}/history")
        assert hist_resp.status_code == 200
        audits = hist_resp.json()
        assert len(audits) >= 3
        actions = [a["action"] for a in audits]
        assert "PROPOSAL_CREATED" in actions
        assert "APPROVED" in actions
        assert "APPLIED" in actions

    def test_reject_proposal_endpoint(self, test_client_with_db, remediation_fixture):
        repo_id = remediation_fixture["repo"].id
        finding_id = remediation_fixture["finding"].id

        resp = test_client_with_db.post(
            "/api/v1/remediation/proposals",
            json={"repository_id": repo_id, "finding_id": finding_id},
        )
        prop_id = resp.json()["id"]

        reject_resp = test_client_with_db.post(
            f"/api/v1/remediation/proposals/{prop_id}/reject",
            json={"reason": "Not desired at this time."},
        )
        assert reject_resp.status_code == 200
        assert reject_resp.json()["status"] == "REJECTED"
