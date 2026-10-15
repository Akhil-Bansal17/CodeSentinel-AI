"""API tests for Phase 6 Code Search & Repository Q&A endpoints."""

import pytest
from backend.app.models.base import CodeChunk, CodeIndexRun, Repository, RepositorySnapshot


@pytest.fixture
def populated_search_db(test_db_session):
    """Seed database with repository, snapshot, index run, and code chunks."""
    repo = Repository(
        id="repo-search-api",
        name="test-repo",
        source_type="local",
        source_identifier="local:test-repo",
    )
    snap = RepositorySnapshot(
        id="snap-search-api",
        repository_id=repo.id,
        status="completed",
        file_count=2,
    )
    test_db_session.add(repo)
    test_db_session.add(snap)

    run = CodeIndexRun(
        id="run-search-api",
        repository_id=repo.id,
        snapshot_id=snap.id,
        status="completed",
        chunk_count=2,
        files_indexed=2,
        files_skipped=0,
        summary_json={},
    )
    test_db_session.add(run)

    chunk1 = CodeChunk(
        id="chunk-api-1",
        index_run_id=run.id,
        repository_id=repo.id,
        snapshot_id=snap.id,
        relative_path="backend/app/services/auth.py",
        file_name="auth.py",
        language="Python",
        chunk_index=0,
        chunk_type="function",
        symbol_name="authenticate_user",
        symbol_type="function",
        start_line=10,
        end_line=25,
        content="def authenticate_user(username: str, password: str):\n    return check_password(password)",
        content_hash="hash_auth_1",
        chunk_fingerprint="fp_auth_1",
        embedding=None,
        metadata_json={},
    )

    chunk2 = CodeChunk(
        id="chunk-api-2",
        index_run_id=run.id,
        repository_id=repo.id,
        snapshot_id=snap.id,
        relative_path="frontend/src/components/Header.tsx",
        file_name="Header.tsx",
        language="TypeScript",
        chunk_index=1,
        chunk_type="function",
        symbol_name="HeaderComponent",
        symbol_type="function",
        start_line=1,
        end_line=20,
        content="export const HeaderComponent: React.FC = () => {\n  return <header>CodeSentinel</header>;\n};",
        content_hash="hash_header_2",
        chunk_fingerprint="fp_header_2",
        embedding=None,
        metadata_json={},
    )

    test_db_session.add(chunk1)
    test_db_session.add(chunk2)
    test_db_session.commit()

    return {"repo_id": repo.id, "snap_id": snap.id, "chunk_id": chunk1.id}


def test_get_index_status_api(test_client_with_db, populated_search_db):
    """Verify GET /repositories/{id}/snapshots/{id}/index/status."""
    repo_id = populated_search_db["repo_id"]
    snap_id = populated_search_db["snap_id"]

    resp = test_client_with_db.get(f"/api/v1/repositories/{repo_id}/snapshots/{snap_id}/index/status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "completed"
    assert data["chunk_count"] == 2


def test_get_capabilities_api(test_client_with_db, populated_search_db):
    """Verify GET /repositories/{id}/snapshots/{id}/index/capabilities."""
    repo_id = populated_search_db["repo_id"]
    snap_id = populated_search_db["snap_id"]

    resp = test_client_with_db.get(f"/api/v1/repositories/{repo_id}/snapshots/{snap_id}/index/capabilities")
    assert resp.status_code == 200
    data = resp.json()
    assert data["lexical_available"] is True
    assert data["index_status"] == "completed"
    assert data["chunk_count"] == 2


def test_search_code_api(test_client_with_db, populated_search_db):
    """Verify POST /repositories/{id}/snapshots/{id}/search."""
    repo_id = populated_search_db["repo_id"]
    snap_id = populated_search_db["snap_id"]

    payload = {
        "query": "authenticate_user",
        "mode": "lexical",
        "limit": 10,
    }
    resp = test_client_with_db.post(f"/api/v1/repositories/{repo_id}/snapshots/{snap_id}/search", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["query"] == "authenticate_user"
    assert len(data["results"]) >= 1
    assert data["results"][0]["symbol_name"] == "authenticate_user"
    assert "backend/app/services/auth.py" in data["results"][0]["citation"]


def test_get_chunk_detail_api(test_client_with_db, populated_search_db):
    """Verify GET /repositories/{id}/snapshots/{id}/chunks/{chunk_id}."""
    repo_id = populated_search_db["repo_id"]
    snap_id = populated_search_db["snap_id"]
    chunk_id = populated_search_db["chunk_id"]

    resp = test_client_with_db.get(f"/api/v1/repositories/{repo_id}/snapshots/{snap_id}/chunks/{chunk_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == chunk_id
    assert data["symbol_name"] == "authenticate_user"
    assert "check_password" in data["content"]


def test_qa_endpoint_api(test_client_with_db, populated_search_db):
    """Verify POST /repositories/{id}/snapshots/{id}/qa."""
    repo_id = populated_search_db["repo_id"]
    snap_id = populated_search_db["snap_id"]

    payload = {
        "question": "How is authentication handled in the codebase?",
        "retrieval_mode": "lexical",
    }
    resp = test_client_with_db.post(f"/api/v1/repositories/{repo_id}/snapshots/{snap_id}/qa", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "authenticate_user" in data["answer"]
    assert len(data["evidence"]) >= 1
    assert len(data["citations"]) >= 1
