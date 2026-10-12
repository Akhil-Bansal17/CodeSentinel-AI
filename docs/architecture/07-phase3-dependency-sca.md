# Phase 3: Dependency Intelligence & Software Composition Analysis (SCA)

> **CodeSentinel AI Architecture & Implementation Reference — Phase 3**

---

## 1. Overview & Objective

Phase 3 extends CodeSentinel AI with an authoritative, deterministic Software Composition Analysis (SCA) and dependency intelligence engine. Building upon ingested repository snapshots (Phase 1) and AST-based static code analysis (Phase 2), Phase 3 discovers project dependencies across Python and Node.js ecosystems, models declared constraints vs. resolved lockfile versions, and correlates packages against a cryptographically verified, local vulnerability advisory dataset.

### Core Architecture Rules
1. **Zero Execution & Zero Installation**: Code is never executed, imported, or built from the target repository. Package managers (`pip`, `npm`, `yarn`, `pnpm`, `poetry`) are never run.
2. **Zero Network Calls During Analysis**: Analysis operates strictly offline against pre-ingested repository files and pre-validated local advisory datasets.
3. **Explicit Truth Boundaries**:
   - Declared constraints (e.g. `requests>=2.25.0`) are never fabricated as exact resolved versions.
   - An absence of vulnerability records does **not** imply a package is safe.
   - Unavailable advisory datasets are never masqueraded as an empty database.
   - Zero AI / LLM hallucinations: no AI-generated CVEs, severities, or remediation advice.

---

## 2. Analysis Pipeline Architecture

```
Target Repository & Validated Snapshot ID
               ↓
    Source Input Provider
    (Validates snapshot boundary, checks SHA-256 digests, enforces 1 MB file / 10 MB total limits)
               ↓
    Manifest & Lockfile Discovery
    (Discovers requirements.txt, pyproject.toml, poetry.lock, Pipfile.lock,
     package.json, package-lock.json, pnpm-lock.yaml, yarn.lock)
               ↓
    Dependency Parser Registry
    ├─ Python: RequirementsParser, PyProjectParser, PoetryLockParser, PipfileLockParser
    └─ Node: PackageJsonParser, PackageLockParser, PnpmLockParser, YarnLockParser
               ↓
    Deterministic Dependency Inventory
    (PEP 503 PyPI & npm normalized package identities, direct vs. transitive classification,
     declared constraints vs. exact resolved versions, provenance tracking)
               ↓
    Vulnerability Advisory Matching Engine
    ├─ Active Advisory Dataset Verification (POPULATED, EMPTY_VALID, UNAVAILABLE)
    ├─ Python Matcher: PEP 440 specification (packaging.version) & OSV event ranges
    └─ Node / Semver Matcher: Pure Semver 2.0.0 & NpmRangeEvaluator (^, ~, -, ||, wildcards)
               ↓
    Security Finding Normalization & Severity Mapping
    (Stable SHA-256 fingerprinting, evidence summaries, remediation guidance)
               ↓
    Transactional Persistence
    (DependencyRun, RepositoryDependency, DependencyVulnerability)
               ↓
    REST APIs & Interactive Frontend
```

---

## 3. Supported Manifest and Lockfile Formats

| Ecosystem | Manifest / Lockfile | Supported Schema Versions & Formats | Direct vs Transitive | Capabilities & Limitations |
| :--- | :--- | :--- | :--- | :--- |
| **Python** | `requirements.txt` (and variants `*req*.txt`, `*requirements*.txt`) | Standard pip requirements format; version specifiers (`==`, `>=`, `<=`, `~=`, `!=`), extras (`[security]`), environment markers (`sys_platform == 'win32'`), line continuations (`\`). | Direct | Supports safe relative recursive `-r` file inclusion up to 10 hops (cycle protected). Flags editable `-e` and direct URLs with `#egg=`. Constraints are marked `declared_only` unless pinned with `==`. |
| **Python** | `pyproject.toml` | PEP 621 (`[project.dependencies]`, `[project.optional-dependencies]`) and Poetry (`[tool.poetry.dependencies]`). | Direct | Parsed via standard library `tomllib`. Never executes build scripts or imports setup hooks. |
| **Python** | `poetry.lock` | Poetry lockfile format (`[[package]]` tables). | Direct & Transitive | Accurately extracts exact resolved versions and sub-dependencies (`[package.dependencies]`). |
| **Python** | `Pipfile.lock` | Pipfile lockfile format (`_meta.hash`, `default`, `develop`). | Direct & Transitive | Accurately extracts exact resolved versions (`default` vs `develop`). |
| **JavaScript / TypeScript** | `package.json` | npm standard format (`dependencies`, `devDependencies`, `peerDependencies`, `optionalDependencies`). | Direct | Declared version constraints preserved; never hallucinates installed versions without a lockfile. |
| **JavaScript / TypeScript** | `package-lock.json` | Lockfile versions 1, 2, and 3 (`packages` map and legacy `dependencies` tree). | Direct & Transitive | V2/V3 maps `packages[""]` to direct dependencies; nested/transitive dependencies marked appropriately. |
| **JavaScript / TypeScript** | `pnpm-lock.yaml` | pnpm lockfile format versions 5.x, 6.x, and 9.x (`importers` & `packages` maps). | Direct & Transitive | Parsed using safe PyYAML (`SafeLoader`); extracts exact resolved package versions. |
| **JavaScript / TypeScript** | `yarn.lock` | Yarn v1 (Classic) header (`# yarn lockfile v1`). | Direct & Transitive | Yarn Berry (v2+) is detected and recorded as explicitly `UNSUPPORTED_SCHEMA` to avoid corrupted inventory. |

---

## 4. Ecosystem Version Comparison Semantics

### Python (PEP 440)
- **Engine**: Implemented via Python's standard `packaging.version.Version` and `packaging.specifiers.SpecifierSet`.
- **Parsing**: Strictly adheres to PEP 440 epoch, release, pre-release (`a`, `b`, `rc`), post-release (`post`), and developmental releases (`dev`).
- **Matching against Advisories**:
  - Direct affected specifier evaluation: `version in SpecifierSet(affected_specifier)`.
  - OSV-style event range evaluation: `introduced <= version < fixed`, respecting `last_affected` and `limit` boundaries.
  - Boundary testing: Verified at `< fixed`, `== fixed` (not affected), and `> fixed` (not affected).

### JavaScript / npm (Semver 2.0.0)
- **Engine**: Pure-Python `SemverVersion` class conforming strictly to Semver 2.0.0 specification with numeric and alphanumeric prerelease precedence rules.
- **Range Evaluator (`NpmRangeEvaluator`)**:
  - Exact match (`1.2.3`), equality (`=1.2.3`).
  - Comparators (`<`, `<=`, `>`, `>=`).
  - Caret ranges (`^1.2.3` allowing non-breaking updates).
  - Tilde ranges (`~1.2.3` allowing patch updates).
  - Hyphen ranges (`1.2.3 - 2.3.4`).
  - Wildcards (`1.x`, `1.2.*`, `*`).
  - Logical disjunctions (`||` across range sets).
  - Normalizes operator whitespace (e.g. `< 4.17.21` → `<4.17.21`).
  - OSV event ranges: `introduced <= version < fixed`.

---

## 5. Advisory Sources, Provenance & Ingestion

### Provenance and Storage
- **Storage Model**: `AdvisoryDataset` (version, status, checksum, counts) and `VulnerabilityAdvisory` (advisory ID, ecosystem, package name, affected/unaffected ranges, severity, CVEs, source URL).
- **Supported Sources**: Authoritative local OSV (Open Source Vulnerabilities) schema and GitHub Security Advisories (GHSA).
- **Dataset States**:
  - `POPULATED`: Valid dataset imported and verified with active advisory records.
  - `EMPTY_VALID`: Valid dataset structure containing 0 advisory records (returns no vulnerabilities, but notes 0 advisories checked).
  - `UNAVAILABLE`: No dataset ingested, or dataset corrupted/invalid. Scans clearly indicate `ADVISORY_DATA_UNAVAILABLE`.

### Import Validation Workflow
1. **Format Validation**: Schema validation ensuring required fields (`id`, `ecosystem`, `package_name`, `severity`).
2. **Deterministic Deduplication**: Ingestion deduplicates by `(ecosystem, package_name, advisory_id)`.
3. **Atomic Transactional Swap**: Ingestion executes inside a single database transaction. If any validation fails, the entire transaction rolls back; the active dataset is never corrupted.
4. **Integrity Checksum**: Computes SHA-256 fingerprint over the imported payload for verification.

---

## 6. Security Findings and Evidence

### Evidence Model
Each vulnerability finding (`DependencyVulnerability`) encapsulates:
- **Finding Type**: `DEPENDENCY_VULNERABILITY`
- **Advisory ID**: Primary identifier (e.g., `GHSA-w73w-5m7g-f7qc`, `CVE-2023-32681`)
- **Ecosystem**: `python` or `npm`
- **Normalized Package Name**: E.g. `requests`, `lodash`
- **Resolved Affected Version**: The exact version present in the lockfile
- **Advisory Affected Range**: E.g. `< 2.31.0`
- **Severity**: Canonical severity (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `UNKNOWN`) preserving source score
- **Manifest Path**: Relative path of the manifest or lockfile where the package was discovered
- **Remediation Guidance**: Fixed version if supported by the advisory
- **Deterministic Fingerprint**: SHA-256 hash of `ecosystem:package_name:version:advisory_id:manifest_path`

### Multiple File Evidence Consolidation
When a dependency appears in both a manifest (`package.json`) and a lockfile (`package-lock.json`), the lockfile's resolved version takes precedence for vulnerability matching. The finding records the lockfile as its primary evidence path while associating manifest context.

---

## 7. Status Codes & Meanings

| Status Code | Meaning |
| :--- | :--- |
| `COMPLETED` | Analysis completed normally; all discovered manifests parsed and matched against active advisory dataset. |
| `COMPLETED_WITH_LIMITATIONS` | Analysis completed, but some files were skipped due to size limits or unsupported schemas (e.g. Yarn Berry). |
| `ADVISORY_DATA_UNAVAILABLE` | Inventory was collected successfully, but vulnerability scanning could not be performed due to missing or invalid advisory dataset. |
| `FAILED` | Analysis aborted due to fatal error (e.g. database error or corrupt snapshot). |

### Dependency Discovery Statuses:
- `RESOLVED`: Exact installed version extracted from lockfile.
- `DECLARED_ONLY`: Version constraint declared in manifest; exact installed version unknown.
- `UNRESOLVED`: Dependency declared without version constraint or version could not be parsed.
- `UNSUPPORTED_FORMAT`: File identified as manifest/lockfile but schema version is unsupported.
- `SKIPPED_LIMIT`: File exceeded `MAX_MANIFEST_BYTES` (1 MB) and was safely bypassed.

---

## 8. Resource Limits & Untrusted Input Defenses

| Protection | Config Parameter | Default Limit | Purpose |
| :--- | :--- | :--- | :--- |
| Maximum Manifest File Size | `MAX_MANIFEST_BYTES` | 1 MB (1,048,576 bytes) | Prevents denial-of-service via huge manifest files. |
| Maximum Total Manifest Bytes | `MAX_TOTAL_MANIFEST_BYTES` | 10 MB (10,485,760 bytes) | Bounds memory consumption during inventory parsing. |
| Maximum Included Requirements Depth | `MAX_REQUIREMENT_INCLUDE_DEPTH` | 10 hops | Prevents infinite loops or stack overflows from circular `-r` requirements. |
| Safe YAML Loading | `yaml.SafeLoader` | Restricted | Prevents arbitrary Python object instantiation from untrusted YAML lockfiles. |
| Relative Path Sanitization | `safe_relative_path` | Strict | Blocks directory traversal (`../`) and absolute paths in `-r` includes. |

---

## 9. API Reference

### Dependency Analysis Endpoints
- **`POST /api/v1/repositories/{repository_id}/dependencies/analyses`**: Trigger dependency scan for a snapshot.
- **`GET /api/v1/repositories/{repository_id}/dependencies/analyses`**: List dependency analysis runs for a repository.
- **`GET /api/v1/dependencies/analyses/{run_id}`**: Get dependency run details and summary metrics.
- **`GET /api/v1/dependencies/analyses/{run_id}/dependencies`**: List discovered dependencies (filterable by `ecosystem`, `is_direct`, `discovery_status`, with pagination).
- **`GET /api/v1/dependencies/analyses/{run_id}/vulnerabilities`**: List discovered vulnerabilities (filterable by `severity`, `ecosystem`, `package_name`, `advisory_id`, with pagination).

### Advisory Dataset Management Endpoints
- **`GET /api/v1/advisories/status`**: Check active advisory dataset status, version, and record counts.
- **`POST /api/v1/advisories/import`**: Controlled import operation to atomically load validated advisory datasets.

---

## 10. Verification & Test Commands

### Backend Verification:
```bash
# Run all backend tests including Phase 1, Phase 2, and Phase 3 suites:
.\backend\.venv\Scripts\pytest.exe -v

# Run Phase 3 specific tests:
.\backend\.venv\Scripts\pytest.exe tests/test_dependency_parsers.py tests/test_version_matching.py tests/test_advisory_ingestion.py tests/test_dependency_api.py tests/test_dependency_security.py -v
```

### Frontend Verification:
```bash
# Run frontend tests:
cd frontend && npm test

# Type checking and production build:
cd frontend && npm run build

# Code linting:
cd frontend && npm run lint
```
