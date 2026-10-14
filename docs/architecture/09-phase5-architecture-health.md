# Phase 5 Architecture: Architectural Governance, Dependency Coupling & Codebase Health Intelligence

## 1. Overview & Core Philosophy

**Phase 5** adds two complementary analytical engines to **CodeSentinel AI**:
1. **Architectural Intelligence & Governance Engine**: Deterministically resolves source-level import relationships into a module dependency graph, computes Robert C. Martin's package coupling metrics ($Ca, Ce, I, A, D$), isolates circular dependency clusters via Tarjan's Strongly Connected Components algorithm, and enforces layer boundaries and forbidden dependency rules declared in `codesentinel.architecture.json`.
2. **Codebase Health Scoring Engine**: Synthesizes static maintainability metrics, application security findings, architectural modularity, software composition analysis (SCA), and test/parsing coverage into an explainable 0–100 health index with proportional dynamic weight renormalization and ranked actionable remediation steps.

### Non-Negotiable Tenets:
- **Zero Untrusted Execution**: Source code is parsed strictly through AST visitors (`PythonParser`, `JsTsParser`) without executing code, compiling packages, or installing runtime dependencies.
- **Deterministic Resolution**: Module edge targets are resolved via normalized relative filesystem paths and standard package identification, producing stable graphs and SHA-256 violation fingerprints across repeated runs.
- **Explainable Metrics**: No opaque machine-learning scores or synthetic claims. Every score deduction and metric is directly traceable to concrete source coordinates, coupling ratios, or security findings.
- **Graceful Partial Scoring**: When certain analysis phases have not yet run, the health engine dynamically recalculates overall health via weight renormalization across available dimensions, flagging missing inputs transparently.

---

## 2. Module Dependency Graph Engine

### 2.1 Parsing & Import Extraction
The graph builder operates on snapshots persisted in the database, reading file contents safely via `SourceInputProvider`.
- **Python**: Traverses `ast.Import` and `ast.ImportFrom`. Extracts module names, resolves relative imports (`.`, `..`) based on the source file's directory within the snapshot, and distinguishes between internal repository files and standard library/third-party packages.
- **JavaScript / TypeScript**: Traverses `import ... from '...'`, `export ... from '...'`, `require('...')`, and dynamic `import('...')`. Resolves extension-less specifiers (`.ts`, `.tsx`, `.js`, `.jsx`, `/index.ts`, etc.) to actual repository files.

### 2.2 Classification of Dependency Edges
Every import is classified into one of three categories:
1. **Internal Edges**: The target specifier resolves to an existing file in the snapshot.
2. **External Dependencies**: The specifier points to a standard library module (e.g. `sys`, `os`, `fs`, `path`) or an external package (e.g. `fastapi`, `react`, `pydantic`).
3. **Unresolved Imports**: The specifier appears to be a local relative path but could not be located in the snapshot (broken imports or dynamic paths).

---

## 3. Martin's Package Coupling & Distance Metrics

For every module $M$ in the repository, the engine computes Robert C. Martin's modular coupling metrics:

| Metric | Symbol | Definition | Range |
| :--- | :---: | :--- | :---: |
| **Afferent Coupling** | $Ca$ | Number of internal modules that depend on $M$ (incoming edges). | $[0, \infty)$ |
| **Efferent Coupling** | $Ce$ | Number of internal modules that $M$ depends upon (outgoing edges). | $[0, \infty)$ |
| **Instability** | $I$ | Ratio of outgoing coupling to total coupling: $$I = \frac{Ce}{Ca + Ce}$$ If $Ca + Ce = 0$, $I = 0.0$. | $[0.0, 1.0]$ |
| **Abstractness** | $A$ | Ratio of abstract types/classes (e.g., classes inheriting from `ABC` or protocols) to total classes: $$A = \frac{N_a}{N_c}$$ If $N_c = 0$, $A = 0.0$. | $[0.0, 1.0]$ |
| **Distance to Main Sequence** | $D$ | Normalized distance from the idealized balance line $A + I = 1$: $$D = |A + I - 1|$$ | $[0.0, 1.0]$ |

### Interpretation:
- $D \approx 0.0$: Ideal architectural balance between abstractness and stability.
- $D > 0.5$ (near $(A=0, I=0)$): **Zone of Pain** — Highly stable, concrete, and difficult to modify without breaking dependents.
- $D > 0.5$ (near $(A=1, I=1)$): **Zone of Uselessness** — Highly abstract with no dependents, indicating over-engineering or dead abstractions.

---

## 4. Cycle Detection via Tarjan's SCC Algorithm

Cycles represent mutual tight coupling that prevents independent testing, refactoring, and modular deployment.
The graph builder implements **Tarjan's Strongly Connected Components (SCC)** algorithm:
- Finds all maximal subgraphs where every vertex is reachable from every other vertex.
- Filters components to those with $|SCC| > 1$, or $|SCC| == 1$ with a direct self-loop ($M \to M$).
- Flags `is_in_cycle = True` on every participating module node.
- Reports cycle length, module paths in traversal order, and a stable identifier for visualization.

---

## 5. Architectural Governance Engine

The engine reads `codesentinel.architecture.json` from the repository root (or defaults to standard baseline rules if omitted).

### 5.1 Configuration Schema
```json
{
  "version": "1.0",
  "layers": {
    "domain": {
      "patterns": ["app/domain/**", "src/domain/**"],
      "can_import": []
    },
    "application": {
      "patterns": ["app/services/**", "src/services/**"],
      "can_import": ["domain"]
    },
    "infrastructure": {
      "patterns": ["app/infra/**", "app/database/**"],
      "can_import": ["domain", "application"]
    },
    "presentation": {
      "patterns": ["app/api/**", "src/controllers/**"],
      "can_import": ["application", "domain"]
    }
  },
  "forbidden_dependencies": [
    {
      "from": "app/api/**",
      "to": "*psycopg2*",
      "reason": "API layer cannot directly query PostgreSQL database drivers. Use repository layer.",
      "severity": "CRITICAL"
    }
  ],
  "allow_cycles": false
}
```

### 5.2 Deterministic Violation Reporting
When an import edge violates the policy:
1. **Layer Boundary Violation**: Source module belongs to layer $L_1$, target module belongs to layer $L_2$, but $L_2 \notin L_1.\text{can\_import}$.
2. **Forbidden Dependency Violation**: Source module matches `from` glob and target edge matches `to` glob (evaluated against both internal files and external packages).
3. **Circular Dependency Violation**: `allow_cycles = false` and cycle detected.

Every violation records:
- `rule_id`, `severity` (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `INFO`), `violated_boundary`
- `source_module`, `target_module`, `line_number`
- `description`, `remediation`
- `fingerprint`: Deterministic SHA-256 hash `sha256(rule_id:source:target:boundary)`

---

## 6. Deterministic Codebase Health Engine

The Codebase Health Engine evaluates code across **5 core pillars**, producing a score from 0 to 100:

| Pillar | Base Weight | Inputs | Key Deductions |
| :--- | :---: | :--- | :--- |
| **Maintainability** | 25% | Phase 2 Static Analysis | Syntax errors (-20 pts), cyclomatic complexity $>15$ (-5 pts), high cognitive complexity, oversized functions. |
| **Application Security** | 25% | Phase 4 Security Intelligence | Critical findings (-25 pts), High findings (-15 pts), Medium findings (-5 pts). Scaled by confidence. |
| **Architecture & Modularity** | 20% | Phase 5 Dependency Graph & Policy | Cycles (-10 pts each), Layer violations (-15 pts Critical, -10 pts High), Main Sequence Distance $D > 0.6$. |
| **Dependency Risk** | 15% | Phase 3 Software Composition Analysis | Critical CVEs (-25 pts), High CVEs (-15 pts), Medium CVEs (-5 pts). |
| **Analysis Coverage** | 15% | Snapshot Ingestion | Ratio of parsed source files to total discoverable source files. |

### Dynamic Weight Normalization
If inputs for optional dimensions (e.g. Dependencies or Architecture) are unavailable:
$$\text{Overall Score} = \frac{\sum_{d \in \text{Available}} S_d \times W_d}{\sum_{d \in \text{Available}} W_d}$$
- If **both** Maintainability and Security analyses are missing, overall health status is marked `"unavailable"` with `overall_score = null`, preventing misleading synthetic scores.
- Status is classified as:
  - $\ge 85$: **Excellent Health** (Healthy)
  - $70 - 84$: **Good Health** (Healthy)
  - $50 - 69$: **Needs Improvement** (Warning)
  - $< 50$: **Critical Risk** (Critical)

---

## 7. Database Schema & Migration

### Migration: `0006_phase5_architecture_health.py`
Three new tables added with proper composite indexes and foreign keys:

1. **`architecture_runs`**:
   - `id` (`VARCHAR(36)`, PK), `repository_id`, `snapshot_id`, `status`
   - `started_at`, `completed_at`, `modules_analyzed`, `internal_edges_count`, `external_deps_count`, `unresolved_count`, `cycles_count`, `violations_count`
   - `policy_configured`, `policy_path`, `failure_code`, `failure_reason`, `summary_json`
   - Indexes: `ix_arch_runs_repo_snap`, `ix_arch_runs_status`

2. **`architecture_violations`**:
   - `id` (`VARCHAR(36)`, PK), `architecture_run_id`, `repository_id`, `snapshot_id`
   - `rule_id`, `policy_id`, `source_module`, `target_module`, `edge_specifier`, `line_number`, `violated_boundary`
   - `description`, `remediation`, `severity`, `confidence`, `fingerprint`, `metadata_json`, `created_at`
   - Indexes: `ix_arch_viols_run_id`, `ix_arch_viols_sev`, `ix_arch_viols_source`, `ix_arch_viols_fp`

3. **`codebase_health_assessments`**:
   - `id` (`VARCHAR(36)`, PK), `repository_id`, `snapshot_id`
   - `scoring_version`, `overall_score`, `status`, `dimensions_json`, `contributing_runs_json`, `missing_inputs_json`, `recommendations_json`, `assessed_at`
   - Indexes: `ix_health_repo_snap`, `ix_health_assessed_at`

---

## 8. REST API Endpoints

### 8.1 Architecture Governance
- `POST /api/v1/repositories/{repository_id}/architecture`: Trigger module graph extraction & policy check.
- `GET /api/v1/repositories/{repository_id}/architecture`: List historical architecture runs.
- `GET /api/v1/repositories/{repository_id}/architecture/policy`: Check active policy file and layer rules.
- `GET /api/v1/architecture/{run_id}`: Retrieve summary and metrics for an architecture run.
- `GET /api/v1/architecture/{run_id}/graph`: Retrieve complete module dependency graph payload.
- `GET /api/v1/architecture/{run_id}/modules`: Paginated module coupling metrics ($Ca, Ce, I, A, D$).
- `GET /api/v1/architecture/{run_id}/modules/{module_path}`: Detailed module inspection (dependencies, cycles, violations).
- `GET /api/v1/architecture/{run_id}/violations`: Paginated governance violations with severity filtering.

### 8.2 Codebase Health Index
- `GET /api/v1/repositories/{repository_id}/health`: Compute or retrieve latest codebase health assessment.
- `GET /api/v1/repositories/{repository_id}/health/history`: Paginated historical health assessments.
- `GET /api/v1/health-assessments/{assessment_id}`: Retrieve a specific health assessment by ID.

---

## 9. Verification & Test Coverage

- **Backend**: 159 tests passing (`pytest backend/tests`), covering:
  - `test_dependency_graph.py`: Graph extraction, coupling metrics, Tarjan's SCC cycles.
  - `test_architecture_policy.py`: Layer boundary rules, forbidden dependency checks, cycle flags.
  - `test_codebase_health.py`: 5-dimension scoring, weight renormalization, missing inputs handling.
  - `test_architecture_api.py`: Full REST lifecycle and schema serialization.
- **Frontend**: 42 tests passing across 12 test suites (`npm test -- --run`).
- **Production Build**: 0 errors on `npm run build` (`tsc -b && vite build`).
