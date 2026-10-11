# Phase 2: Deterministic Static Code Analysis & Evidence-Backed Findings

> **CodeSentinel AI Architecture & Implementation Reference — Phase 2**

---

## 1. Overview & Objective

Phase 2 introduces a deterministic, explainable static code analysis engine to CodeSentinel AI. Building on the ingested repository snapshots from Phase 1, the engine inspects source code via Abstract Syntax Tree (AST) analysis, evaluates a versioned ruleset, calculates exact source coordinates (lines and columns), records concise evidence, and persists typed findings with cryptographically stable fingerprints.

Strict architecture rule: **Zero AI / LLM Fabrications & Zero Code Execution**. The static analysis pipeline relies strictly on deterministic AST parsing and static rules. Source code is never executed, imported, or transmitted outside the local secure boundary.

---

## 2. Analysis Pipeline Architecture

```
Target Repository & Validated Snapshot ID
               ↓
    Source Input Provider
    (Enforces size limits, relative path sanitization, and SHA-256 integrity)
               ↓
      Language Parser Registry
      ├─ Python AST Parser (stdlib ast)
      └─ JS/TS AST Adapter (Node.js + TypeScript compiler API ts.createSourceFile)
               ↓
     Diagnostic & Unit Extraction
     (Parse diagnostics, function boundary spans, McCabe complexity, import statements)
               ↓
        Deterministic Rule Engine
     (PY-SYNTAX-001, PY-COMPLEXITY-001, PY-FUNCTION-001, PY-IMPORT-001,
      JS-SYNTAX-001, JS-FUNCTION-001, JS-COMPLEXITY-001)
               ↓
   Finding Normalization & Validation
   (Clamps line/column numbers, sanitizes messages, computes SHA-256 fingerprint)
               ↓
  Transactional Database Persistence
  (AnalysisRun lifecycle: PENDING → RUNNING → COMPLETED / FAILED, AnalysisFinding batch)
               ↓
  REST APIs (/api/v1/repositories/{id}/analyses, /api/v1/analyses/{id}/findings)
               ↓
  Frontend Dashboard & Interactive Inspection
```

---

## 3. Supported Languages & Parser Implementations

| Language | Extensions | Parser Technology | Capabilities |
| :--- | :--- | :--- | :--- |
| **Python** | `.py` | Python 3.12 stdlib `ast.parse` | Syntax error line/col detection, AST function definition traversal, McCabe cyclomatic complexity calculation, AST import inspection. |
| **JavaScript** | `.js`, `.jsx`, `.mjs`, `.cjs` | Node.js subprocess invoking TypeScript compiler API (`ts.createSourceFile`) | Accurate syntax diagnostics, function declaration/expression spans, AST-based cyclomatic complexity. |
| **TypeScript** | `.ts`, `.tsx`, `.mts`, `.cts` | TypeScript compiler API (`ts.ScriptTarget.Latest`, `ts.ScriptKind.TSX`) | Full TypeScript & TSX parsing, syntax error coordinates, complexity calculation. |

### Per-File Status Distinctions:
- **Successfully Parsed**: Valid syntax, AST generated, functions and imports extracted.
- **Syntax Invalid**: Parser error caught; syntax rule emits a `SYNTAX` finding with line/column coordinates.
- **Unsupported Language**: Files outside Python/JS/TS/TSX are cleanly ignored without failing the run.
- **Skipped Due to Limits**: Files exceeding `MAX_ANALYSIS_FILE_BYTES` (1 MB) or total run exceeding `MAX_ANALYSIS_TOTAL_BYTES` (50 MB) or total count exceeding `MAX_ANALYSIS_FILES` (1,000) are safely skipped and logged.
- **Unavailable / Unreadable Source**: Missing file or decode failure handled gracefully without crashing.

---

## 4. Deterministic Rule Registry (Version 1.0.0)

Every rule implements the base interface, emits deterministic findings, and generates a SHA-256 fingerprint:
`sha256(rule_id:file_path:start_line:evidence_summary)`

| Rule ID | Rule Name | Language | Category | Default Severity | Threshold / Detection Criteria | Evidence Example |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **PY-SYNTAX-001** | Python Syntax Error | Python | `SYNTAX` | `HIGH` | Raised when `ast.parse()` throws `SyntaxError`. Extracts line and column from the parser error. | `SyntaxError: invalid syntax (line 5, col 12)` |
| **PY-COMPLEXITY-001** | High Cyclomatic Complexity | Python | `COMPLEXITY` | `MEDIUM` | Calculates McCabe complexity via AST decision nodes (`if`, `elif`, `for`, `while`, `and`, `or`, `except`, `with`, `comprehensions`). Triggered when complexity > 10. | `Function 'calculate_stats' has cyclomatic complexity of 14 (threshold: 10)` |
| **PY-FUNCTION-001** | Excessively Long Function | Python | `MAINTAINABILITY` | `LOW` | Counts body line span (`end_lineno - lineno + 1`). Triggered when function span > 50 lines. | `Function 'process_data' is 68 lines long (threshold: 50)` |
| **PY-IMPORT-001** | Repeated Import Statement | Python | `CODE_SMELL` | `LOW` | Detects redundant identical module/symbol imports within the same file scope. | `Duplicate import of module 'math' (first imported on line 2)` |
| **JS-SYNTAX-001** | JavaScript/TypeScript Syntax Error | JS/TS/TSX | `SYNTAX` | `HIGH` | Emitted when TypeScript compiler reports parse diagnostics (syntax errors). | `TS Syntax Error TS1005: ';' expected at line 4, col 10` |
| **JS-FUNCTION-001** | Excessively Long Function | JS/TS/TSX | `MAINTAINABILITY` | `LOW` | Measures function/method/arrow function line length. Triggered when span > 50 lines. | `Function 'handleRequest' is 72 lines long (threshold: 50)` |
| **JS-COMPLEXITY-001** | High Cyclomatic Complexity | JS/TS/TSX | `COMPLEXITY` | `MEDIUM` | Calculates McCabe complexity via AST branch nodes (`IfStatement`, `ForStatement`, `WhileStatement`, `DoStatement`, `ConditionalExpression`, `BinaryExpression` with `&&`/`||`, `CatchClause`). Triggered when complexity > 10. | `Function 'evaluateRules' has cyclomatic complexity of 13 (threshold: 10)` |

---

## 5. Finding Data Contract & Normalization

All findings are validated and normalized by `FindingNormalizer`:
- **ID**: UUID string.
- **Analysis Run ID**: Foreign key linking to `analysis_runs`.
- **Repository ID**: Foreign key linking to `repositories`.
- **Snapshot ID**: Foreign key linking to `repository_snapshots`.
- **Rule ID & Version**: Identifies exact rule version (e.g. `PY-COMPLEXITY-001`, `1.0.0`).
- **Title & Description**: Clear, actionable human-readable explanations.
- **Severity**: Enum (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `INFO`).
- **Category**: Enum (`SYNTAX`, `COMPLEXITY`, `MAINTAINABILITY`, `CODE_SMELL`, `SECURITY`).
- **File Path**: Normalized relative POSIX path (forward slashes, no absolute host directories).
- **Coordinates**: `start_line` (≥ 1, clamped to file total lines), `start_column` (optional, ≥ 1), `end_line`, `end_column`.
- **Evidence Summary**: Concise excerpt/metric (no whole source files dumped).
- **Fingerprint**: Stable SHA-256 string for deduplication across repeated runs.
- **Metadata**: JSON object storing measured metrics (e.g., `{"complexity": 14, "threshold": 10}`).

---

## 6. Database Models & Alembic Migration

### `analysis_runs` Table
- `id` (VARCHAR(36), PK)
- `repository_id` (FK `repositories.id`, CASCADE)
- `snapshot_id` (FK `repository_snapshots.id`, CASCADE)
- `status` (VARCHAR(20): `pending`, `running`, `completed`, `failed`)
- `started_at`, `completed_at` (TIMESTAMPTZ)
- `rule_set_version` (VARCHAR(32))
- `files_discovered`, `files_analyzed`, `files_skipped` (INTEGER)
- `findings_count` (INTEGER)
- `summary_json` (JSONB / JSON)
- `failure_code`, `failure_reason` (VARCHAR/TEXT, sanitized)
- Indexes: `ix_analysis_runs_repo_created` (`repository_id`, `created_at` DESC), `ix_analysis_runs_snapshot_id`.

### `analysis_findings` Table
- `id` (VARCHAR(36), PK)
- `analysis_run_id` (FK `analysis_runs.id`, CASCADE)
- `repository_id` (FK `repositories.id`, CASCADE)
- `snapshot_id` (FK `repository_snapshots.id`, CASCADE)
- `rule_id` (VARCHAR(64)), `rule_name` (VARCHAR(128)), `rule_version` (VARCHAR(32))
- `title` (VARCHAR(255)), `description` (TEXT)
- `severity` (VARCHAR(20)), `category` (VARCHAR(64))
- `file_path` (VARCHAR(1024))
- `start_line` (INT), `start_column` (INT), `end_line` (INT), `end_column` (INT)
- `evidence_summary` (VARCHAR(2048)), `fingerprint` (VARCHAR(64))
- `metadata_json` (JSONB / JSON)
- Indexes: `ix_analysis_findings_run_id`, `ix_analysis_findings_run_severity`, `ix_analysis_findings_run_category`, `ix_analysis_findings_run_path`, `ix_analysis_findings_run_fingerprint`.

**Migration File**: `backend/alembic/versions/0003_phase2_analysis.py` (tested on both SQLite and PostgreSQL).

---

## 7. REST API Endpoints

- `POST /api/v1/repositories/{id}/analyses`: Starts analysis on a validated snapshot.
  - Body: `{"snapshot_id": "<uuid>"}` (optional; defaults to repository's `latest_snapshot_id`).
  - Validates repository exists and snapshot belongs to repository.
  - Rejects if analysis already running for the repository.
- `GET /api/v1/repositories/{id}/analyses`: Lists historical analysis runs with pagination (`page`, `page_size`).
- `GET /api/v1/analyses/{analysis_id}`: Retrieves single analysis run status and summary statistics.
- `GET /api/v1/analyses/{analysis_id}/findings`: Retrieves paginated findings for a run.
  - Query filters: `severity`, `category`, `rule_id`, `file_path`, `page`, `page_size`.

---

## 8. Security & Resource Controls

1. **No Code Execution**: AST parsing uses passive tokenization and grammar evaluation only. No modules are loaded into Python's `sys.modules` or executed in Node.js.
2. **Path Sanitization**: `SourceInputProvider` verifies that every file resides strictly within the approved repository extraction folder. Any symlink escaping or directory traversal attempt is rejected.
3. **Resource Bounds**:
   - `MAX_ANALYSIS_FILES = 1000`
   - `MAX_ANALYSIS_FILE_BYTES = 1,048,576` (1 MB)
   - `MAX_ANALYSIS_TOTAL_BYTES = 52,428,800` (50 MB)
   - Subprocess timeout for JS/TS parser: 15 seconds.
4. **Information Disclosure Prevention**: Error messages in responses strip local absolute host paths. Source code snippets are limited to concise evidence strings.

---

## 9. Verification & Test Commands

### Backend Tests
```bash
cd backend
.\.venv\Scripts\pytest.exe tests -v
```
All 82 tests pass (3 live PostgreSQL tests skip gracefully when test database is not active).

### Frontend Tests, Linting, & Build
```bash
cd frontend
npm test
npm run lint
npm run build
```
- **Tests**: 25 vitest tests pass across 8 test suites.
- **Lint**: `oxlint` reports 0 errors and 0 warnings.
- **Build**: `tsc -b && vite build` succeeds cleanly.
