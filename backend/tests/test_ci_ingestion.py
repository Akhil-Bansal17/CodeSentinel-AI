"""Tests for Phase 8 CI Result Ingestion Service."""

import hashlib
import hmac
import json
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.models.base import Base, Repository
from backend.app.schemas.cicd import CIIngestRequest
from backend.app.services.cicd.ingestion import CIIngestionService


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


def test_signature_verification_success():
    secret = "my-test-secret"
    payload = b'{"status": "SUCCESS", "tests_passed": 42}'
    signature = hmac.new(secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()

    assert CIIngestionService.verify_signature(payload, signature, secret=secret) is True
    assert CIIngestionService.verify_signature(payload, f"sha256={signature}", secret=secret) is True


def test_signature_verification_failure():
    secret = "my-test-secret"
    payload = b'{"status": "SUCCESS"}'
    wrong_sig = "baddeadbeef123456789"

    assert CIIngestionService.verify_signature(payload, wrong_sig, secret=secret) is False
    assert CIIngestionService.verify_signature(payload, None, secret=secret) is False


def test_ci_ingest_success_and_idempotency(db_session):
    repo = Repository(id="repo-ci-1", name="CIRepo", source_type="local")
    db_session.add(repo)
    db_session.commit()

    req = CIIngestRequest(
        repository_id="repo-ci-1",
        idempotency_key="run-101-commit-abc",
        ci_provider="github_actions",
        commit_sha="abcdef123456",
        branch="main",
        status="SUCCESS",
        payload={"tests_passed": 50, "coverage": 92.5},
    )

    # 1. First ingestion
    resp1 = CIIngestionService.ingest_ci_result(db_session, req)
    assert resp1.repository_id == "repo-ci-1"
    assert resp1.status == "SUCCESS"
    assert resp1.is_duplicate is False

    # 2. Second ingestion with identical idempotency_key
    resp2 = CIIngestionService.ingest_ci_result(db_session, req)
    assert resp2.id == resp1.id
    assert resp2.is_duplicate is True
    assert "Duplicate run detected" in resp2.message


def test_ci_ingest_oversized_payload_rejection(db_session):
    repo = Repository(id="repo-ci-1", name="CIRepo", source_type="local")
    db_session.add(repo)
    db_session.commit()

    req = CIIngestRequest(
        repository_id="repo-ci-1",
        idempotency_key="run-oversized",
    )
    oversized_bytes = b"x" * (6 * 1024 * 1024)  # 6 MB

    with pytest.raises(ValueError, match="exceeds 5 MB ceiling"):
        CIIngestionService.ingest_ci_result(db_session, req, raw_payload_bytes=oversized_bytes)


def test_ci_ingest_unknown_repository(db_session):
    req = CIIngestRequest(
        repository_id="nonexistent-repo",
        idempotency_key="key-1",
    )
    with pytest.raises(ValueError, match="Repository not found"):
        CIIngestionService.ingest_ci_result(db_session, req)
