"""End-to-end API integration tests for Phase 5 Architecture Governance & Codebase Health."""

import json
import pytest
from backend.app.core.config import settings


def test_architecture_and_health_api_workflow(test_client_with_db, tmp_path, monkeypatch):
    """Test full architecture analysis and codebase health API workflow."""
    allowed_root = tmp_path / "arch_repos"
    allowed_root.mkdir()
    repo_dir = allowed_root / "layered_system"
    repo_dir.mkdir()

    # Create controller, service, and db modules
    src_dir = repo_dir / "src"
    src_dir.mkdir()
    (src_dir / "__init__.py").write_text("", encoding="utf-8")

    api_dir = src_dir / "api"
    api_dir.mkdir()
    (api_dir / "__init__.py").write_text("", encoding="utf-8")
    (api_dir / "controller.py").write_text(
        "from ..infra import db\n"  # Boundary violation (presentation -> infrastructure)
        "from ..domain import service\n\n"
        "class UserController:\n"
        "    pass\n",
        encoding="utf-8",
    )

    domain_dir = src_dir / "domain"
    domain_dir.mkdir()
    (domain_dir / "__init__.py").write_text("", encoding="utf-8")
    (domain_dir / "service.py").write_text(
        "from abc import ABC, abstractmethod\n\n"
        "class BaseService(ABC):\n"
        "    @abstractmethod\n"
        "    def run(self):\n"
        "        pass\n\n"
        "class UserService(BaseService):\n"
        "    def run(self):\n"
        "        pass\n",
        encoding="utf-8",
    )

    infra_dir = src_dir / "infra"
    infra_dir.mkdir()
    (infra_dir / "__init__.py").write_text("", encoding="utf-8")
    (infra_dir / "db.py").write_text(
        "class Database:\n"
        "    pass\n",
        encoding="utf-8",
    )

    # Add codesentinel.architecture.json
    arch_policy = {
        "version": "1.0",
        "description": "3-Tier strict architecture",
        "layers": [
            {"name": "presentation", "patterns": ["src/api/**"]},
            {"name": "domain", "patterns": ["src/domain/**"]},
            {"name": "infrastructure", "patterns": ["src/infra/**"]},
        ],
        "rules": [
            {
                "id": "ARCH-LAYER-01",
                "description": "Presentation must not import Infrastructure",
                "from_layer": "presentation",
                "forbidden_to_layer": "infrastructure",
                "severity": "CRITICAL",
                "remediation": "Call domain services instead of infrastructure directly.",
            }
        ],
        "enforce_no_cycles": True,
    }
    (repo_dir / "codesentinel.architecture.json").write_text(
        json.dumps(arch_policy, indent=2),
        encoding="utf-8",
    )

    monkeypatch.setattr(settings, "LOCAL_REPOSITORY_ROOTS", str(allowed_root))

    # 1. Ingest repository
    repo_res = test_client_with_db.post(
        "/api/v1/repositories",
        json={
            "source_type": "local",
            "local_path": str(repo_dir),
            "name": "Layered Architecture Test",
        },
    )
    assert repo_res.status_code == 201
    repo_data = repo_res.json()
    repo_id = repo_data["id"]
    snapshot_id = repo_data["latest_snapshot"]["id"]

    # 2. Inspect active policy endpoint
    policy_res = test_client_with_db.get(f"/api/v1/repositories/{repo_id}/architecture/policy")
    assert policy_res.status_code == 200
    policy_data = policy_res.json()
    assert policy_data["policy_configured"] is True
    assert policy_data["policy"]["version"] == "1.0"
    assert len(policy_data["policy"]["layers"]) == 3

    # 3. Start architecture analysis
    run_res = test_client_with_db.post(
        f"/api/v1/repositories/{repo_id}/architecture",
        json={"snapshot_id": snapshot_id},
    )
    assert run_res.status_code == 201, run_res.text
    run_data = run_res.json()
    run_id = run_data["id"]
    assert run_data["status"] == "completed"
    assert run_data["modules_analyzed"] >= 3
    assert run_data["internal_edges_count"] >= 2
    assert run_data["violations_count"] == 1  # The controller -> db violation
    assert run_data["policy_configured"] is True

    # 4. List runs for repository
    list_res = test_client_with_db.get(f"/api/v1/repositories/{repo_id}/architecture")
    assert list_res.status_code == 200
    runs_list = list_res.json()
    assert runs_list["total"] >= 1
    assert runs_list["items"][0]["id"] == run_id

    # 5. Retrieve graph payload
    graph_res = test_client_with_db.get(f"/api/v1/architecture/{run_id}/graph")
    assert graph_res.status_code == 200
    graph_data = graph_res.json()
    assert len(graph_data["modules"]) >= 3
    assert len(graph_data["internal_edges"]) >= 2

    # 6. List module metrics
    mods_res = test_client_with_db.get(f"/api/v1/architecture/{run_id}/modules")
    assert mods_res.status_code == 200
    mods_data = mods_res.json()
    assert mods_data["total"] >= 3
    # Check that abstractness on domain/service.py is 0.5 (1 abstract BaseService, 1 concrete UserService)
    service_mod = next((m for m in mods_data["items"] if "service.py" in m["path"]), None)
    assert service_mod is not None
    assert service_mod["abstractness"] == 0.5

    # 7. Get module detail
    detail_res = test_client_with_db.get(f"/api/v1/architecture/{run_id}/modules/src/api/controller.py")
    assert detail_res.status_code == 200
    detail_data = detail_res.json()
    assert len(detail_data["outgoing_dependencies"]) >= 2
    assert detail_data["violations_count"] == 1

    # 8. List violations
    viol_res = test_client_with_db.get(f"/api/v1/architecture/{run_id}/violations")
    assert viol_res.status_code == 200
    viol_data = viol_res.json()
    assert viol_data["total"] == 1
    v = viol_data["items"][0]
    assert v["rule_id"] == "ARCH-LAYER-01"
    assert v["severity"] == "CRITICAL"
    assert "infra/db.py" in v["target_module"]
    assert "api/controller.py" in v["source_module"]

    # 9. Compute Codebase Health
    health_res = test_client_with_db.get(f"/api/v1/repositories/{repo_id}/health")
    assert health_res.status_code == 200
    health_data = health_res.json()
    assert health_data["repository_id"] == repo_id
    assert health_data["scoring_version"] == "1.0.0"
    # Status is unavailable/partial because Phase 2 and 3 haven't run on this fixture repo yet
    assert health_data["status"] in ("completed", "partial", "unavailable")
    assert "architectural_health" in health_data["dimensions"]
    assert health_data["dimensions"]["architectural_health"]["status"] in ("HEALTHY", "WARNING", "CRITICAL")
    # Architectural health has deduction from the 1 critical violation
    assert health_data["dimensions"]["architectural_health"]["score"] < 100.0

    # 10. List health history
    hist_res = test_client_with_db.get(f"/api/v1/repositories/{repo_id}/health/history")
    assert hist_res.status_code == 200
    hist_data = hist_res.json()
    assert hist_data["total"] >= 1
    assessment_id = hist_data["items"][0]["id"]

    # 11. Get health assessment by ID
    single_res = test_client_with_db.get(f"/api/v1/health-assessments/{assessment_id}")
    assert single_res.status_code == 200
    assert single_res.json()["id"] == assessment_id


def test_architecture_api_404_handling(test_client_with_db):
    """Verify 404 responses for non-existent entities."""
    res = test_client_with_db.get("/api/v1/architecture/non-existent-id")
    assert res.status_code == 404

    res2 = test_client_with_db.get("/api/v1/health-assessments/non-existent-id")
    assert res2.status_code == 404
