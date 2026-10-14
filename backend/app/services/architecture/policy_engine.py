"""Architectural Policy and Governance Engine for CodeSentinel AI.

Validates architecture configuration files (codesentinel.architecture.json),
maps codebase modules to architectural layers, evaluates layer boundary rules,
forbidden dependency patterns, and cycle constraints, and emits evidence-backed violations.
"""

from dataclasses import dataclass, field
import fnmatch
import hashlib
import json
from typing import Any, Dict, List, Optional, Set, Tuple

from backend.app.services.architecture.graph_builder import ModuleGraphResult, DependencyEdge, CycleInfo


@dataclass
class ArchitectureViolationDraft:
    """Draft representation of an architectural boundary violation."""

    rule_id: str
    policy_id: str
    source_module: str
    target_module: str
    edge_specifier: str
    line_number: int
    violated_boundary: str
    description: str
    remediation: str
    severity: str = "HIGH"
    confidence: str = "HIGH"
    fingerprint: str = ""
    metadata_json: Dict[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        if not self.fingerprint:
            raw = f"{self.rule_id}:{self.source_module}:{self.target_module}:{self.violated_boundary}"
            self.fingerprint = hashlib.sha256(raw.encode("utf-8")).hexdigest()


@dataclass
class LayerDefinition:
    """Architectural layer definition."""

    name: str
    patterns: List[str]


@dataclass
class LayerRule:
    """Constraint on dependencies between layers."""

    id: str
    description: str
    from_layer: str
    forbidden_to_layer: Optional[str] = None
    allowed_to_layers: Optional[List[str]] = None
    severity: str = "HIGH"
    remediation: str = ""


@dataclass
class ForbiddenPatternRule:
    """Direct pattern-to-pattern forbidden dependency rule."""

    id: str
    from_pattern: str
    to_pattern: str
    description: str
    severity: str = "CRITICAL"
    remediation: str = ""


@dataclass
class ArchitecturePolicy:
    """Validated architecture policy configuration."""

    version: str = "1.0"
    description: str = ""
    layers: List[LayerDefinition] = field(default_factory=list)
    rules: List[LayerRule] = field(default_factory=list)
    forbidden_dependencies: List[ForbiddenPatternRule] = field(default_factory=list)
    disallow_cycles: bool = False
    max_instability: Optional[float] = None
    policy_path: str = "codesentinel.architecture.json"

    @property
    def enforce_no_cycles(self) -> bool:
        return self.disallow_cycles


class ArchitecturePolicyEngine:
    """Evaluates module dependency graphs against architectural governance policies."""

    @classmethod
    def parse_policy(cls, config_content: str, policy_path: str = "codesentinel.architecture.json") -> Tuple[Optional[ArchitecturePolicy], Optional[str]]:
        """Safely parse and validate an architectural policy JSON configuration string.

        Returns (policy, error_message).
        """
        try:
            data = json.loads(config_content)
        except json.JSONDecodeError as exc:
            return None, f"Invalid JSON in architecture policy: {exc.msg} (line {exc.lineno})"
        except Exception as exc:
            return None, f"Failed to parse architecture policy: {exc}"

        if not isinstance(data, dict):
            return None, "Architecture policy root must be a JSON object"

        version = str(data.get("version", "1.0"))
        description = str(data.get("description", ""))

        # Parse layers
        layers: List[LayerDefinition] = []
        if "layers" not in data or not isinstance(data["layers"], list):
            return None, "'layers' field is required and must be a list of layer definitions"
        raw_layers = data["layers"]

        for idx, l in enumerate(raw_layers):
            if not isinstance(l, dict) or not l.get("name"):
                return None, f"Layer item at index {idx} must be an object with a 'name'"
            name = str(l["name"]).strip()
            patterns = l.get("patterns", [])
            if not isinstance(patterns, list) or not all(isinstance(p, str) for p in patterns):
                return None, f"Layer '{name}' patterns must be a list of string patterns"
            layers.append(LayerDefinition(name=name, patterns=patterns))

        # Parse rules
        rules: List[LayerRule] = []
        raw_rules = data.get("rules", [])
        if not isinstance(raw_rules, list):
            return None, "'rules' field must be a list of rule definitions"

        layer_names = {l.name for l in layers}

        for idx, r in enumerate(raw_rules):
            if not isinstance(r, dict) or not r.get("id"):
                return None, f"Rule at index {idx} must be an object with an 'id'"
            rule_id = str(r["id"]).strip()
            from_layer = str(r.get("from_layer", "")).strip()
            if from_layer and from_layer not in layer_names:
                return None, f"Rule '{rule_id}' references unknown from_layer '{from_layer}'"

            forbidden_to = r.get("forbidden_to_layer")
            if forbidden_to and forbidden_to not in layer_names:
                return None, f"Rule '{rule_id}' references unknown forbidden_to_layer '{forbidden_to}'"

            allowed_to = r.get("allowed_to_layers")
            if allowed_to is not None and not isinstance(allowed_to, list):
                return None, f"Rule '{rule_id}' allowed_to_layers must be a list"

            rules.append(
                LayerRule(
                    id=rule_id,
                    description=str(r.get("description", f"Layer rule {rule_id}")),
                    from_layer=from_layer,
                    forbidden_to_layer=forbidden_to,
                    allowed_to_layers=allowed_to,
                    severity=str(r.get("severity", "HIGH")).upper(),
                    remediation=str(r.get("remediation", "")),
                )
            )

        # Parse forbidden dependencies
        forbidden_deps: List[ForbiddenPatternRule] = []
        raw_forbidden = data.get("forbidden_dependencies", [])
        if isinstance(raw_forbidden, list):
            for idx, fb in enumerate(raw_forbidden):
                if isinstance(fb, dict) and fb.get("from_pattern") and fb.get("to_pattern"):
                    fb_id = str(fb.get("rule_id", f"FORBIDDEN-{idx+1}"))
                    forbidden_deps.append(
                        ForbiddenPatternRule(
                            id=fb_id,
                            from_pattern=fb["from_pattern"],
                            to_pattern=fb["to_pattern"],
                            description=str(fb.get("description", f"Forbidden dependency from {fb['from_pattern']} to {fb['to_pattern']}")),
                            severity=str(fb.get("severity", "CRITICAL")).upper(),
                            remediation=str(fb.get("remediation", f"Remove direct dependency from {fb['from_pattern']} to {fb['to_pattern']}")),
                        )
                    )

        disallow_cycles = bool(data.get("disallow_cycles") or data.get("enforce_no_cycles", False))
        max_instability = data.get("max_instability")
        if max_instability is not None:
            try:
                max_instability = float(max_instability)
            except (ValueError, TypeError):
                max_instability = None

        policy = ArchitecturePolicy(
            version=version,
            description=description,
            layers=layers,
            rules=rules,
            forbidden_dependencies=forbidden_deps,
            disallow_cycles=disallow_cycles,
            max_instability=max_instability,
            policy_path=policy_path,
        )
        return policy, None

    @classmethod
    def match_layer(cls, path: str, layers: List[LayerDefinition]) -> Optional[str]:
        """Determine which architectural layer a module belongs to based on pattern matching."""
        normalized = path.replace("\\", "/").lstrip("./")
        for layer in layers:
            for pattern in layer.patterns:
                clean_pat = pattern.replace("\\", "/").lstrip("./")
                if fnmatch.fnmatch(normalized, clean_pat) or fnmatch.fnmatch(normalized, f"*/{clean_pat}"):
                    return layer.name
        return None

    @classmethod
    def evaluate_governance(
        cls,
        graph: ModuleGraphResult,
        policy: Optional[ArchitecturePolicy],
    ) -> List[ArchitectureViolationDraft]:
        """Evaluate a module dependency graph against an architecture policy.

        Emits deterministic violations. If policy is None, returns empty list.
        """
        if not policy:
            return []

        violations: List[ArchitectureViolationDraft] = []
        seen_fingerprints: Set[str] = set()

        # Cache module layer assignments
        module_layers: Dict[str, Optional[str]] = {}
        for path in graph.modules.keys():
            module_layers[path] = cls.match_layer(path, policy.layers)

        # 1. Evaluate internal dependency edges
        for edge in graph.internal_edges:
            src_layer = module_layers.get(edge.source_path)
            tgt_layer = module_layers.get(edge.target_path)

            # Check layer rules if both modules have assigned layers
            if src_layer and tgt_layer and src_layer != tgt_layer:
                for rule in policy.rules:
                    if rule.from_layer == src_layer:
                        # Case A: Explicit forbidden_to_layer
                        if rule.forbidden_to_layer and rule.forbidden_to_layer == tgt_layer:
                            boundary = f"{src_layer} -> {tgt_layer}"
                            remediation = rule.remediation or f"Refactor '{edge.source_path}' to avoid direct dependency on '{tgt_layer}' layer."
                            draft = ArchitectureViolationDraft(
                                rule_id=rule.id,
                                policy_id=policy.policy_path,
                                source_module=edge.source_path,
                                target_module=edge.target_path,
                                edge_specifier=edge.specifier,
                                line_number=edge.line_number,
                                violated_boundary=boundary,
                                description=f"Layer boundary violation: {rule.description} ({boundary})",
                                remediation=remediation,
                                severity=rule.severity,
                                confidence="HIGH",
                                metadata_json={
                                    "from_layer": src_layer,
                                    "to_layer": tgt_layer,
                                    "rule_type": "layer_forbidden",
                                },
                            )
                            if draft.fingerprint not in seen_fingerprints:
                                seen_fingerprints.add(draft.fingerprint)
                                violations.append(draft)

                        # Case B: Allowed_to_layers constraint
                        if rule.allowed_to_layers is not None:
                            if tgt_layer not in rule.allowed_to_layers:
                                boundary = f"{src_layer} -> {tgt_layer}"
                                remediation = rule.remediation or f"Dependencies from '{src_layer}' are only allowed to {rule.allowed_to_layers}."
                                draft = ArchitectureViolationDraft(
                                    rule_id=rule.id,
                                    policy_id=policy.policy_path,
                                    source_module=edge.source_path,
                                    target_module=edge.target_path,
                                    edge_specifier=edge.specifier,
                                    line_number=edge.line_number,
                                    violated_boundary=boundary,
                                    description=f"Layer boundary violation: {rule.description} (Target layer '{tgt_layer}' is not in allowed layers)",
                                    remediation=remediation,
                                    severity=rule.severity,
                                    confidence="HIGH",
                                    metadata_json={
                                        "from_layer": src_layer,
                                        "to_layer": tgt_layer,
                                        "rule_type": "allowed_layers_mismatch",
                                    },
                                )
                                if draft.fingerprint not in seen_fingerprints:
                                    seen_fingerprints.add(draft.fingerprint)
                                    violations.append(draft)

        # 2. Evaluate direct pattern-to-pattern forbidden dependencies on all edges (internal + external)
        all_edges = list(graph.internal_edges) + list(graph.external_edges)
        for edge in all_edges:
            for fb in policy.forbidden_dependencies:
                src_match = fnmatch.fnmatch(edge.source_path, fb.from_pattern) or fnmatch.fnmatch(edge.source_path, f"*/{fb.from_pattern}")
                tgt_match = fnmatch.fnmatch(edge.target_path, fb.to_pattern) or fnmatch.fnmatch(edge.target_path, f"*/{fb.to_pattern}")
                if src_match and tgt_match:
                    boundary = f"{fb.from_pattern} -> {fb.to_pattern}"
                    draft = ArchitectureViolationDraft(
                        rule_id=fb.id,
                        policy_id=policy.policy_path,
                        source_module=edge.source_path,
                        target_module=edge.target_path,
                        edge_specifier=edge.specifier,
                        line_number=edge.line_number,
                        violated_boundary=boundary,
                        description=f"Forbidden dependency: {fb.description}",
                        remediation=fb.remediation,
                        severity=fb.severity,
                        confidence="HIGH",
                        metadata_json={
                            "from_pattern": fb.from_pattern,
                            "to_pattern": fb.to_pattern,
                            "rule_type": "forbidden_pattern",
                        },
                    )
                    if draft.fingerprint not in seen_fingerprints:
                        seen_fingerprints.add(draft.fingerprint)
                        violations.append(draft)


        # 3. Evaluate cycle enforcement if policy forbids cycles
        if policy.disallow_cycles:
            for cycle in graph.cycles:
                cycle_str = " -> ".join(cycle.modules)
                first_module = cycle.modules[0]
                second_module = cycle.modules[1] if len(cycle.modules) > 1 else first_module
                draft = ArchitectureViolationDraft(
                    rule_id="ARCH-CYCLE-DETECTED",
                    policy_id=policy.policy_path,
                    source_module=first_module,
                    target_module=second_module,
                    edge_specifier=second_module,
                    line_number=1,
                    violated_boundary="cyclic_dependency",
                    description=f"Dependency cycle forbidden by policy: {cycle_str}",
                    remediation="Break the dependency cycle by extracting shared interfaces or using dependency inversion.",
                    severity="HIGH",
                    confidence="HIGH",
                    metadata_json={
                        "cycle_id": cycle.id,
                        "cycle_length": cycle.length,
                        "cycle_modules": cycle.modules,
                        "rule_type": "cycle_disallowed",
                    },
                )
                if draft.fingerprint not in seen_fingerprints:
                    seen_fingerprints.add(draft.fingerprint)
                    violations.append(draft)

        # Deterministic sorting of violations
        violations.sort(key=lambda v: (v.severity, v.rule_id, v.source_module, v.target_module))
        return violations


# Backward-compatible alias
ArchitecturePolicyEngine.load_policy = ArchitecturePolicyEngine.parse_policy

