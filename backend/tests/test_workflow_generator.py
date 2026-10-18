"""Tests for Phase 8 CI/CD Workflow Generator."""

import pytest
import yaml

from backend.app.schemas.cicd import WorkflowGenerateRequest
from backend.app.services.cicd.workflow_generator import (
    PINNED_ACTIONS,
    WorkflowGenerator,
    sanitize_input,
)


def test_detect_ecosystem_python():
    files = ["src/main.py", "requirements.txt", "README.md"]
    assert WorkflowGenerator.detect_ecosystem(files) == "python"


def test_detect_ecosystem_node():
    files = ["src/index.ts", "package.json", "package-lock.json"]
    assert WorkflowGenerator.detect_ecosystem(files) == "node"


def test_detect_ecosystem_mixed():
    files = ["backend/main.py", "backend/requirements.txt", "frontend/package.json", "frontend/src/App.tsx"]
    assert WorkflowGenerator.detect_ecosystem(files) == "mixed"


def test_detect_ecosystem_generic():
    files = ["docs/guide.md", "LICENSE"]
    assert WorkflowGenerator.detect_ecosystem(files) == "generic"


def test_workflow_generation_python():
    req = WorkflowGenerateRequest(
        repository_id="test-repo",
        ecosystem="python",
        include_lint=True,
        include_test=True,
        include_typecheck=True,
        include_security_audit=True,
        include_artifact_upload=True,
        python_version="3.12",
        workflow_name="Python Audit CI",
        trigger_branches=["main", "release"],
    )
    resp = WorkflowGenerator.generate(req)
    assert resp.filename == ".github/workflows/codesentinel-ci.yml"
    assert resp.ecosystem_detected == "python"
    assert resp.permissions_summary == {"contents": "read"}
    assert len(resp.security_warnings) >= 3

    # Parse generated YAML
    parsed = yaml.safe_load(resp.yaml_content)
    assert parsed["name"] == "Python Audit CI"
    assert "push" in parsed["on"]
    assert "main" in parsed["on"]["push"]["branches"]
    assert "release" in parsed["on"]["push"]["branches"]
    assert parsed["permissions"] == {"contents": "read"}
    assert parsed["concurrency"]["cancel-in-progress"] is True

    # Verify pinned action SHAs
    assert PINNED_ACTIONS["checkout"] in resp.yaml_content
    assert PINNED_ACTIONS["setup_python"] in resp.yaml_content
    assert PINNED_ACTIONS["upload_artifact"] in resp.yaml_content


def test_workflow_generation_node():
    req = WorkflowGenerateRequest(
        repository_id="test-repo",
        ecosystem="node",
        include_lint=True,
        include_test=True,
        include_typecheck=True,
        include_build=True,
        node_version="20",
    )
    resp = WorkflowGenerator.generate(req)
    assert resp.ecosystem_detected == "node"
    assert "actions/setup-node" in resp.yaml_content
    assert "npm run build" in resp.yaml_content

    parsed = yaml.safe_load(resp.yaml_content)
    assert parsed["permissions"] == {"contents": "read"}


def test_workflow_generation_mixed():
    req = WorkflowGenerateRequest(
        repository_id="test-repo",
        ecosystem="mixed",
        include_lint=True,
        include_test=True,
    )
    resp = WorkflowGenerator.generate(req)
    assert resp.ecosystem_detected == "mixed"
    assert "actions/setup-python" in resp.yaml_content
    assert "actions/setup-node" in resp.yaml_content


def test_sanitize_input_safe():
    assert sanitize_input("main", "branch") == "main"
    assert sanitize_input("  v1.0  ", "tag") == "v1.0"


def test_sanitize_input_rejects_injection():
    with pytest.raises(ValueError, match="Unsafe characters detected"):
        sanitize_input("main; rm -rf /", "branch")

    with pytest.raises(ValueError, match="Unsafe characters detected"):
        sanitize_input("main\necho injection", "branch")

    with pytest.raises(ValueError, match="Unsafe characters detected"):
        sanitize_input("$(whoami)", "branch")

    with pytest.raises(ValueError, match="Unsafe characters detected"):
        sanitize_input("main | cat", "branch")
