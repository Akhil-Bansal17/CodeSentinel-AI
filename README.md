# CodeSentinel AI

> **Deterministic Software Engineering Intelligence & Automated Codebase Governance**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.1.0-emerald.svg)](https://github.com/Akhil-Bansal17/CodeSentinel-AI/releases)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](#running-automated-tests)
[![Python](https://img.shields.io/badge/python-3.12%20%7C%203.14-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6.svg)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791.svg)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](docker-compose.yml)

---

## Overview

CodeSentinel AI is a local-first software engineering intelligence and automated codebase governance platform engineered for engineering leads, security teams, and platform architects who need transparent, verifiable repository diagnostics without relying on hallucinating LLMs. Unlike generic "AI coding wrappers" that blindly pipe unvetted source files into language models and fabricate non-existent CVEs or synthetic quality scores, CodeSentinel AI strictly decouples **deterministic static inspection** from **high-level reasoning**. Grounded in AST parsing, McCabe cyclomatic complexity calculation, multi-manifest Software Composition Analysis (SCA), and specification-compliant version matching (PEP 440 and Semver 2.0.0), every finding emitted by CodeSentinel AI is cryptographically fingerprinted, isolated to exact source line/column coordinates, and backed by verifiable evidence.

---

## Feature Matrix

| Feature | Description |
| :--- | :--- |
| **Multi-Source Ingestion** | Ingests public GitHub repositories via streaming HTTP archive extraction or discovers approved local filesystem repositories in-place. |
| **Multi-Vector Security Sandbox** | Defends against SSRF, TarSlip, ZipSlip, symlink traversal escapes, and decompression bombs (expansion ratio &gt; 10.0 or extraction &gt; 150 MB). |
| **Deterministic Codebase Telemetry** | Classifies files into source, config, data, and docs; computes physical LOC, byte footprints, and language distributions with zero synthetic vanity scores. |
| **Immutable Snapshotting** | Generates atomic, point-in-time repository snapshots with SHA-256 file hashing; preserves historical healthy states if a re-scan encounters errors. |
| **AST-Based Static Code Analysis** | Inspects Python ASTs (`ast.parse`) and JavaScript/TypeScript syntax trees via the official TypeScript compiler API (`ts.createSourceFile`). |
| **Deterministic Rules Engine** | Evaluates code complexity, function lengths, syntax diagnostics, and duplicate imports with line/column coordinates and reproducible rule IDs. |
| **Application Security Intelligence** | Detects high-risk syntactic patterns in Python & JS/TS (dynamic code execution, unsafe deserialization, shell injection, disabled TLS verification, weak hashes, raw HTML sinks, and SQL interpolation) with decoupled Severity and Confidence. |
| **Multi-Ecosystem SCA** | Parses 8 manifest/lockfile formats (`requirements.txt`, `pyproject.toml`, `poetry.lock`, `Pipfile.lock`, `package.json`, `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`). |
| **Dual Version Matching Engines** | Evaluates dependency vulnerabilities against OSV event ranges using PEP 440 (`packaging`) and Semver 2.0.0 (`NpmRangeEvaluator`) semantics. |
| **Cryptographic Fingerprinting** | Computes stable SHA-256 fingerprints for every finding, preventing duplicate alerts across successive scan iterations. |
| **Architectural Dependency Graph** | Extracts deterministic module dependency graphs for Python and JS/TS; resolves internal edges, external libraries, and unresolved imports. |
| **Martin's Package Coupling Metrics** | Computes Afferent Coupling ($Ca$), Efferent Coupling ($Ce$), Instability ($I$), Abstractness ($A$), and Normalized Main Sequence Distance ($D$). |
| **Tarjan's SCC Cycle Detection** | Identifies circular dependency clusters and mutual tight coupling across modules using Tarjan's Strongly Connected Components algorithm. |
| **Declarative Governance Engine** | Enforces layer boundaries and forbidden pattern rules via `codesentinel.architecture.json` with exact line evidence and SHA-256 fingerprints. |
| **Explainable Codebase Health Index** | Evaluates a 0–100 health index across 5 core pillars (Maintainability, AppSec, Architecture, Dependency Risk, Coverage) with weight normalization and ranked recommendations. |
| **Modern Developer Dashboard** | Responsive React 19 + Vite 8 + Tailwind CSS dark-mode dashboard with paginated file explorers, dependency graphs, architecture viewers, and live telemetry. |

---

## What It Can Do Now

- **Ingests public GitHub repositories safely**: Downloads archives via streaming HTTP, validates redirect chains against SSRF filters, strips root wrappers, and auto-detects default branches.
- **Audits local workspaces securely**: Resolves and scans local filesystem trees strictly bounded within explicitly whitelisted `LOCAL_REPOSITORY_ROOTS`.
- **Enforces military-grade sandboxing**: Rejects uncompressed archives exceeding 150 MB, expansion ratios exceeding 10.0x, path traversals (`../`), UNC paths, and symlink loops.
- **Protects codebase secrets**: Automatically excludes credential patterns (`.env`, `*.pem`, `id_rsa`) from file inspections and line counters; never executes analyzed code.
- **Calculates physical lines of code (LOC)**: Categorizes code deterministically into source, configuration, documentation, data, and binary files.
- **Parses Python and TypeScript ASTs**: Uses stdlib `ast` for Python and an isolated Node.js child process with TypeScript's compiler API for JS/TS/TSX.
- **Measures McCabe cyclomatic complexity**: Traverses AST branch decision nodes (`if`, `elif`, `for`, `while`, `and`, `or`, `except`, comprehensions) and flags functions exceeding threshold 10.
- **Flags oversized functions & duplicate imports**: Detects functions spanning over 50 lines and flags duplicate module imports within the same lexical scope.
- **Identifies Security-Sensitive Patterns (Phase 4)**: Executes 10 deterministic security rules (PYSEC001-PYSEC006, JSSEC001-JSSEC004) covering eval/exec, pickle/shelve deserialization, shell commands, MD5/SHA1, verify=False TLS bypass, innerHTML sinks, and SQL string interpolation.
- **Decouples Severity from Confidence**: Distinctly tracks impact severity (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `INFO`) and detection confidence (`HIGH`, `MEDIUM`, `LOW`) with actionable remediation guidance and known limitations.
- **Inventories direct & transitive dependencies**: Differentiates declared package constraints (e.g. `requests>=2.25.0`) from pinned resolved versions (e.g. `2.31.0`).
- **Executes offline vulnerability correlation**: Evaluates packages against pre-loaded OSV/CVE advisory records using PEP 440 and Semver 2.0.0 spec-compliant evaluators.
- **Extracts module dependency graphs (Phase 5)**: Resolves static imports across Python and JS/TS, isolating internal module edges from standard library and 3rd-party dependencies.
- **Measures Martin's package coupling metrics**: Calculates $Ca$, $Ce$, Instability ($I = \frac{Ce}{Ca+Ce}$), Abstractness ($A = \frac{N_a}{N_c}$), and Main Sequence Distance ($D = |A+I-1|$).
- **Isolates circular dependency clusters**: Traverses import graphs with Tarjan's SCC algorithm to flag circular components and identify cycles.
- **Enforces architectural governance policies**: Evaluates layer boundaries and forbidden dependencies declared in `codesentinel.architecture.json` with exact source line coordinates and remediation guidance.
- **Calculates a 5-pillar codebase health score**: Deterministically assesses Maintainability (25%), Security (25%), Architecture (20%), Dependency Risk (15%), and Coverage (15%) with dynamic weight renormalization for missing inputs.
- **Prioritizes actionable remediation**: Produces ranked recommendation cards sorted by priority and impact with concrete action plans.
- **Issues stable SHA-256 finding fingerprints**: Guarantees idempotent issue tracking: `sha256(rule_id:file_path:start_line:evidence_summary)`.
- **Delivers a production REST API & React UI**: Features 20+ OpenAPI endpoints, structured JSON logging, and a low-latency React 19 dashboard.

---

## The Problem

Engineering leaders and platform teams struggle to maintain codebase health, track security posture, and govern technical debt. Current market approaches fail across multiple operational dimensions:

| Dimension | "AI Wrapper" Coding Assistants | Monolithic Legacy SAST/SCA | Ad-Hoc Scripts & Linters | CodeSentinel AI |
| :--- | :--- | :--- | :--- | :--- |
| **Truth Grounding** | **Poor**: Hallucinates non-existent CVEs, deprecated APIs, and synthetic scores. | **Fair**: Rule-based, but generates high false-positive volumes with opaque heuristics. | **Good**: Deterministic, but output is fragmented across disparate tool formats. | **Absolute**: Deterministic AST/SCA baseline; zero synthetic scores; verifiable evidence coordinates. |
| **Execution Safety** | **Risky**: Cloud-dependent; source code leaves security perimeters to third-party APIs. | **Moderate**: Requires proprietary agents or heavyweight server compute. | **High Risk**: Many tools run build hooks (`setup.py`, `npm postinstall`) during scan. | **Zero Execution**: Code is parsed statically; never built, executed, or exported off-host. |
| **Air-Gap Capability** | **None**: Requires active internet connectivity to external LLM providers. | **Complex**: Expensive on-premise appliances with heavy license servers. | **Manual**: Requires configuring multiple disconnected offline package mirrors. | **Native**: Fully autonomous; runs locally with bundled, version-controlled advisory catalogs. |
| **Dependency Precision** | **Hallucinated**: Guesses transitive dependencies based on prompt tokens. | **Variable**: Often assumes top-level constraint equals installed version. | **Brittle**: Inconsistent between npm audit, pip-audit, and manual regex checks. | **Rigorous**: PEP 440 and Semver 2.0.0 specs; clearly separates declared vs. resolved versions. |
| **Operational Cost** | **High**: Escalating per-token billing and cloud inference subscriptions. | **Very High**: Six-figure enterprise contracts with restrictive seat quotas. | **Low**: Open-source, but requires hundreds of engineering hours to integrate. | **Zero Per-Seat Cost**: Self-hosted, lightweight Docker stack running on commodity hardware. |

---

## Get Started

### Prerequisites

- **Python**: 3.12 or newer (tested on Python 3.12 and 3.14)
- **Node.js**: v20+ and **npm** v10+
- **PostgreSQL**: 16+ (or use SQLite / Docker Compose)

### 1. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv

# Windows (PowerShell):
.\.venv\Scripts\Activate.ps1
# Linux / macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env

# Run database migrations
alembic upgrade head

# Start development API server
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

The API server will listen on `http://127.0.0.1:8000`:
- **Health Check**: `http://127.0.0.1:8000/api/health`
- **Interactive OpenAPI Documentation**: `http://127.0.0.1:8000/api/docs`

### 2. Frontend Setup

```bash
cd frontend

# Install Node dependencies
npm install

# Start development UI server
npm run dev
```

The UI dashboard will be accessible at `http://localhost:5173`. In development mode, Vite automatically proxies `/api` calls to the FastAPI backend running on port 8000.

---

## Docker Quick Start

CodeSentinel AI provides a production-ready, multi-container orchestration setup with PostgreSQL 16, FastAPI, and an Nginx-backed React frontend.

```bash
# 1. Build and boot all containers
docker compose up --build -d

# 2. Check cluster health
curl -s http://localhost:8000/api/health | jq .

# 3. Access the web dashboard
open http://localhost:3000
```

To tail logs across all services:
```bash
docker compose logs -f backend
```

---

## Example Input → Output

### Ingest a Repository & Execute Static Analysis

#### Request: Ingest a GitHub Repository
```bash
curl -X POST http://127.0.0.1:8000/api/v1/repositories \
  -H "Content-Type: application/json" \
  -d '{
    "source_type": "github",
    "source_url": "https://github.com/pallets/click",
    "name": "click"
  }'
```

#### Output: Repository Snapshot Response
```json
{
  "id": "7f920be3-c21e-4509-9ec4-ff70d8a25c11",
  "name": "click",
  "source_type": "github",
  "source_identifier": "https://github.com/pallets/click",
  "status": "ready",
  "default_branch": "main",
  "last_ingested_at": "2026-10-13T16:30:00Z",
  "latest_snapshot": {
    "id": "a4d3e8e1-5e72-4d51-87c2-9e9f1a0e3b62",
    "status": "completed",
    "file_count": 142,
    "source_file_count": 98,
    "total_size_bytes": 1048576,
    "total_lines_of_code": 24150,
    "language_distribution": {
      "Python": 23400,
      "Markdown": 750
    }
  }
}
```

#### Trigger Static AST Analysis Run
```bash
curl -X POST http://127.0.0.1:8000/api/v1/repositories/7f920be3-c21e-4509-9ec4-ff70d8a25c11/analyses
```

#### Output: Static Analysis Finding (AST Complexity & Evidence)
```json
{
  "id": "e812a674-c5a4-4a57-b249-1d428bf61298",
  "rule_id": "PY-COMPLEXITY-001",
  "rule_name": "High Cyclomatic Complexity",
  "category": "COMPLEXITY",
  "severity": "MEDIUM",
  "file_path": "src/click/core.py",
  "start_line": 1420,
  "start_column": 5,
  "end_line": 1512,
  "evidence_summary": "Function 'make_context' has cyclomatic complexity of 18 (threshold: 10)",
  "fingerprint": "8f48039a044d01b4c3e8083818e6a17b075e81d7648f5729177a641a94161962",
  "metadata_json": {
    "function_name": "make_context",
    "complexity": 18,
    "threshold": 10
  }
}
```

---

## API Usage

The CodeSentinel AI REST API conforms strictly to OpenAPI 3.1 specifications. All responses return typed JSON.

### 1. Ingest a Local Repository
```bash
curl -X POST http://127.0.0.1:8000/api/v1/repositories \
  -H "Content-Type: application/json" \
  -d '{
    "source_type": "local",
    "source_url": "C:/Users/Akhil/Projects/CodeSentinalAi",
    "name": "CodeSentinel-AI-Local"
  }'
```

### 2. List Discovered Snapshot Files (Filtered by Category & Language)
```bash
curl -X GET "http://127.0.0.1:8000/api/v1/repositories/7f920be3-c21e-4509-9ec4-ff70d8a25c11/files?language=Python&category=source&page=1&page_size=25"
```

### 3. Trigger AST Static Code Analysis
```bash
curl -X POST "http://127.0.0.1:8000/api/v1/repositories/7f920be3-c21e-4509-9ec4-ff70d8a25c11/analyses" \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "complexity_threshold": 10,
      "function_length_threshold": 50
    }
  }'
```

### 4. Fetch Evidence-Backed Static Analysis Findings
```bash
curl -X GET "http://127.0.0.1:8000/api/v1/analyses/b213c909-11fa-4f9e-990a-5c6218d4512e/findings?severity=MEDIUM&page=1&page_size=50"
```

### 5. Trigger Dependency Discovery & SCA Scan
```bash
curl -X POST "http://127.0.0.1:8000/api/v1/repositories/7f920be3-c21e-4509-9ec4-ff70d8a25c11/dependency-analyses"
```

### 6. Inspect Discovered Dependency Inventory
```bash
curl -X GET "http://127.0.0.1:8000/api/v1/dependency-analyses/6d1c9ef0-0a22-4876-9d3e-90f77ea61190/dependencies?ecosystem=npm&is_direct=true"
```

### 7. Inspect Matched Security Vulnerabilities
```bash
curl -X GET "http://127.0.0.1:8000/api/v1/dependency-analyses/6d1c9ef0-0a22-4876-9d3e-90f77ea61190/vulnerabilities?severity=HIGH"
```

### 8. Verify Advisory Catalog Status & Provenance
```bash
curl -X GET "http://127.0.0.1:8000/api/v1/advisories/status"
```

---

## Configuration Reference

CodeSentinel AI is configured via environment variables or a `.env` file loaded at application boot:

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PROJECT_NAME` | `CodeSentinel AI` | Application name displayed across logs and OpenAPI documentation |
| `SERVICE_NAME` | `codesentinel-api` | Microservice identifier returned by `/api/health` |
| `VERSION` | `0.1.0` | Application release version |
| `ENVIRONMENT` | `development` | Runtime environment (`development`, `test`, `staging`, `production`) |
| `DEBUG` | `false` | Enables verbose debug logging and traceback outputs |
| `API_PREFIX` | `/api` | Base HTTP route prefix for all endpoints |
| `DATABASE_URL` | `postgresql+psycopg://postgres:postgres@localhost:5432/codesentinel` | SQLAlchemy connection URL (supports PostgreSQL and SQLite) |
| `DB_POOL_SIZE` | `5` | Maximum number of permanent database connections in pool |
| `DB_MAX_OVERFLOW` | `10` | Maximum burst connections allowed beyond pool size |
| `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000` | Whitelisted CORS origin list for browser communication |
| `LOG_LEVEL` | `INFO` | Logging threshold (`DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL`) |
| `LOG_FORMAT` | `json` | Structured logging format (`json` or `text`) |
| `LOCAL_REPOSITORY_ROOTS` | `""` | Comma-separated list of absolute paths approved for local repository ingestion |
| `MAX_REPOSITORY_DOWNLOAD_BYTES` | `52428800` (50 MB) | Maximum permitted compressed archive download size |
| `MAX_REPOSITORY_EXTRACTED_BYTES` | `157286400` (150 MB) | Maximum permitted uncompressed archive directory size |
| `MAX_REPOSITORY_FILES` | `10000` | Maximum number of discovered files per repository snapshot |
| `MAX_REPOSITORY_FILE_BYTES` | `2097152` (2 MB) | File size threshold for line-counting and SHA-256 calculation |
| `REPOSITORY_INGESTION_TIMEOUT_SECONDS`| `60` | Execution timeout for extraction and discovery pipelines |
| `MAX_ARCHIVE_EXPANSION_RATIO` | `10.0` | Maximum expansion ratio allowed (guards against decompression bombs) |
| `MAX_ANALYSIS_FILES` | `1000` | Maximum source files processed during an AST static analysis run |
| `MAX_ANALYSIS_FILE_BYTES` | `1048576` (1 MB) | Maximum file size for AST parser consumption |
| `RULE_COMPLEXITY_DEFAULT_THRESHOLD` | `10` | McCabe cyclomatic complexity limit before triggering `*-COMPLEXITY-001` |
| `RULE_FUNCTION_LENGTH_DEFAULT_THRESHOLD`| `50` | Function body length threshold in lines before triggering `*-FUNCTION-001` |

---

## System Architecture

The following diagram illustrates the physical request path through the system's runtime layers, highlighting the strict separation between deterministic ingestion/analysis engines and persisted state.

```mermaid
flowchart TD
    subgraph ClientTier["Developer Interface Layer"]
        UI["React 19 Dashboard<br/>(Vite 8 + TypeScript + Tailwind)"]
        APIClient["Type-Safe API Client<br/>(Axios / Fetch)"]
    end

    subgraph GatewayTier["FastAPI Application Gateway"]
        APIRouter["API Router Layer (/api/v1)"]
        Middleware["Security Middleware<br/>(CORS, Audit Logger, Error Trap)"]
    end

    subgraph IngestionSandbox["Sandbox & Repository Ingestion Engine"]
        Validator["Source Validator & SSRF Guard"]
        Acquisition["Streaming Downloader & Local Resolver"]
        SafeExtract["Safe Extractor<br/>(TarSlip / ZipSlip / Bomb Guard)"]
        Discovery["File Discovery & Secret Filter"]
        Metrics["Deterministic Metrics Engine<br/>(LOC & Proportional Language Shares)"]
    end

    subgraph StaticAnalysisEngine["Phase 2: Deterministic AST Analysis Core"]
        PyParser["Python AST Parser<br/>(stdlib ast.parse)"]
        TsParser["TypeScript AST Adapter<br/>(Node.js + ts.createSourceFile)"]
        RuleRegistry["Deterministic Rule Registry<br/>(McCabe Complexity, Function Span, Syntax)"]
        Normalizer["Finding Normalizer & Fingerprinter<br/>(SHA-256 Hasher)"]
    end

    subgraph SCAEngine["Phase 3: Software Composition Analysis Core"]
        ManifestParser["Manifest & Lockfile Parsers<br/>(pip, poetry, pipenv, npm, pnpm, yarn)"]
        InventoryNormalizer["Identity Normalizer<br/>(PEP 503 PyPI & npm Canonicalization)"]
        PEP440Engine["PEP 440 Matcher<br/>(packaging.version)"]
        SemverEngine["Semver 2.0.0 Matcher<br/>(NpmRangeEvaluator)"]
        AdvisoryCatalog[("Local Advisory Catalog<br/>(OSV / CVE Datasets)")]
    end

    subgraph StorageTier["Persistence & Telemetry Layer"]
        Postgres[("PostgreSQL 16 Engine<br/>(SQLAlchemy 2.0 + Alembic)")]
        Snapshots[("Snapshot & File Metadata")]
        FindingsDB[("Findings & Vulnerabilities")]
    end

    UI --> APIClient
    APIClient --> APIRouter
    APIRouter --> Middleware
    Middleware --> Validator

    Validator --> Acquisition
    Acquisition --> SafeExtract
    SafeExtract --> Discovery
    Discovery --> Metrics
    Metrics --> Postgres

    Postgres --> Snapshots
    Snapshots --> PyParser
    Snapshots --> TsParser
    PyParser --> RuleRegistry
    TsParser --> RuleRegistry
    RuleRegistry --> Normalizer
    Normalizer --> FindingsDB

    Snapshots --> ManifestParser
    ManifestParser --> InventoryNormalizer
    InventoryNormalizer --> PEP440Engine
    InventoryNormalizer --> SemverEngine
    AdvisoryCatalog --> PEP440Engine
    AdvisoryCatalog --> SemverEngine
    PEP440Engine --> FindingsDB
    SemverEngine --> FindingsDB

    classDef critical fill:#1e3a8a,stroke:#3b82f6,stroke-width:2px,color:#ffffff;
    classDef security fill:#831843,stroke:#ec4899,stroke-width:2px,color:#ffffff;
    classDef engine fill:#14532d,stroke:#22c55e,stroke-width:2px,color:#ffffff;

    class SafeExtract,Validator security;
    class RuleRegistry,PEP440Engine,SemverEngine critical;
    class Metrics,Discovery,ManifestParser engine;
```

---

## Core Workflow Sequence

The sequence diagram below models the complete lifecycle of a repository audit—from ingestion and sandboxing to AST static code analysis and offline SCA dependency matching.

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Developer / CI Pipeline
    participant UI as React UI Dashboard
    participant API as FastAPI Router
    participant RepoService as RepositoryService
    participant Sandbox as Security Sandbox
    participant DB as PostgreSQL 16
    participant AnalysisSvc as Static Analysis Engine
    participant SCASvc as Dependency SCA Engine

    Dev->>UI: Connect Repository (URL or Path)
    UI->>API: POST /api/v1/repositories
    API->>RepoService: ingest_repository(request)

    RepoService->>Sandbox: validate_source_url(url)
    alt SSRF / Traversal / Bogus Path Detected
        Sandbox-->>RepoService: Reject (SecurityViolationError)
        RepoService-->>API: 400 Bad Request
        API-->>UI: Display Security Error Banner
    else Source Validated
        Sandbox->>RepoService: Approve acquisition
        RepoService->>Sandbox: extract_archive_stream()
        Sandbox->>Sandbox: Verify expansion ratio & ZipSlip paths
        Sandbox->>RepoService: Safe workspace unpacked
        RepoService->>RepoService: Compute LOC & Language Shares
        RepoService->>DB: Save Repository, Snapshot, & Files (Atomic)
        DB-->>RepoService: Ingestion Committed
        RepoService-->>API: RepositoryResponse (Status: Ready)
        API-->>UI: Render Repository Overview
    end

    opt Trigger Code Quality Scan
        Dev->>UI: Click "Run Static Analysis"
        UI->>API: POST /api/v1/repositories/{id}/analyses
        API->>AnalysisSvc: execute_analysis_run(repo_id, snapshot_id)
        AnalysisSvc->>DB: Read Snapshot File Inventory
        AnalysisSvc->>AnalysisSvc: Parse ASTs (Python & TypeScript)
        AnalysisSvc->>AnalysisSvc: Evaluate McCabe Complexity & Rule Registry
        AnalysisSvc->>AnalysisSvc: Generate SHA-256 Fingerprints
        AnalysisSvc->>DB: Persist AnalysisRun & AnalysisFindings
        AnalysisSvc-->>API: AnalysisRunResponse (Completed)
        API-->>UI: Display Paginated Findings
    end

    opt Trigger SCA Vulnerability Scan
        Dev->>UI: Click "Scan Dependencies"
        UI->>API: POST /api/v1/repositories/{id}/dependency-analyses
        API->>SCASvc: execute_dependency_run(repo_id, snapshot_id)
        SCASvc->>DB: Load Manifest & Lockfile Paths
        SCASvc->>SCASvc: Parse dependencies (Pip, Poetry, npm, pnpm, Yarn)
        SCASvc->>SCASvc: Match against local advisories (PEP 440 & Semver 2.0.0)
        SCASvc->>DB: Persist DependencyRun, Inventory, & Vulnerabilities
        SCASvc-->>API: DependencyRunResponse (Completed)
        API-->>UI: Display Discovered Dependencies & Matched CVEs
    end
```

---

## Key Decision & Logic Flow

The flowchart below documents the multi-layered security validation and decompression sandbox executed whenever a repository archive or local directory is submitted.

```mermaid
flowchart TD
    Start(["Ingestion Triggered"]) --> DetectType{"Source Type?"}

    DetectType -->|"GitHub Remote"| ValidateURL["Validate GitHub URL & Domain"]
    DetectType -->|"Local Directory"| ValidatePath["Validate Path against LOCAL_REPOSITORY_ROOTS"]

    ValidateURL --> DNSCheck{"SSRF Guard: Resolves to Private / Loopback / Cloud IP?"}
    DNSCheck -->|"Yes (Malicious)"| RejectSSRF["Raise SecurityViolationError (SSRF Detected)"]
    DNSCheck -->|"No (Safe Public IP)"| StreamDownload["Stream HTTP Tarball Archive"]

    StreamDownload --> SizeCheck{"Compressed Size > 50 MB?"}
    SizeCheck -->|"Yes"| RejectDownloadLimit["Raise RepositoryLimitExceededError"]
    SizeCheck -->|"No"| ExtractEntry["Iterate Tarball / Zip Members"]

    ValidatePath --> LocalCheck{"Path inside Allowed Local Roots?"}
    LocalCheck -->|"No"| RejectLocalEscape["Raise SecurityViolationError (Directory Escape)"]
    LocalCheck -->|"Yes"| ScanLocalTree["Traverse Directory Tree In-Place"]

    ExtractEntry --> MemberPathCheck{"Member Path contains '..' or Windows Drive Letter?"}
    MemberPathCheck -->|"Yes (ZipSlip)"| RejectZipSlip["Raise SecurityViolationError (Path Traversal)"]
    MemberPathCheck -->|"No"| CheckExpansionRatio{"Current Expansion Ratio > 10.0x OR Total > 150 MB?"}

    CheckExpansionRatio -->|"Yes (Decompression Bomb)"| RejectBomb["Raise RepositoryLimitExceededError (Bomb Detected)"]
    CheckExpansionRatio -->|"No"| WriteFile["Unpack Member into Scratch Workspace"]

    WriteFile --> HasMoreMembers{"Remaining Archive Members?"}
    HasMoreMembers -->|"Yes"| ExtractEntry
    HasMoreMembers -->|"No"| ScanLocalTree

    ScanLocalTree --> SecretFilter["Filter Out Credential Patterns (.env, *.pem, id_rsa)"]
    SecretFilter --> CountLOC["Determine Language, Byte Size & Calculate Physical LOC"]
    CountLOC --> CommitSnapshot["Persist RepositorySnapshot & Files to PostgreSQL"]
    CommitSnapshot --> SuccessReady(["Repository Marked READY"])

    RejectSSRF --> IngestFailed(["Ingestion Marked FAILED<br/>(Prior Snapshot Preserved)"])
    RejectDownloadLimit --> IngestFailed
    RejectLocalEscape --> IngestFailed
    RejectZipSlip --> IngestFailed
    RejectBomb --> IngestFailed

    classDef danger fill:#7f1d1d,stroke:#ef4444,stroke-width:2px,color:#ffffff;
    classDef success fill:#14532d,stroke:#22c55e,stroke-width:2px,color:#ffffff;
    classDef branch fill:#1e293b,stroke:#94a3b8,stroke-width:1px,color:#ffffff;

    class RejectSSRF,RejectDownloadLimit,RejectLocalEscape,RejectZipSlip,RejectBomb,IngestFailed danger;
    class SuccessReady success;
    class DetectType,DNSCheck,SizeCheck,LocalCheck,MemberPathCheck,CheckExpansionRatio,HasMoreMembers branch;
```

---

## Database Entity Relationship Diagram

The following diagram models the PostgreSQL relational schema implemented via SQLAlchemy 2.0 and versioned with Alembic migrations (`0001_initial` through `0004_phase3_dependency_intelligence`).

```mermaid
erDiagram
    REPOSITORIES ||--o{ REPOSITORY_SNAPSHOTS : "owns"
    REPOSITORIES ||--o{ ANALYSIS_RUNS : "initiates"
    REPOSITORIES ||--o{ DEPENDENCY_RUNS : "evaluates"
    REPOSITORIES ||--o{ ARCHITECTURE_RUNS : "governs"
    REPOSITORIES ||--o{ CODEBASE_HEALTH_ASSESSMENTS : "assesses"

    REPOSITORY_SNAPSHOTS ||--o{ REPOSITORY_FILES : "contains"
    REPOSITORY_SNAPSHOTS ||--o{ ANALYSIS_RUNS : "benchmarks"
    REPOSITORY_SNAPSHOTS ||--o{ DEPENDENCY_RUNS : "targets"
    REPOSITORY_SNAPSHOTS ||--o{ ARCHITECTURE_RUNS : "models"
    REPOSITORY_SNAPSHOTS ||--o{ CODEBASE_HEALTH_ASSESSMENTS : "grades"

    ANALYSIS_RUNS ||--o{ ANALYSIS_FINDINGS : "emits"
    ARCHITECTURE_RUNS ||--o{ ARCHITECTURE_VIOLATIONS : "detects"

    ADVISORY_DATASETS ||--o{ VULNERABILITY_ADVISORIES : "catalogs"

    DEPENDENCY_RUNS ||--o{ REPOSITORY_DEPENDENCIES : "discovers"
    DEPENDENCY_RUNS ||--o{ DEPENDENCY_VULNERABILITIES : "matches"
    REPOSITORY_DEPENDENCIES ||--o{ DEPENDENCY_VULNERABILITIES : "flags"

    REPOSITORIES {
        string id PK
        string name
        string source_type
        string source_identifier
        string status
        string default_branch
        datetime last_ingested_at
        datetime created_at
    }

    REPOSITORY_SNAPSHOTS {
        string id PK
        string repository_id FK
        string status
        string commit_sha
        int file_count
        int source_file_count
        bigint total_size_bytes
        int total_lines_of_code
        json language_distribution
        json metrics_json
        datetime started_at
        datetime completed_at
    }

    REPOSITORY_FILES {
        string id PK
        string snapshot_id FK
        string relative_path
        string file_name
        string extension
        string language
        string category
        bigint size_bytes
        boolean is_source_file
        boolean is_binary
        int line_count
        string sha256
    }

    ANALYSIS_RUNS {
        string id PK
        string repository_id FK
        string snapshot_id FK
        string status
        string rule_set_version
        int files_discovered
        int files_analyzed
        int findings_count
        json summary_json
        datetime started_at
        datetime completed_at
    }

    ANALYSIS_FINDINGS {
        string id PK
        string analysis_run_id FK
        string repository_id FK
        string snapshot_id FK
        string rule_id
        string severity
        string category
        string file_path
        int start_line
        int start_column
        int end_line
        string evidence_summary
        string fingerprint
        json metadata_json
    }

    ADVISORY_DATASETS {
        string id PK
        string dataset_version UK
        string source_name
        string status
        int records_count
        string checksum
    }

    VULNERABILITY_ADVISORIES {
        string id PK
        string dataset_id FK
        string advisory_id
        string ecosystem
        string package_name
        string severity
        float cvss_score
        json cve_ids
        json affected_ranges_json
        json fixed_versions_json
    }

    DEPENDENCY_RUNS {
        string id PK
        string repository_id FK
        string snapshot_id FK
        string status
        string advisory_dataset_version
        int dependencies_discovered
        int dependencies_resolved
        int vulnerabilities_count
        int manifest_files_count
        json summary_json
        datetime started_at
        datetime completed_at
    }

    REPOSITORY_DEPENDENCIES {
        string id PK
        string dependency_run_id FK
        string repository_id FK
        string snapshot_id FK
        string manifest_path
        string ecosystem
        string package_name
        string version_constraint
        string resolved_version
        string dependency_type
        boolean is_direct
        string status
    }

    DEPENDENCY_VULNERABILITIES {
        string id PK
        string dependency_run_id FK
        string dependency_id FK
        string repository_id FK
        string advisory_id
        string ecosystem
        string package_name
        string resolved_version
        string affected_range
        string severity
        float cvss_score
        string remediation_version
        string manifest_path
        string fingerprint
    }

    ARCHITECTURE_RUNS {
        string id PK
        string repository_id FK
        string snapshot_id FK
        string status
        int modules_analyzed
        int internal_edges_count
        int external_deps_count
        int cycles_count
        int violations_count
        boolean policy_configured
        datetime started_at
        datetime completed_at
    }

    ARCHITECTURE_VIOLATIONS {
        string id PK
        string architecture_run_id FK
        string repository_id FK
        string snapshot_id FK
        string rule_id
        string violated_boundary
        string source_module
        string target_module
        string severity
        string fingerprint
        datetime created_at
    }

    CODEBASE_HEALTH_ASSESSMENTS {
        string id PK
        string repository_id FK
        string snapshot_id FK
        string scoring_version
        float overall_score
        string status
        json dimensions_json
        json recommendations_json
        datetime assessed_at
    }
```

---

## Core Algorithm & Logic Explanation

CodeSentinel AI guarantees reproducible codebase intelligence by relying on three deterministic algorithms:

### 1. McCabe Cyclomatic Complexity Calculation

Instead of counting raw regex patterns, the engine parses code into an Abstract Syntax Tree (AST) and calculates cyclomatic complexity ($M$) strictly according to graph theory:

$$M = E - N + 2P$$

In AST traversal, this equates to 1 plus the count of formal decision nodes:
- **Python**: `if`, `elif`, `for`, `while`, `and`, `or`, `except`, `with`, and list/set/dict comprehensions.
- **JavaScript / TypeScript**: `IfStatement`, `ForStatement`, `WhileStatement`, `DoStatement`, `ConditionalExpression` (ternary), `BinaryExpression` (`&&`, `||`), and `CatchClause`.

Functions exceeding threshold 10 trigger `*-COMPLEXITY-001`, documenting the exact offending function boundary span (`start_line` to `end_line`) and the exact complexity score.

### 2. Dual-Ecosystem Semantic Version Matching

When auditing package dependencies, generic regex engines produce catastrophic errors when evaluating version constraints. CodeSentinel AI implements two formal matching engines:
- **Python (PEP 440)**: Uses Python's canonical `packaging.version.Version` and `packaging.specifiers.SpecifierSet` to evaluate epochs, pre-releases, and OSV event ranges (`introduced <= version < fixed`).
- **Node.js / npm (Semver 2.0.0)**: Implements a pure-Python `NpmRangeEvaluator` supporting hyphen ranges (`1.0.0 - 2.5.0`), carets (`^1.2.3`), tildes (`~1.2.3`), wildcards (`2.x`), and logical disjunctions (`||`).

```mermaid
flowchart TD
    PackageInput["Discovered Package & Resolved Version"] --> CheckEco{"Ecosystem?"}

    CheckEco -->|"Python / PyPI"| PyPEP503["Normalize Name (PEP 503)"]
    CheckEco -->|"npm / Node.js"| NpmNorm["Normalize Scoped / Unscoped Name"]

    PyPEP503 --> AdvisoryQuery["Query Active Offline Advisory Dataset"]
    NpmNorm --> AdvisoryQuery

    AdvisoryQuery --> HasAdvisories{"Matching Advisories Found?"}
    HasAdvisories -->|"No"| MarkSafe["Mark Dependency as UNFLAGGED"]
    HasAdvisories -->|"Yes"| EvalRange{"Evaluate Version against Affected Range"}

    EvalRange -->|"Python (PEP 440 Engine)"| PEPCheck{"Version in SpecifierSet OR OSV introduced <= v < fixed?"}
    EvalRange -->|"npm (Semver Engine)"| SemverCheck{"Version matches NpmRangeEvaluator?"}

    PEPCheck -->|"True"| EmitVuln["Emit DependencyVulnerability Record"]
    PEPCheck -->|"False"| MarkSafe
    SemverCheck -->|"True"| EmitVuln
    SemverCheck -->|"False"| MarkSafe

    EmitVuln --> Fingerprint["Compute Stable SHA-256 Fingerprint"]
    Fingerprint --> PersistFinding["Save to PostgreSQL with Remediation Version"]

    classDef alert fill:#831843,stroke:#ec4899,stroke-width:2px,color:#ffffff;
    classDef safe fill:#14532d,stroke:#22c55e,stroke-width:2px,color:#ffffff;
    class EmitVuln alert;
    class MarkSafe safe;
```

### 3. Cryptographic Evidence Fingerprinting

Every finding generated by the platform receives an immutable SHA-256 fingerprint:

$$\text{Fingerprint} = \text{SHA-256}(\text{rule\_id} + \text{":"} + \text{file\_path} + \text{":"} + \text{start\_line} + \text{":"} + \text{evidence\_summary})$$

This fingerprint allows CI/CD systems and development teams to differentiate net-new issues from acknowledged existing findings across repeated pull request scans without relying on fragile auto-incrementing database identifiers.

---

## Error Handling Reference

CodeSentinel AI implements centralized, typed exception handling. Errors never leak sensitive system traces or host path topologies to the client.

| Error Code | HTTP Status | Description |
| :--- | :---: | :--- |
| `VALIDATION_ERROR` | `422` | Request schema validation failure (e.g., malformed URL, invalid pagination bounds, or invalid ecosystem name). |
| `NOT_FOUND` | `404` | Requested entity does not exist (e.g., repository ID, snapshot ID, analysis run, or advisory dataset). |
| `CONFLICT` | `409` | Operation conflicts with existing entity state (e.g., duplicate repository identifier or advisory version). |
| `SOURCE_VALIDATION_ERROR` | `400` | Repository source failed preliminary syntax or format validation (e.g., malformed Git remote URL). |
| `SECURITY_VIOLATION` | `400` | Security sandbox violation: SSRF attempt (private/loopback/cloud IP), TarSlip/ZipSlip traversal, or symlink escape. |
| `REPOSITORY_ACCESS_ERROR` | `400` | Target repository could not be acquired (e.g., private GitHub repo without credentials, or unreadable local directory). |
| `REPOSITORY_LIMIT_EXCEEDED` | `413` | Ingested repository exceeded safety ceilings: archive &gt; 50 MB, extracted &gt; 150 MB, expansion ratio &gt; 10.0x, or file count &gt; 10,000. |
| `DATABASE_UNAVAILABLE` | `503` | Database connectivity failure or connection pool exhaustion. |
| `INTERNAL_ERROR` | `500` | Unhandled internal exception; safe generic error returned to client while sanitized trace is logged internally. |

---

## Testing & Quality Assurance

The codebase maintains automated test coverage across both backend deterministic engines and frontend interactive components.

### Backend Test Suite (Pytest)

The backend test suite includes **159 automated tests** covering security sandboxing regressions, AST parsers, static rule correctness, multi-manifest SCA parsers, dependency graph resolution, Martin's coupling metrics, Tarjan's SCC cycle detection, architectural policy enforcement, and codebase health scoring:

```bash
# Run complete backend test suite
pytest -v backend/tests

# Run Phase 5 architecture & health tests specifically
pytest -v backend/tests/test_dependency_graph.py backend/tests/test_architecture_policy.py backend/tests/test_codebase_health.py backend/tests/test_architecture_api.py

# Run security regression tests specifically
pytest -v backend/tests/test_security_regressions.py
```

### Frontend Test Suite (Vitest)

The frontend test suite includes **42 unit and integration tests** across 12 test suites written in Vitest and React Testing Library:

```bash
cd frontend

# Run complete Vitest suite
npm test -- --run

# Run TypeScript compilation and typecheck
npm run build

# Run Oxlint validation
npx oxlint
```

---

## Design Philosophy

1. **Truth-First Determinism Over LLM Hallucinations**
   Language models must never be permitted to invent facts about a codebase. AST parsing, cyclomatic complexity, physical LOC, and version comparisons are strictly deterministic. AI is reserved exclusively for explaining and prioritizing verified ground-truth evidence.
2. **Zero Untrusted Code Execution**
   Analyzing a repository must never introduce an exploitation vector. Target source code is never executed, built, imported, or executed via package managers (`npm install` or `pip install` are never invoked on analyzed code).
3. **Reproducible, Evidence-Grounded Findings**
   Every finding must produce an unambiguous audit trail: exact file paths, line/column coordinates, rule versions, and cryptographic fingerprints. If a scan is executed twice on identical inputs, it must yield byte-for-byte identical findings.
4. **Local-First & Air-Gapped Autonomy**
   Security tools should not mandate external cloud dependencies. CodeSentinel AI is fully capable of running completely offline, using bundled, cryptographically checked advisory datasets.
5. **Zero Synthetic Vanity Metrics**
   CodeSentinel AI rejects subjective, proprietary "quality scores" (e.g., arbitrary "82/100 code health"). We report objective measurements: cyclomatic complexity, physical LOC, exact dependency versions, and verified CVE records.

---

## Product Roadmap

- [x] **Phase 1: Deterministic Ingestion & Sandbox (Complete)**
  - Public GitHub streaming tarball ingestion with redirect validation
  - Local repository discovery within configured boundary roots
  - Multi-vector sandboxing: SSRF, TarSlip, ZipSlip, symlink confinement, and decompression bomb protection
  - Deterministic file classification, LOC calculation, and atomic snapshot persistence
  - React 19 + Tailwind CSS developer dashboard
- [x] **Phase 2: AST Static Analysis & Deterministic Rules Engine (Complete)**
  - Python stdlib `ast` syntax parser and McCabe cyclomatic complexity calculator
  - JavaScript/TypeScript compiler API adapter (`ts.createSourceFile`)
  - Deterministic ruleset: `*-SYNTAX-001`, `*-COMPLEXITY-001`, `*-FUNCTION-001`, `PY-IMPORT-001`
  - SHA-256 finding fingerprinting and coordinate clamping
- [x] **Phase 3: Dependency Intelligence & Software Composition Analysis (Complete)**
  - Manifest & lockfile parsers: `requirements.txt`, `pyproject.toml`, `poetry.lock`, `Pipfile.lock`, `package.json`, `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock` (v1)
  - Canonical package normalization (PEP 503 PyPI & npm)
  - PEP 440 (`packaging`) and Semver 2.0.0 (`NpmRangeEvaluator`) range matching engines
  - Offline vulnerability advisory catalog ingestion with provenance tracking
- [ ] **Phase 4: Semantic Knowledge Graph & Multi-Language ASTs (In Progress)**
  - Tree-sitter parser integration for Go, Rust, Java, and C/C++
  - Cross-file symbol dependency and call-graph generation
  - Test runner intelligence and line coverage correlation
- [ ] **Phase 5: Grounded AI Reasoning & Bounded Agency (Planned)**
  - PostgreSQL `pgvector` indexing and hybrid semantic/AST code search
  - Retrieval-Augmented Generation (RAG) strictly grounded in verified deterministic findings
  - AI Codebase Assistant explaining root causes and drafting verifiable, test-backed pull request diffs

---

## Authors & Contributors

Developed and maintained by **[Akhil Bansal](https://github.com/Akhil-Bansal17)**.

Contributions, feature suggestions, and security vulnerability reports are welcome. Please open an issue or pull request in the [GitHub Repository](https://github.com/Akhil-Bansal17/CodeSentinel-AI).

---

## License

CodeSentinel AI is open-source software licensed under the [MIT License](LICENSE).
