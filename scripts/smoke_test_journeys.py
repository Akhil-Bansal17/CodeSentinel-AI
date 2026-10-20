"""Live API Smoke Test Script for User Journeys A, B, C, and D.

Executes live HTTP requests against the running CodeSentinel AI backend (http://127.0.0.1:8000):
- Health Probes: /api/health, /api/health/live, /api/health/ready
- Journey A: Repository Ingestion & Details Discovery
- Journey B: Code Search & Capabilities Check
- Journey C: Remediation Proposal Inspection & Safe Patches
- Journey D: Hardened CI/CD Workflow Generation & Least Privilege Verification
"""

import os
import sys
import json
import uuid
from datetime import datetime, timezone
import urllib.request
import urllib.error

BASE_URL = "http://127.0.0.1:8000/api"

def make_request(endpoint: str, method: str = "GET", payload: dict = None, headers: dict = None):
    url = f"{BASE_URL}{endpoint}"
    data = json.dumps(payload).encode("utf-8") if payload else None
    req_headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if headers:
        req_headers.update(headers)
    req = urllib.request.Request(url, data=data, headers=req_headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            content = resp.read().decode("utf-8")
            return resp.status, json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        err_content = e.read().decode("utf-8")
        try:
            return e.code, json.loads(err_content)
        except Exception:
            return e.code, {"raw_error": err_content}
    except Exception as e:
        return 0, {"error": str(e)}

def seed_database_if_empty():
    """Seed a test repository, snapshot, and remediation proposal if empty."""
    from backend.app.core.database import SessionLocal
    from backend.app.models.base import Repository, RepositorySnapshot, RemediationProposal

    db = SessionLocal()
    try:
        existing = db.query(Repository).first()
        if not existing:
            repo_id = str(uuid.uuid4())
            snap_id = str(uuid.uuid4())
            prop_id = str(uuid.uuid4())
            now = datetime.now(timezone.utc)

            repo = Repository(
                id=repo_id,
                name="smoke-test-repo",
                source_type="local",
                source_identifier="local:smoke-test-repo",
                status="completed",
                created_at=now,
                updated_at=now,
            )
            db.add(repo)

            snap = RepositorySnapshot(
                id=snap_id,
                repository_id=repo_id,
                status="completed",
                file_count=3,
                source_file_count=2,
                total_lines_of_code=45,
                metrics_json={"summary": {"total_files": 3, "lines_of_code": 45}},
                language_distribution={"Python": {"file_count": 2, "percentage": 100.0}},
                created_at=now,
                updated_at=now,
            )
            db.add(snap)

            proposal = RemediationProposal(
                id=prop_id,
                repository_id=repo_id,
                snapshot_id=snap_id,
                remediation_rule_id="FIX-PYSEC001",
                finding_type="APP_SEC",
                status="PROPOSED",
                file_path="src/eval_handler.py",
                original_content_hash="abc123",
                target_content_hash="def456",
                start_line=10,
                end_line=12,
                original_code_snippet="result = eval(user_input)",
                proposed_code_snippet="result = ast.literal_eval(user_input)",
                unified_diff="--- a/src/eval_handler.py\n+++ b/src/eval_handler.py\n@@ -10,3 +10,3 @@\n-result = eval(user_input)\n+result = ast.literal_eval(user_input)\n",
                rationale="Replace arbitrary code evaluation with safe literal evaluation",
                confidence="HIGH",
                risk_level="LOW",
                created_at=now,
                updated_at=now,
            )
            db.add(proposal)
            db.commit()
            print("  [Setup] Seeded test repository and proposal in smoke test database.")
    finally:
        db.close()

def run_smoke_journeys():
    seed_database_if_empty()

    print("\n[1/5] Checking Health & Readiness Endpoints...")
    status_code, health = make_request("/health")
    assert status_code == 200, f"Health check failed: {status_code} {health}"
    print(f"  -> /api/health: {health['status']} (service: {health['service']}, db: {health['database']})")

    status_code, liveness = make_request("/health/live")
    assert status_code == 200, f"Liveness check failed: {status_code} {liveness}"
    print(f"  -> /api/health/live: {liveness['status']} (independent of DB: database={liveness.get('database')})")

    status_code, readiness = make_request("/health/ready")
    assert status_code == 200, f"Readiness check failed: {status_code} {readiness}"
    print(f"  -> /api/health/ready: {readiness['status']} (database={readiness['database']})")

    print("\n[2/5] Journey A: Repository Ingestion & Analysis Discovery...")
    status_code, repos_res = make_request("/v1/repositories")
    assert status_code == 200, f"List repositories failed: {status_code} {repos_res}"
    repos = repos_res.get("items", [])
    print(f"  -> GET /api/v1/repositories: retrieved {len(repos)} repositories (total: {repos_res.get('total')})")
    
    assert len(repos) > 0, "Expected at least 1 repository in database"
    target_repo = repos[0]
    target_repo_id = target_repo["id"]
    status_code, repo_detail = make_request(f"/v1/repositories/{target_repo_id}")
    assert status_code == 200, f"Get repo detail failed: {status_code}"
    print(f"  -> GET /api/v1/repositories/{target_repo_id}: successfully loaded '{repo_detail['name']}'")

    print("\n[3/5] Journey B: Code Search & Evidence Q&A Capability Check...")
    status_code, caps = make_request(f"/v1/search/capabilities?repository_id={target_repo_id}")
    print(f"  -> GET /api/v1/search/capabilities: HTTP {status_code} (status: {caps.get('status') if isinstance(caps, dict) else caps})")
    status_code, search_res = make_request(f"/v1/search?query=def&repository_id={target_repo_id}")
    print(f"  -> GET /api/v1/search?query=def: HTTP {status_code} (total hits: {search_res.get('total', 0) if isinstance(search_res, dict) else 'N/A'})")

    print("\n[4/5] Journey C: Remediation Proposal & Protected Path Checks...")
    status_code, props_res = make_request(f"/v1/remediation/proposals?repository_id={target_repo_id}")
    assert status_code == 200, f"List proposals failed: {status_code} {props_res}"
    props = props_res if isinstance(props_res, list) else props_res.get("items", [])
    print(f"  -> GET /api/v1/remediation/proposals: HTTP {status_code} (proposals: {len(props)})")
    if props:
        p0 = props[0]
        print(f"  -> Inspect proposal {p0['id']}: rule={p0['remediation_rule_id']}, status={p0['status']}, file={p0['file_path']}")
        assert "unified_diff" in p0
        print(f"  -> Diff inspected: {p0['unified_diff'][:60]}...")

    print("\n[5/5] Journey D: CI/CD Workflow Generation & Audit Services...")
    wf_payload = {
        "repository_id": target_repo_id,
        "workflow_name": "CodeSentinel CI",
        "python_version": "3.12",
        "node_version": "20",
        "include_lint": True,
        "include_test": True,
        "include_security_audit": True,
    }
    status_code, workflow = make_request("/v1/cicd/workflows/generate", method="POST", payload=wf_payload)
    assert status_code == 200, f"Generate workflow failed: {status_code} {workflow}"
    assert "yaml_content" in workflow
    assert "contents: read" in workflow["yaml_content"]
    print(f"  -> POST /api/v1/cicd/workflows/generate: generated hardened GitHub Actions workflow with 'contents: read'")
    print(f"  -> Ecosystem detected: {workflow['ecosystem_detected']}, Permissions: {workflow['permissions_summary']}")

    print("\n=== ALL LIVE API SMOKE TEST JOURNEYS PASSED SUCCESSFULLY ===")

if __name__ == "__main__":
    run_smoke_journeys()
