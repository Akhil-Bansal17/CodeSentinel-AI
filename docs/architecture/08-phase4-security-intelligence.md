# Phase 4 Architecture: Application Security Intelligence Engine

## 1. Overview & Core Philosophy

The **Application Security Intelligence Engine** in CodeSentinel AI provides deterministic, evidence-backed security pattern detection across supported Python and JavaScript/TypeScript source files. 

### Core Tenets:
1. **Zero Untrusted Code Execution**: Analyzed repository files are treated strictly as untrusted text/data inputs. The engine never imports, runs, executes, or installs target repository code or package managers.
2. **Decoupled Severity and Confidence**: A pattern with high intrinsic impact (e.g., dynamic code execution) does not automatically imply high exploitability in context. The engine strictly distinguishes **Severity** (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `INFO`) from **Confidence** (`HIGH`, `MEDIUM`, `LOW`).
3. **AST & Syntax-Aware Parsing**: Detection avoids coarse, brittle regular expressions for syntactic constructs. Python analysis utilizes `ast.parse` and AST visitors. JavaScript and TypeScript analysis uses TypeScript's compiler API (`ts.createSourceFile`) running in an isolated, resource-bounded child process.
4. **Evidence & Line Coordinates**: Every finding reports precise start line, start column, end line, truncated evidence summary, stable fingerprint (SHA-256), explanation of risk, remediation advice, and known limitations.
5. **No Synthetic Security Claims**: The engine makes no claim that a clean scan implies a completely secure repository. Finding zero issues means zero matches against the documented deterministic ruleset.

---

## 2. Security Rules Catalog

The engine registers 10 deterministic security rules: 6 for Python and 4 for JavaScript / TypeScript.

### 2.1 Python Security Rules (`python_security_rules.py`)

| Rule ID | Rule Title | Default Severity | Default Confidence | Target Syntax / AST Nodes |
| :--- | :--- | :--- | :--- | :--- |
| **`PYSEC001`** | Dynamic Code Execution | `HIGH` | `HIGH` (dynamic arg) / `MEDIUM` (literal) | Direct calls to `eval(...)` and `exec(...)` |
| **`PYSEC002`** | Unsafe Deserialization | `HIGH` | `HIGH` (dynamic arg) / `MEDIUM` (shelve) | Calls to `pickle.load(...)`, `pickle.loads(...)`, `_pickle`, and `shelve.open(...)` |
| **`PYSEC003`** | Shell Command Execution | `HIGH` / `MEDIUM` | `HIGH` (`shell=True`, `os.system`) / `MEDIUM` (list args) | `os.system(...)`, `os.popen(...)`, `subprocess.run/call/Popen` with `shell=True` or dynamic args |
| **`PYSEC004`** | Weak Cryptographic Hash Usage | `MEDIUM` / `INFO` | `MEDIUM` (unspecified) / `LOW` (`usedforsecurity=False`) | `hashlib.md5(...)`, `hashlib.sha1(...)` |
| **`PYSEC005`** | TLS Certificate Verification Disabled | `HIGH` | `HIGH` | `verify=False` in HTTP client calls (`requests.get/post/...`, `httpx`), `ssl._create_unverified_context` |
| **`PYSEC006`** | SQL Query Construction Risk | `HIGH` | `HIGH` (formatted/interpolated with SQL keywords) | String formatting (`f"SELECT... {x}"`, `"SELECT... %s" % x`, `"SELECT... {}".format(x)`) or concatenation passed into DB execution APIs or queries |

### 2.2 JavaScript / TypeScript Security Rules (`js_security_rules.py`)

| Rule ID | Rule Title | Default Severity | Default Confidence | Target Syntax / AST Nodes |
| :--- | :--- | :--- | :--- | :--- |
| **`JSSEC001`** | Dynamic Code Execution | `HIGH` | `HIGH` | Calls to `eval(...)`, `Function(...)`, or `new Function(...)` |
| **`JSSEC002`** | Dangerous Raw HTML Injection Sink | `HIGH` | `MEDIUM` (DOM assignment) / `HIGH` (React raw HTML) | Property assignments to `innerHTML`, `outerHTML`, or JSX attributes `dangerouslySetInnerHTML` |
| **`JSSEC003`** | Shell Execution Risk | `HIGH` | `HIGH` (`shell: true`, `execSync`) / `MEDIUM` (`exec`) | Calls to `child_process.exec(...)`, `child_process.execSync(...)`, or `spawn(..., { shell: true })` |
| **`JSSEC004`** | SQL Query Construction Risk | `HIGH` | `HIGH` (template string with SQL keywords) | Tagged or untagged template literals / concatenations containing SQL keywords (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) with interpolated expressions |

---

## 3. Database Schema & Migration

### Schema Modifications
- Table: `analysis_findings`
- Column: `confidence` (`VARCHAR(20)`, nullable=False, default `'MEDIUM'`)
- Composite Index: `ix_analysis_findings_run_conf` on `(analysis_run_id, confidence)`

### Migration
- File: `backend/alembic/versions/0005_phase4_security_intelligence.py`
- Revision: `0005_phase4`
- Down Revision: `0004_phase3`

---

## 4. API Endpoints

### 1. Rules Catalog
`GET /api/v1/analyses/rules/catalog`
Returns metadata for all available static analysis and security rules:
```json
{
  "rules": [
    {
      "rule_id": "PYSEC001",
      "name": "Dynamic Code Execution (eval/exec)",
      "category": "SECURITY",
      "severity": "HIGH",
      "default_confidence": "HIGH",
      "language": "python",
      "description": "...",
      "why_it_matters": "...",
      "remediation": "...",
      "limitations": "..."
    }
  ],
  "total": 14
}
```

### 2. List Findings with Confidence Filtering
`GET /api/v1/analyses/{analysis_id}/findings?confidence=HIGH&category=SECURITY`
Supports query parameters:
- `page`: integer (default 1)
- `page_size`: integer (default 25, max 100)
- `severity`: `CRITICAL` | `HIGH` | `MEDIUM` | `LOW` | `INFO`
- `confidence`: `HIGH` | `MEDIUM` | `LOW`
- `category`: `SECURITY` | `COMPLEXITY` | `MAINTAINABILITY` | `CODE_SMELL` | `SYNTAX`
- `rule_id`: string filter
- `file_path`: substring filter

### 3. Single Finding Diagnostic Inspection
`GET /api/v1/analyses/{analysis_id}/findings/{finding_id}`
Returns complete finding entity including `confidence`, source coordinates, `evidence_summary`, and diagnostic metadata (`why_it_matters`, `remediation`, `limitations`).

---

## 5. Security Guardrails & Sandboxing

1. **Path Traversal Containment**: Source paths are strictly resolved through snapshot IDs; arbitrary user-supplied filesystem paths are rejected.
2. **Safe Isolated Node Parser**: JavaScript and TypeScript files are parsed by `js_ts_parser.cjs` in a separate Node.js process with a 5-second execution timeout and bounded payload sizes (max 5 MB).
3. **Evidence Bounding & Redaction**: Detection evidence is truncated (max 500 characters) and safe-rendered to avoid exposing secrets or dumping large files.
4. **Deterministic Fingerprints**: Findings generate SHA-256 fingerprints based on `(repository_id, rule_id, relative_file_path, normalized_evidence)`. Analysis runs against unchanged source files generate identical fingerprints without duplicate findings.

---

## 6. What "Zero Findings" Means

A scan result showing **0 findings** does **NOT** indicate that the codebase is completely secure or free of vulnerabilities. It specifically indicates that:
- The analyzed source files did not contain syntactic patterns matching the 10 documented deterministic security rules.
- The scanner does not perform inter-procedural taint analysis across multiple files or microservices.
- Custom framework sanitizers, indirect dynamic lookups, and third-party cloud configurations are outside the bounded scope of this engine.
