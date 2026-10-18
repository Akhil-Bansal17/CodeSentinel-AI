"""Tests for Phase 8 Reusable Audit Runner and SARIF Exporter."""

from datetime import datetime, timezone
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.models.base import (
    AnalysisFinding,
    AnalysisRun,
    ArchitectureRun,
    Base,
    DependencyRun,
    DependencyVulnerability,
    RemediationProposal,
    Repository,
    RepositorySnapshot,
)
from backend.app.services.audit.runner import AuditRunner
from backend.app.services.audit.sarif_exporter import SarifExporter


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


def test_sarif_exporter_valid_schema():
    findings = [
        {
            "rule_id": "PYSEC001",
            "rule_name": "Dynamic Code Evaluation",
            "category": "SECURITY",
            "severity": "HIGH",
            "confidence": "HIGH",
            "file_path": "src/utils.py",
            "start_line": 42,
            "start_column": 5,
            "end_line": 42,
            "end_column": 25,
            "evidence_summary": "Dangerous eval call detected",
            "fingerprint": "abcd1234ef",
        },
        {
            "rule_id": "PY-COMPLEXITY-001",
            "rule_name": "High Cyclomatic Complexity",
            "category": "COMPLEXITY",
            "severity": "MEDIUM",
            "file_path": "src/calc.py",
            "start_line": 10,
            "start_column": 1,
            "end_line": 35,
            "end_column": 10,
            "evidence_summary": "Function complex_fn has complexity 14",
        },
    ]

    sarif = SarifExporter.export(findings, repository_name="test-repo")
    assert sarif["version"] == "2.1.0"
    assert sarif["$schema"] == "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json"
    assert len(sarif["runs"]) == 1

    driver = sarif["runs"][0]["tool"]["driver"]
    assert driver["name"] == "CodeSentinel AI"
    assert len(driver["rules"]) == 2

    results = sarif["runs"][0]["results"]
    assert len(results) == 2
    assert results[0]["ruleId"] == "PYSEC001"
    assert results[0]["level"] == "error"
    assert results[0]["locations"][0]["physicalLocation"]["artifactLocation"]["uri"] == "src/utils.py"
    assert results[0]["locations"][0]["physicalLocation"]["region"]["startLine"] == 42


def test_audit_runner_full_pillars(db_session):
    # Setup test repository and snapshot
    repo = Repository(id="repo-audit-1", name="AuditTargetRepo", source_type="local")
    db_session.add(repo)
    snap = RepositorySnapshot(
        id="snap-audit-1",
        repository_id="repo-audit-1",
        status="completed",
        file_count=50,
        source_file_count=35,
    )
    db_session.add(snap)

    # Add static analysis run with findings
    analysis = AnalysisRun(
        id="analysis-1",
        repository_id="repo-audit-1",
        snapshot_id="snap-audit-1",
        status="completed",
        findings_count=2,
    )
    db_session.add(analysis)
    f1 = AnalysisFinding(
        id="f-1",
        analysis_run_id="analysis-1",
        repository_id="repo-audit-1",
        snapshot_id="snap-audit-1",
        rule_id="PYSEC001",
        rule_name="Dynamic Code Evaluation",
        title="Dynamic Code Evaluation",
        description="Dynamic Code Evaluation using eval",
        category="SECURITY",
        severity="HIGH",
        confidence="HIGH",
        file_path="src/eval.py",
        start_line=15,
        start_column=1,
        end_line=15,
        end_column=20,
        evidence_summary="eval() detected",
        fingerprint="fp1",
    )
    f2 = AnalysisFinding(
        id="f-2",
        analysis_run_id="analysis-1",
        repository_id="repo-audit-1",
        snapshot_id="snap-audit-1",
        rule_id="PY-COMPLEXITY-001",
        rule_name="High Complexity",
        title="High Complexity",
        description="High cyclomatic complexity in calc",
        category="COMPLEXITY",
        severity="MEDIUM",
        confidence="HIGH",
        file_path="src/calc.py",
        start_line=1,
        start_column=1,
        end_line=50,
        end_column=1,
        evidence_summary="complexity 18",
        fingerprint="fp2",
    )
    db_session.add_all([f1, f2])

    # Add dependency run with vulnerability
    dep_run = DependencyRun(
        id="dep-run-1",
        repository_id="repo-audit-1",
        snapshot_id="snap-audit-1",
        status="completed",
        dependencies_discovered=15,
    )
    db_session.add(dep_run)
    vuln = DependencyVulnerability(
        id="vuln-1",
        dependency_run_id="dep-run-1",
        repository_id="repo-audit-1",
        snapshot_id="snap-audit-1",
        advisory_id="GHSA-1234",
        ecosystem="pip",
        package_name="insecure-pkg",
        resolved_version="1.0.0",
        affected_range="< 1.0.1",
        evidence_summary="Insecure package version detected",
        severity="HIGH",
        manifest_path="requirements.txt",
        fingerprint="vfp1",
    )
    db_session.add(vuln)

    # Add architecture run
    arch_run = ArchitectureRun(
        id="arch-1",
        repository_id="repo-audit-1",
        snapshot_id="snap-audit-1",
        status="completed",
        modules_analyzed=10,
        cycles_count=0,
        violations_count=0,
    )
    db_session.add(arch_run)

    # Add remediation proposal
    proposal = RemediationProposal(
        id="prop-1",
        repository_id="repo-audit-1",
        snapshot_id="snap-audit-1",
        remediation_rule_id="FIX-PYSEC001-LITERAL-EVAL",
        file_path="src/eval.py",
        original_content_hash="hash1",
        target_content_hash="hash2",
        start_line=15,
        end_line=15,
        original_code_snippet="eval(x)",
        proposed_code_snippet="ast.literal_eval(x)",
        unified_diff="--- a/src/eval.py\n+++ b/src/eval.py\n@@ -15,1 +15,1 @@\n-eval(x)\n+ast.literal_eval(x)",
        rationale="Safe replacement",
        risk_level="LOW",
        confidence="HIGH",
        status="VALIDATED",
    )
    db_session.add(proposal)
    db_session.commit()

    # Execute audit
    result = AuditRunner.execute_audit(db_session, repository_id="repo-audit-1", snapshot_id="snap-audit-1")
    assert result.repository_id == "repo-audit-1"
    assert result.status == "COMPLETED"
    assert result.overall_status in ("FAILED", "WARNING")  # Due to HIGH severity findings
    assert len(result.checks) == 6

    # Verify check categories
    categories = {c.category for c in result.checks}
    assert "INGESTION" in categories
    assert "STATIC_ANALYSIS" in categories
    assert "DEPENDENCY_SCA" in categories
    assert "APPSEC_INTELLIGENCE" in categories
    assert "ARCHITECTURE_GOVERNANCE" in categories
    assert "REMEDIATION_VALIDATION" in categories

    # Verify summary
    assert result.summary.total_checks == 6
    assert result.summary.total_findings >= 3

    # Verify report formatting
    assert "# CodeSentinel AI Audit Report" in result.markdown_report
    assert result.sarif_json["version"] == "2.1.0"
    assert len(result.sarif_json["runs"][0]["results"]) >= 3


def test_audit_runner_missing_repo(db_session):
    with pytest.raises(ValueError, match="Repository not found"):
        AuditRunner.execute_audit(db_session, repository_id="nonexistent")
