"""Tests for Phase 5 Architectural Governance and Policy Enforcement."""

import json
import pytest
from backend.app.services.architecture.graph_builder import (
    CycleInfo,
    DependencyEdge,
    ModuleGraphResult,
    ModuleNode,
)
from backend.app.services.architecture.policy_engine import (
    ArchitecturePolicy,
    ArchitecturePolicyEngine,
    LayerDefinition,
    LayerRule,
)


def test_valid_policy_parsing():
    """Verify loading a valid codesentinel.architecture.json configuration."""
    raw_config = {
        "version": "1.0",
        "description": "Standard 3-tier layering policy",
        "layers": [
            {"name": "presentation", "patterns": ["src/controllers/**", "src/views/**"]},
            {"name": "domain", "patterns": ["src/models/**", "src/services/**"]},
            {"name": "infrastructure", "patterns": ["src/db/**", "src/clients/**"]},
        ],
        "rules": [
            {
                "id": "ARCH-001",
                "description": "Presentation layer must not access Infrastructure directly",
                "from_layer": "presentation",
                "forbidden_to_layer": "infrastructure",
                "severity": "CRITICAL",
                "remediation": "Access infrastructure services via the domain layer interfaces.",
            },
            {
                "id": "ARCH-002",
                "description": "Domain layer must not depend on Presentation layer",
                "from_layer": "domain",
                "forbidden_to_layer": "presentation",
                "severity": "HIGH",
            },
        ],
        "forbidden_dependencies": [
            {
                "rule_id": "ARCH-FORBID-001",
                "from_pattern": "src/models/**",
                "to_pattern": "*crypto*",
                "description": "Models should not directly import cryptography libraries",
                "severity": "HIGH",
            }
        ],
        "enforce_no_cycles": True,
    }

    policy, err = ArchitecturePolicyEngine.load_policy(json.dumps(raw_config))
    assert err is None
    assert policy is not None
    assert policy.version == "1.0"
    assert len(policy.layers) == 3
    assert len(policy.rules) == 2
    assert len(policy.forbidden_dependencies) == 1
    assert policy.enforce_no_cycles is True


def test_invalid_policy_schema_rejection():
    """Verify invalid JSON or schema errors are safely rejected with descriptive messages."""
    # Invalid JSON syntax
    policy, err = ArchitecturePolicyEngine.load_policy("{not_json}")
    assert policy is None
    assert "Invalid JSON" in err

    # Missing layers
    policy, err = ArchitecturePolicyEngine.load_policy(json.dumps({"version": "1.0"}))
    assert policy is None
    assert "'layers' field is required" in err

    # Unknown layer in rule
    bad_rule_config = {
        "version": "1.0",
        "layers": [{"name": "ui", "patterns": ["ui/**"]}],
        "rules": [{"id": "R1", "from_layer": "unknown_layer", "forbidden_to_layer": "ui"}],
    }
    policy, err = ArchitecturePolicyEngine.load_policy(json.dumps(bad_rule_config))
    assert policy is None
    assert "references unknown from_layer 'unknown_layer'" in err


def test_layer_boundary_violation_detection():
    """Verify architectural boundary violation drafts are emitted with evidence."""
    policy_config = {
        "version": "1.0",
        "layers": [
            {"name": "presentation", "patterns": ["src/api/**"]},
            {"name": "domain", "patterns": ["src/domain/**"]},
            {"name": "infrastructure", "patterns": ["src/infra/**"]},
        ],
        "rules": [
            {
                "id": "ARCH-001",
                "description": "Presentation layer must not depend on Infrastructure directly",
                "from_layer": "presentation",
                "forbidden_to_layer": "infrastructure",
                "severity": "CRITICAL",
                "remediation": "Route calls through the domain layer.",
            }
        ],
    }
    policy, _ = ArchitecturePolicyEngine.load_policy(json.dumps(policy_config))

    graph = ModuleGraphResult(
        modules={
            "src/api/user_controller.py": ModuleNode(path="src/api/user_controller.py", language="python"),
            "src/infra/database.py": ModuleNode(path="src/infra/database.py", language="python"),
            "src/domain/user_service.py": ModuleNode(path="src/domain/user_service.py", language="python"),
        },
        internal_edges=[
            # Violation: presentation -> infrastructure
            DependencyEdge(
                source_path="src/api/user_controller.py",
                target_path="src/infra/database.py",
                specifier="database",
                line_number=5,
            ),
            # Allowed: presentation -> domain
            DependencyEdge(
                source_path="src/api/user_controller.py",
                target_path="src/domain/user_service.py",
                specifier="user_service",
                line_number=6,
            ),
        ],
    )

    violations = ArchitecturePolicyEngine.evaluate_governance(graph, policy)
    assert len(violations) == 1
    v = violations[0]
    assert v.rule_id == "ARCH-001"
    assert v.source_module == "src/api/user_controller.py"
    assert v.target_module == "src/infra/database.py"
    assert v.line_number == 5
    assert v.violated_boundary == "presentation -> infrastructure"
    assert v.severity == "CRITICAL"
    assert v.remediation == "Route calls through the domain layer."
    assert len(v.fingerprint) == 64


def test_forbidden_dependency_and_cycle_rules():
    """Verify direct forbidden pattern and cycle rules emit accurate violation drafts."""
    policy_config = {
        "version": "1.0",
        "layers": [{"name": "app", "patterns": ["**"]}],
        "rules": [],
        "forbidden_dependencies": [
            {
                "rule_id": "ARCH-FORBID-RAW-SQL",
                "from_pattern": "src/api/**",
                "to_pattern": "*psycopg2*",
                "description": "Controllers must not use raw DB driver",
                "severity": "HIGH",
            }
        ],
        "enforce_no_cycles": True,
    }
    policy, _ = ArchitecturePolicyEngine.load_policy(json.dumps(policy_config))

    graph = ModuleGraphResult(
        modules={
            "src/api/handler.py": ModuleNode(path="src/api/handler.py", language="python"),
            "src/cycle_a.py": ModuleNode(path="src/cycle_a.py", language="python"),
            "src/cycle_b.py": ModuleNode(path="src/cycle_b.py", language="python"),
        },
        external_edges=[
            DependencyEdge(
                source_path="src/api/handler.py",
                target_path="psycopg2",
                specifier="psycopg2",
                line_number=2,
                is_external=True,
            )
        ],
        cycles=[
            CycleInfo(id="CYCLE-1", modules=["src/cycle_a.py", "src/cycle_b.py"], length=2)
        ],
    )

    violations = ArchitecturePolicyEngine.evaluate_governance(graph, policy)
    rule_ids = {v.rule_id for v in violations}
    assert "ARCH-FORBID-RAW-SQL" in rule_ids
    assert "ARCH-CYCLE-DETECTED" in rule_ids


def test_no_configured_policy_fabricates_no_violations():
    """Verify that when no policy is supplied, zero violations are fabricated."""
    graph = ModuleGraphResult(
        modules={"a.py": ModuleNode(path="a.py", language="python")},
        internal_edges=[DependencyEdge(source_path="a.py", target_path="b.py", specifier="b")],
    )
    violations = ArchitecturePolicyEngine.evaluate_governance(graph, None)
    assert violations == []
