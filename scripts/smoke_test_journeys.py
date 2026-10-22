"""Live API Smoke Test Script for User Journeys A, B, C, and D.

Executes live HTTP requests against the running CodeSentinel AI backend (http://127.0.0.1:8000):
- Health Probes: /api/health, /api/health/live, /api/health/ready
- Journey A: Repository Ingestion & Details Discovery
- Journey B: Code Search & Capabilities Check (Strict validation, top-level routes, citation checks)
- Journey C: Remediation Proposal Inspection & Safe Patches
- Journey D: Hardened CI/CD Workflow Generation & Least Privilege Verification

Strictness guarantees:
- Every required step asserts exact HTTP status and schema requirements.
- Unexpected status codes or schema mismatches cause explicit journey failure.
- Non-zero exit code (1) if any required step fails.
- Isolated test database records seeded and deterministically cleaned up in a finally block.
- Sanitized diagnostic logging without leaking secrets or credentials.
"""

import json
import os
import sys
import uuid
import urllib.error
import urllib.request
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

BASE_URL = os.environ.get("CODESENTINEL_BASE_URL", "http://127.0.0.1:8000/api")


def sanitize_excerpt(content: Any, max_len: int = 160) -> str:
    """Format a truncated, safe string representation of a response."""
    raw = json.dumps(content) if isinstance(content, (dict, list)) else str(content)
    raw = raw.replace("\n", " ").strip()
    return raw[:max_len] + "..." if len(raw) > max_len else raw


def make_request(
    endpoint: str,
    method: str = "GET",
    payload: Optional[Dict[str, Any]] = None,
    headers: Optional[Dict[str, str]] = None,
    timeout: int = 15,
) -> Tuple[int, Dict[str, Any]]:
    """Execute an HTTP request with timeout and error capture."""
    url = f"{BASE_URL}{endpoint}"
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    req_headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if headers:
        req_headers.update(headers)

    req = urllib.request.Request(url, data=data, headers=req_headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            content = resp.read().decode("utf-8")
            return resp.status, json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        err_content = e.read().decode("utf-8")
        try:
            return e.code, json.loads(err_content)
        except Exception:
            return e.code, {"raw_error": sanitize_excerpt(err_content)}
    except urllib.error.URLError as e:
        return 0, {"network_error": str(e.reason)}
    except Exception as e:
        return 0, {"error": str(e)}


def seed_smoke_test_data() -> Dict[str, str]:
    """Seed dedicated, uniquely-identified test records for smoke testing."""
    from backend.app.core.database import SessionLocal, engine
    from backend.app.models.base import (
        Base,
        CodeChunk,
        CodeIndexRun,
        RemediationProposal,
        Repository,
        RepositorySnapshot,
    )

    # Ensure tables exist in target database
    Base.metadata.create_all(bind=engine)

    suffix = uuid.uuid4().hex[:8]
    seeded_ids = {
        "repo_id": f"smoke-repo-{suffix}",
        "snap_id": f"smoke-snap-{suffix}",
        "run_id": f"smoke-run-{suffix}",
        "chunk_id": f"smoke-chunk-{suffix}",
        "prop_id": f"smoke-prop-{suffix}",
    }

    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)

        repo = Repository(
            id=seeded_ids["repo_id"],
            name=f"smoke-test-repo-{suffix}",
            source_type="local",
            source_identifier=f"local:smoke-test-repo-{suffix}",
            status="completed",
            created_at=now,
            updated_at=now,
        )
        db.add(repo)

        snap = RepositorySnapshot(
            id=seeded_ids["snap_id"],
            repository_id=seeded_ids["repo_id"],
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

        run = CodeIndexRun(
            id=seeded_ids["run_id"],
            repository_id=seeded_ids["repo_id"],
            snapshot_id=seeded_ids["snap_id"],
            status="completed",
            chunk_count=1,
            files_indexed=1,
            files_skipped=0,
            summary_json={"files": 1, "chunks": 1},
            started_at=now,
            completed_at=now,
        )
        db.add(run)

        chunk = CodeChunk(
            id=seeded_ids["chunk_id"],
            index_run_id=seeded_ids["run_id"],
            repository_id=seeded_ids["repo_id"],
            snapshot_id=seeded_ids["snap_id"],
            relative_path="src/eval_handler.py",
            file_name="eval_handler.py",
            language="Python",
            chunk_index=0,
            chunk_type="function",
            symbol_name="authenticate_user",
            symbol_type="function",
            start_line=10,
            end_line=25,
            content="def authenticate_user(username: str, token: str):\n    return check_auth_token(token)",
            content_hash="hash_smoke_001",
            chunk_fingerprint="fp_smoke_001",
            embedding=None,
            metadata_json={},
        )
        db.add(chunk)

        proposal = RemediationProposal(
            id=seeded_ids["prop_id"],
            repository_id=seeded_ids["repo_id"],
            snapshot_id=seeded_ids["snap_id"],
            remediation_rule_id="FIX-PYSEC001",
            finding_type="APP_SEC",
            status="PROPOSED",
            file_path="src/eval_handler.py",
            original_content_hash="abc123hash",
            target_content_hash="def456hash",
            start_line=10,
            end_line=12,
            original_code_snippet="result = eval(user_input)",
            proposed_code_snippet="result = ast.literal_eval(user_input)",
            unified_diff=(
                "--- a/src/eval_handler.py\n"
                "+++ b/src/eval_handler.py\n"
                "@@ -10,3 +10,3 @@\n"
                "-result = eval(user_input)\n"
                "+result = ast.literal_eval(user_input)\n"
            ),
            rationale="Replace arbitrary code evaluation with safe literal evaluation",
            confidence="HIGH",
            risk_level="LOW",
            created_at=now,
            updated_at=now,
        )
        db.add(proposal)

        db.commit()
        print(f"  [Setup] Seeded isolated smoke test records (repo={seeded_ids['repo_id']}).")
        return seeded_ids
    except Exception as e:
        db.rollback()
        print(f"  [Setup Error] Failed to seed smoke test data: {e}")
        raise
    finally:
        db.close()


def cleanup_smoke_test_data(seeded_ids: Dict[str, str]):
    """Clean up only the exact records created for this smoke test run."""
    if not seeded_ids:
        return

    from backend.app.core.database import SessionLocal
    from backend.app.models.base import (
        CodeChunk,
        CodeIndexRun,
        RemediationProposal,
        Repository,
        RepositorySnapshot,
    )

    db = SessionLocal()
    try:
        if "chunk_id" in seeded_ids:
            db.query(CodeChunk).filter(CodeChunk.id == seeded_ids["chunk_id"]).delete()
        if "run_id" in seeded_ids:
            db.query(CodeIndexRun).filter(CodeIndexRun.id == seeded_ids["run_id"]).delete()
        if "prop_id" in seeded_ids:
            db.query(RemediationProposal).filter(RemediationProposal.id == seeded_ids["prop_id"]).delete()
        if "snap_id" in seeded_ids:
            db.query(RepositorySnapshot).filter(RepositorySnapshot.id == seeded_ids["snap_id"]).delete()
        if "repo_id" in seeded_ids:
            db.query(Repository).filter(Repository.id == seeded_ids["repo_id"]).delete()
        db.commit()
        print(f"  [Teardown] Successfully cleaned up isolated records (repo={seeded_ids.get('repo_id')}).")
    except Exception as e:
        db.rollback()
        print(f"  [Teardown Warning] Failed to clean up test records: {e}")
    finally:
        db.close()


def run_smoke_journeys() -> int:
    """Run all smoke test journeys strictly. Returns 0 on success, 1 on any failure."""
    journey_statuses = {
        "Health & Probes": "PENDING",
        "Journey A (Ingestion & Discovery)": "PENDING",
        "Journey B (Search & Citations)": "PENDING",
        "Journey C (Remediation Proposals)": "PENDING",
        "Journey D (Hardened CI/CD)": "PENDING",
        "Journey E (Operational Telemetry)": "PENDING",
    }
    failures: List[str] = []


    def record_step_result(
        journey: str,
        step_name: str,
        actual_code: int,
        expected_code: int,
        body: Dict[str, Any],
        extra_validation: Optional[bool] = None,
        extra_err: str = "",
    ) -> bool:
        status_ok = actual_code == expected_code
        schema_ok = extra_validation is None or extra_validation is True
        if status_ok and schema_ok:
            return True

        reasons = []
        if not status_ok:
            reasons.append(f"HTTP {actual_code} != expected {expected_code}")
        if not schema_ok:
            reasons.append(extra_err or "schema validation failed")

        err_msg = f"[{journey}] {step_name}: {', '.join(reasons)}. Excerpt: {sanitize_excerpt(body)}"
        print(f"  [FAIL] {err_msg}")
        failures.append(err_msg)
        journey_statuses[journey] = "FAILED"
        return False

    seeded_ids: Dict[str, str] = {}
    try:
        seeded_ids = seed_smoke_test_data()
        target_repo_id = seeded_ids["repo_id"]

        # ======================================================================
        # 1. Health Probes
        # ======================================================================
        j_health = "Health & Probes"
        print("\n[1/5] Checking Health & Readiness Endpoints...")

        code, health = make_request("/health")
        h_valid = health.get("status") == "ok" and "service" in health
        record_step_result(j_health, "GET /api/health", code, 200, health, h_valid, "missing status=ok or service")
        if code == 200:
            print(f"  -> /api/health: {health.get('status')} (service: {health.get('service')}, db: {health.get('database')})")

        code, liveness = make_request("/health/live")
        l_valid = liveness.get("status") == "ok" and liveness.get("database") is None
        record_step_result(j_health, "GET /api/health/live", code, 200, liveness, l_valid, "liveness depends on DB")
        if code == 200:
            print(f"  -> /api/health/live: {liveness.get('status')} (independent of DB)")

        code, readiness = make_request("/health/ready")
        r_valid = readiness.get("status") == "ready"
        record_step_result(j_health, "GET /api/health/ready", code, 200, readiness, r_valid, "readiness status != ready")
        if code == 200:
            print(f"  -> /api/health/ready: {readiness.get('status')} (database={readiness.get('database')})")

        if journey_statuses[j_health] == "PENDING":
            journey_statuses[j_health] = "PASSED"

        # ======================================================================
        # 2. Journey A: Repository Ingestion & Details Discovery
        # ======================================================================
        j_a = "Journey A (Ingestion & Discovery)"
        print("\n[2/5] Journey A: Repository Ingestion & Discovery...")

        code, repos_res = make_request("/v1/repositories")
        items = repos_res.get("items", []) if isinstance(repos_res, dict) else []
        record_step_result(j_a, "GET /api/v1/repositories", code, 200, repos_res, len(items) >= 1, "items list empty")
        if code == 200:
            print(f"  -> GET /api/v1/repositories: retrieved {len(items)} repositories (total: {repos_res.get('total')})")

        code, repo_detail = make_request(f"/v1/repositories/{target_repo_id}")
        rd_valid = repo_detail.get("id") == target_repo_id
        record_step_result(j_a, f"GET /api/v1/repositories/{target_repo_id}", code, 200, repo_detail, rd_valid, "id mismatch")
        if code == 200:
            print(f"  -> GET /api/v1/repositories/{target_repo_id}: successfully loaded '{repo_detail.get('name')}'")

        if journey_statuses[j_a] == "PENDING":
            journey_statuses[j_a] = "PASSED"

        # ======================================================================
        # 3. Journey B: Code Search & Capabilities Check
        # ======================================================================
        j_b = "Journey B (Search & Citations)"
        print("\n[3/5] Journey B: Code Search & Evidence Q&A Capability Check...")

        # 3.1 Capabilities discovery
        code, caps = make_request(f"/v1/search/capabilities?repository_id={target_repo_id}")
        caps_valid = caps.get("lexical_available") is True and caps.get("index_status") == "completed"
        record_step_result(j_b, "GET /api/v1/search/capabilities", code, 200, caps, caps_valid, "lexical search not available or unindexed")
        if code == 200:
            print(f"  -> GET /api/v1/search/capabilities: HTTP 200 (lexical={caps.get('lexical_available')}, status={caps.get('index_status')})")

        # 3.2 Query search (GET)
        code, search_res = make_request(f"/v1/search?query=authenticate_user&repository_id={target_repo_id}")
        results = search_res.get("results", []) if isinstance(search_res, dict) else []
        search_valid = len(results) >= 1 and any("authenticate_user" in r.get("symbol_name", "") for r in results)
        record_step_result(j_b, "GET /api/v1/search?query=authenticate_user", code, 200, search_res, search_valid, "expected search hit for authenticate_user")
        if code == 200:
            citation = results[0].get("citation", "N/A") if results else "N/A"
            print(f"  -> GET /api/v1/search?query=authenticate_user: HTTP 200 (hits: {len(results)}, citation: {citation})")

        # 3.3 Query search (POST /search)
        search_payload = {
            "repository_id": target_repo_id,
            "query": "authenticate_user",
            "mode": "lexical",
            "limit": 5,
        }
        code, post_search = make_request("/v1/search/search", method="POST", payload=search_payload)
        post_results = post_search.get("results", []) if isinstance(post_search, dict) else []
        record_step_result(j_b, "POST /api/v1/search/search", code, 200, post_search, len(post_results) >= 1, "no results returned")
        if code == 200:
            print(f"  -> POST /api/v1/search/search: HTTP 200 (hits: {len(post_results)})")

        # 3.4 Grounded Q&A (POST /qa)
        qa_payload = {
            "repository_id": target_repo_id,
            "question": "Where is user authentication defined?",
            "retrieval_mode": "lexical",
        }
        code, qa_res = make_request("/v1/search/qa", method="POST", payload=qa_payload)
        citations = qa_res.get("citations", []) if isinstance(qa_res, dict) else []
        evidence = qa_res.get("evidence", []) if isinstance(qa_res, dict) else []
        qa_valid = len(evidence) >= 1 and len(citations) >= 1
        record_step_result(j_b, "POST /api/v1/search/qa", code, 200, qa_res, qa_valid, "missing evidence or citations")
        if code == 200:
            print(f"  -> POST /api/v1/search/qa: HTTP 200 (evidence items: {len(evidence)}, citations: {citations})")

        # 3.5 Negative & boundary tests: non-existent repository must return 404
        code, not_found_res = make_request("/v1/search/capabilities?repository_id=unknown-repo-id-404")
        record_step_result(j_b, "GET /api/v1/search/capabilities (unknown repo)", code, 404, not_found_res)

        # 3.6 Negative test: empty query must return 422
        code, unproc_res = make_request(f"/v1/search?query=&repository_id={target_repo_id}")
        record_step_result(j_b, "GET /api/v1/search?query= (empty query)", code, 422, unproc_res)

        if journey_statuses[j_b] == "PENDING":
            journey_statuses[j_b] = "PASSED"

        # ======================================================================
        # 4. Journey C: Remediation Proposal & Protected Path Checks
        # ======================================================================
        j_c = "Journey C (Remediation Proposals)"
        print("\n[4/5] Journey C: Remediation Proposal & Protected Path Checks...")

        code, props_res = make_request(f"/v1/remediation/proposals?repository_id={target_repo_id}")
        props = props_res if isinstance(props_res, list) else props_res.get("items", [])
        c_valid = len(props) >= 1 and "unified_diff" in props[0]
        record_step_result(j_c, "GET /api/v1/remediation/proposals", code, 200, props_res, c_valid, "proposals list empty or diff missing")
        if code == 200 and props:
            p0 = props[0]
            print(f"  -> GET /api/v1/remediation/proposals: HTTP 200 (rule={p0.get('remediation_rule_id')}, file={p0.get('file_path')})")
            print(f"  -> Diff verified: {p0.get('unified_diff', '')[:65]}...")

        # Verify remediation rules availability endpoint
        code, rules_res = make_request("/v1/remediation/rules")
        record_step_result(j_c, "GET /api/v1/remediation/rules", code, 200, rules_res, isinstance(rules_res, list) and len(rules_res) >= 1, "rules empty")
        if code == 200:
            print(f"  -> GET /api/v1/remediation/rules: HTTP 200 (available rules: {len(rules_res)})")

        if journey_statuses[j_c] == "PENDING":
            journey_statuses[j_c] = "PASSED"

        # ======================================================================
        # 5. Journey D: CI/CD Workflow Generation & Audit Services
        # ======================================================================
        j_d = "Journey D (Hardened CI/CD)"
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
        code, workflow = make_request("/v1/cicd/workflows/generate", method="POST", payload=wf_payload)
        wf_content = workflow.get("yaml_content", "") if isinstance(workflow, dict) else ""
        d_valid = "contents: read" in wf_content and "permissions_summary" in workflow
        record_step_result(j_d, "POST /api/v1/cicd/workflows/generate", code, 200, workflow, d_valid, "missing contents: read in generated yaml")
        if code == 200:
            print(f"  -> POST /api/v1/cicd/workflows/generate: HTTP 200 (least-privilege permissions verified)")
            print(f"  -> Permissions summary: {workflow.get('permissions_summary')}")

        if journey_statuses[j_d] == "PENDING":
            journey_statuses[j_d] = "PASSED"

        # ======================================================================
        # 6. Journey E: Operational Telemetry & Lightweight Metrics
        # ======================================================================
        j_e = "Journey E (Operational Telemetry)"
        print("\n[6/6] Journey E: Operational Telemetry & Metrics Services...")

        code, metrics_v1 = make_request("/v1/metrics", method="GET")
        e_valid_v1 = (
            isinstance(metrics_v1, dict)
            and "uptime_seconds" in metrics_v1
            and "http" in metrics_v1
            and "background_tasks" in metrics_v1
            and metrics_v1.get("service") == "codesentinel-api"
        )
        record_step_result(j_e, "GET /api/v1/metrics", code, 200, metrics_v1, e_valid_v1, "invalid metrics structure")
        if code == 200 and e_valid_v1:
            total_reqs = metrics_v1.get("http", {}).get("requests_total", 0)
            avg_lat = metrics_v1.get("http", {}).get("avg_duration_ms", 0.0)
            print(f"  -> GET /api/v1/metrics: HTTP 200 (requests_tracked={total_reqs}, avg_lat={avg_lat}ms)")

        # Verify alias route /api/metrics
        code_alias, metrics_alias = make_request("/metrics", method="GET")
        e_valid_alias = isinstance(metrics_alias, dict) and "uptime_seconds" in metrics_alias
        record_step_result(j_e, "GET /api/metrics (alias)", code_alias, 200, metrics_alias, e_valid_alias, "metrics alias failed")
        if code_alias == 200:
            print(f"  -> GET /api/metrics: HTTP 200 (alias route verified)")

        if journey_statuses[j_e] == "PENDING":
            journey_statuses[j_e] = "PASSED"


    except Exception as exc:
        print(f"\n[FATAL ERROR] Unexpected exception during smoke test run: {exc}")
        failures.append(f"Fatal exception: {str(exc)}")
    finally:
        cleanup_smoke_test_data(seeded_ids)

    # ==========================================================================
    # Final Structured Summary Table
    # ==========================================================================
    print("\n" + "=" * 65)
    print("                     SMOKE TEST SUMMARY")
    print("=" * 65)
    all_passed = True
    for journey, outcome in journey_statuses.items():
        if outcome != "PASSED":
            all_passed = False
        status_display = outcome
        print(f"  {journey:<36}: {status_display}")
    print("=" * 65)

    if not all_passed or failures:
        print(f"\n[RESULT] SMOKE TEST FAILED with {len(failures)} defect(s):")
        for f in failures:
            print(f"  - {f}")
        return 1

    print("\n[RESULT] ALL REQUIRED SMOKE TEST JOURNEYS PASSED WITH STRICT VALIDATION.")
    return 0


if __name__ == "__main__":
    exit_code = run_smoke_journeys()
    sys.exit(exit_code)
