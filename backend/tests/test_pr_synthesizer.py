"""Tests for Phase 8 Pull Request Preparation and Patch Bundle Synthesizer."""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.models.base import Base, RemediationAudit, RemediationProposal, Repository, RepositorySnapshot
from backend.app.schemas.cicd import PrPrepareRequest
from backend.app.services.remediation.pr_synthesizer import (
    MockGitHubPrProvider,
    PrSynthesizer,
)


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


def test_conflict_detection_overlapping_lines():
    p1 = RemediationProposal(
        id="p-1",
        repository_id="repo-1",
        snapshot_id="snap-1",
        remediation_rule_id="RULE-1",
        file_path="app/config.py",
        original_content_hash="h1",
        target_content_hash="h2",
        original_code_snippet="a",
        proposed_code_snippet="b",
        unified_diff="diff",
        rationale="test",
        start_line=10,
        end_line=20,
    )
    p2 = RemediationProposal(
        id="p-2",
        repository_id="repo-1",
        snapshot_id="snap-1",
        remediation_rule_id="RULE-2",
        file_path="app/config.py",
        original_content_hash="h1",
        target_content_hash="h2",
        original_code_snippet="a",
        proposed_code_snippet="b",
        unified_diff="diff",
        rationale="test",
        start_line=15,
        end_line=25,
    )
    conflict = PrSynthesizer.detect_conflicts([p1, p2])
    assert conflict is not None
    assert conflict["file_path"] == "app/config.py"
    assert "Overlapping edits detected" in conflict["message"]


def test_conflict_detection_non_overlapping_same_file():
    p1 = RemediationProposal(
        id="p-1",
        repository_id="repo-1",
        snapshot_id="snap-1",
        remediation_rule_id="RULE-1",
        file_path="app/config.py",
        original_content_hash="h1",
        target_content_hash="h2",
        original_code_snippet="a",
        proposed_code_snippet="b",
        unified_diff="diff",
        rationale="test",
        start_line=10,
        end_line=20,
    )
    p2 = RemediationProposal(
        id="p-2",
        repository_id="repo-1",
        snapshot_id="snap-1",
        remediation_rule_id="RULE-2",
        file_path="app/config.py",
        original_content_hash="h1",
        target_content_hash="h2",
        original_code_snippet="a",
        proposed_code_snippet="b",
        unified_diff="diff",
        rationale="test",
        start_line=30,
        end_line=40,
    )
    conflict = PrSynthesizer.detect_conflicts([p1, p2])
    assert conflict is None


def test_pr_preparation_clean_multiproposal(db_session):
    repo = Repository(id="repo-pr-1", name="PRTestRepo", source_type="local")
    db_session.add(repo)
    snap = RepositorySnapshot(id="snap-pr-1", repository_id="repo-pr-1", status="completed")
    db_session.add(snap)

    p1 = RemediationProposal(
        id="prop-1",
        repository_id="repo-pr-1",
        snapshot_id="snap-pr-1",
        remediation_rule_id="FIX-PYSEC001-LITERAL-EVAL",
        file_path="src/eval.py",
        original_content_hash="hash1",
        target_content_hash="hash2",
        start_line=10,
        end_line=10,
        original_code_snippet="eval(x)",
        proposed_code_snippet="ast.literal_eval(x)",
        unified_diff="--- a/src/eval.py\n+++ b/src/eval.py\n@@ -10,1 +10,1 @@\n-eval(x)\n+ast.literal_eval(x)",
        rationale="Safe replacement",
        risk_level="LOW",
        confidence="HIGH",
        status="APPROVED",
    )
    p2 = RemediationProposal(
        id="prop-2",
        repository_id="repo-pr-1",
        snapshot_id="snap-pr-1",
        remediation_rule_id="FIX-PYSEC005-RESTORE-TLS",
        file_path="src/client.py",
        original_content_hash="hash3",
        target_content_hash="hash4",
        start_line=45,
        end_line=45,
        original_code_snippet="verify=False",
        proposed_code_snippet="verify=True",
        unified_diff="--- a/src/client.py\n+++ b/src/client.py\n@@ -45,1 +45,1 @@\n-verify=False\n+verify=True",
        rationale="Restore TLS verification",
        risk_level="LOW",
        confidence="HIGH",
        status="VALIDATED",
    )
    db_session.add_all([p1, p2])
    db_session.commit()

    req = PrPrepareRequest(
        repository_id="repo-pr-1",
        snapshot_id="snap-pr-1",
        proposal_ids=["prop-1", "prop-2"],
    )

    resp = PrSynthesizer.prepare_pr(db_session, req)
    assert resp.status == "PREPARED"
    assert resp.has_conflicts is False
    assert resp.proposal_count == 2
    assert "fix(security)" in resp.title
    assert "## Automated Remediation Pull Request" in resp.description
    assert "[PATCH]" in resp.patch_bundle
    assert "src/eval.py" in resp.combined_diff
    assert "src/client.py" in resp.combined_diff

    # Verify audit event logged
    audit = db_session.query(RemediationAudit).filter(RemediationAudit.action == "PR_PREPARED").first()
    assert audit is not None
    assert audit.details_json["proposal_ids"] == ["prop-1", "prop-2"]


def test_pr_preparation_ineligible_status_rejection(db_session):
    repo = Repository(id="repo-pr-1", name="PRTestRepo", source_type="local")
    db_session.add(repo)
    snap = RepositorySnapshot(id="snap-pr-1", repository_id="repo-pr-1", status="completed")
    db_session.add(snap)

    p1 = RemediationProposal(
        id="prop-unvalidated",
        repository_id="repo-pr-1",
        snapshot_id="snap-pr-1",
        remediation_rule_id="FIX-PYSEC001-LITERAL-EVAL",
        file_path="src/eval.py",
        original_content_hash="h1",
        target_content_hash="h2",
        start_line=1,
        end_line=1,
        original_code_snippet="eval()",
        proposed_code_snippet="safe()",
        unified_diff="diff",
        rationale="rat",
        risk_level="LOW",
        confidence="HIGH",
        status="PROPOSED",  # Ineligible: Not validated or approved
    )
    db_session.add(p1)
    db_session.commit()

    req = PrPrepareRequest(
        repository_id="repo-pr-1",
        proposal_ids=["prop-unvalidated"],
    )
    with pytest.raises(ValueError, match="must be in VALIDATED or APPROVED status"):
        PrSynthesizer.prepare_pr(db_session, req)


def test_mock_github_provider():
    provider = MockGitHubPrProvider(token="mock-token")
    pr_data = provider.create_pull_request(
        repo_full_name="org/repo",
        title="fix: security patch",
        body="Automated PR description",
        head_branch="codesentinel/remediation-patch",
    )
    assert pr_data["is_mock"] is True
    assert pr_data["number"] == 42
    assert "https://github.com/org/repo/pull/42" in pr_data["html_url"]
