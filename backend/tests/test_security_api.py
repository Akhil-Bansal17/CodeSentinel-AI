"""API tests for Phase 4 Security Intelligence rules catalog, confidence filtering, and finding inspection."""

from datetime import datetime, timezone
import uuid
import pytest

from backend.app.models.base import AnalysisFinding, AnalysisRun, Repository, RepositorySnapshot


@pytest.fixture
def seeded_security_analysis(test_db_session):
    """Seed test database with repository, snapshot, analysis run, and security finding."""
    now = datetime.now(timezone.utc)
    repo = Repository(
        id=str(uuid.uuid4()),
        name="SecurityTestRepo",
        source_type="local",
        source_identifier="/tmp/sec_repo",
        status="ready",
    )
    test_db_session.add(repo)

    snapshot = RepositorySnapshot(
        id=str(uuid.uuid4()),
        repository_id=repo.id,
        status="completed",
        started_at=now,
        completed_at=now,
        file_count=5,
        source_file_count=5,
    )
    test_db_session.add(snapshot)

    run = AnalysisRun(
        id=str(uuid.uuid4()),
        repository_id=repo.id,
        snapshot_id=snapshot.id,
        status="completed",
        started_at=now,
        completed_at=now,
        rule_set_version="1.0.0",
        files_discovered=5,
        files_analyzed=5,
        findings_count=2,
        summary_json={
            "total_findings": 2,
            "severity_distribution": {"HIGH": 1, "MEDIUM": 1},
            "confidence_distribution": {"HIGH": 1, "MEDIUM": 1},
        },
    )
    test_db_session.add(run)

    finding_high = AnalysisFinding(
        id=str(uuid.uuid4()),
        analysis_run_id=run.id,
        repository_id=repo.id,
        snapshot_id=snapshot.id,
        rule_id="PYSEC001",
        rule_name="Dynamic Code Execution",
        rule_version="1.0.0",
        title="Dynamic code execution via eval()",
        description="Dynamic code execution description",
        severity="HIGH",
        confidence="HIGH",
        category="SECURITY",
        file_path="src/main.py",
        start_line=10,
        start_column=5,
        end_line=10,
        end_column=20,
        evidence_summary="eval(user_code)",
        fingerprint="a" * 64,
        metadata_json={
            "confidence": "HIGH",
            "remediation": "Use ast.literal_eval()",
            "why_it_matters": "Remote code execution risk",
        },
    )
    finding_med = AnalysisFinding(
        id=str(uuid.uuid4()),
        analysis_run_id=run.id,
        repository_id=repo.id,
        snapshot_id=snapshot.id,
        rule_id="PYSEC004",
        rule_name="Weak Cryptographic Hash Usage",
        rule_version="1.0.0",
        title="Weak hash algorithm (MD5)",
        description="Weak hash description",
        severity="MEDIUM",
        confidence="MEDIUM",
        category="SECURITY",
        file_path="src/utils.py",
        start_line=25,
        start_column=1,
        end_line=25,
        end_column=30,
        evidence_summary="hashlib.md5(data)",
        fingerprint="b" * 64,
        metadata_json={
            "confidence": "MEDIUM",
            "remediation": "Migrate to SHA-256",
        },
    )
    test_db_session.add(finding_high)
    test_db_session.add(finding_med)
    test_db_session.commit()

    return {
        "repo": repo,
        "snapshot": snapshot,
        "run": run,
        "finding_high": finding_high,
        "finding_med": finding_med,
    }


def test_api_list_rules_catalog(test_client_with_db):
    """Verify GET /api/v1/analyses/rules/catalog returns all registered security and static rules."""
    response = test_client_with_db.get("/api/v1/analyses/rules/catalog")
    assert response.status_code == 200
    data = response.json()

    assert isinstance(data, list)
    rule_ids = [r["rule_id"] for r in data]

    # Verify all 10 security rules are in catalog
    assert "PYSEC001" in rule_ids
    assert "PYSEC002" in rule_ids
    assert "PYSEC003" in rule_ids
    assert "PYSEC004" in rule_ids
    assert "PYSEC005" in rule_ids
    assert "PYSEC006" in rule_ids
    assert "JSSEC001" in rule_ids
    assert "JSSEC002" in rule_ids
    assert "JSSEC003" in rule_ids
    assert "JSSEC004" in rule_ids

    # Verify rule structure contains explanation, remediation, limitations
    pysec1 = next(r for r in data if r["rule_id"] == "PYSEC001")
    assert pysec1["name"] == "Dynamic Code Execution"
    assert pysec1["category"] == "SECURITY"
    assert pysec1["default_severity"] == "HIGH"
    assert pysec1["default_confidence"] == "HIGH"
    assert "remediation" in pysec1
    assert "why_it_matters" in pysec1
    assert "limitations" in pysec1


def test_api_findings_confidence_filter(test_client_with_db, seeded_security_analysis):
    """Verify confidence filtering on GET /api/v1/analyses/{analysis_id}/findings."""
    run_id = seeded_security_analysis["run"].id

    # 1. Fetch with confidence=HIGH
    res_high = test_client_with_db.get(f"/api/v1/analyses/{run_id}/findings?confidence=HIGH")
    assert res_high.status_code == 200
    data_high = res_high.json()
    assert data_high["total"] == 1
    assert data_high["items"][0]["rule_id"] == "PYSEC001"
    assert data_high["items"][0]["confidence"] == "HIGH"

    # 2. Fetch with confidence=MEDIUM
    res_med = test_client_with_db.get(f"/api/v1/analyses/{run_id}/findings?confidence=MEDIUM")
    assert res_med.status_code == 200
    data_med = res_med.json()
    assert data_med["total"] == 1
    assert data_med["items"][0]["rule_id"] == "PYSEC004"
    assert data_med["items"][0]["confidence"] == "MEDIUM"

    # 3. Fetch with non-matching confidence
    res_low = test_client_with_db.get(f"/api/v1/analyses/{run_id}/findings?confidence=LOW")
    assert res_low.status_code == 200
    assert res_low.json()["total"] == 0


def test_api_get_single_finding(test_client_with_db, seeded_security_analysis):
    """Verify GET /api/v1/analyses/{analysis_id}/findings/{finding_id} retrieves full finding details."""
    run_id = seeded_security_analysis["run"].id
    finding_id = seeded_security_analysis["finding_high"].id

    res = test_client_with_db.get(f"/api/v1/analyses/{run_id}/findings/{finding_id}")
    assert res.status_code == 200
    data = res.json()

    assert data["id"] == finding_id
    assert data["rule_id"] == "PYSEC001"
    assert data["severity"] == "HIGH"
    assert data["confidence"] == "HIGH"
    assert data["evidence_summary"] == "eval(user_code)"
    assert data["metadata_json"]["remediation"] == "Use ast.literal_eval()"
    assert data["metadata_json"]["why_it_matters"] == "Remote code execution risk"


def test_api_get_finding_not_found(test_client_with_db, seeded_security_analysis):
    """Verify 404 error when requesting a non-existent finding ID."""
    run_id = seeded_security_analysis["run"].id
    fake_id = "00000000-0000-0000-0000-000000000000"

    res = test_client_with_db.get(f"/api/v1/analyses/{run_id}/findings/{fake_id}")
    assert res.status_code == 404
    assert res.json()["error"]["code"] == "NOT_FOUND"
