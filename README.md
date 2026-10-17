# CodeSentinel AI

> **Deterministic Software Engineering Intelligence & Automated Codebase Governance**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.1.0-emerald.svg)](https://github.com/Akhil-Bansal17/CodeSentinel-AI/releases)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](#testing)
[![Python](https://img.shields.io/badge/python-3.12%20%7C%203.14-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6.svg)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791.svg)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](docker-compose.yml)

---

## Overview

CodeSentinel AI is a local-first software engineering intelligence and automated codebase governance platform engineered for engineering leads, security teams, and platform architects who need transparent, verifiable repository diagnostics without relying on hallucinating LLMs. Unlike generic "AI coding wrappers" that blindly pipe unvetted source files into language models and fabricate non-existent CVEs or synthetic quality scores, CodeSentinel AI strictly decouples **deterministic static inspection** from **high-level reasoning**. Grounded in AST parsing, McCabe cyclomatic complexity calculation, multi-manifest Software Composition Analysis (SCA), specification-compliant version matching (PEP 440 and Semver 2.0.0), Martin's architectural coupling metrics, Tarjan's cycle detection, syntax-aware chunking, and Reciprocal Rank Fusion code retrieval, every finding emitted by CodeSentinel AI is cryptographically fingerprinted, isolated to exact source line/column coordinates, and backed by verifiable evidence with zero untrusted code execution.

---

## Feature Table

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
| **Syntax-Aware Code Chunking** | AST-based chunking for Python and JS/TS extracting functions, classes, and declarations, with Markdown heading chunking and sliding window fallbacks. |
| **Intelligent Code Search** | Multi-mode search supporting BM25Okapi lexical retrieval with identifier tokenization, dense vector cosine similarity semantic retrieval, and Reciprocal Rank Fusion (RRF) hybrid retrieval. |
| **Evidence-Backed Repository Q&A** | Deterministic evidence-backed repository answers citing verified source locations with line ranges, uncertainty detection, and prompt injection defense. |
| **Automated Remediation & Safe Patch Synthesis** | Transforms supported static and dependency findings into reviewable, validated patch proposals with in-memory AST syntax validation, anti-drift hashing, and safe human-approved application. |
| **Modern Developer Dashboard** | Responsive React 19 + Vite 8 + Tailwind CSS dark-mode dashboard with Code Search, AI Assistant, Remediation Console, paginated file explorers, dependency graphs, architecture viewers, and live telemetry. |

---

## "What It Can Do Now"

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
- **Indexes Codebases Incrementally (Phase 6)**: Extracts syntax-aware chunks (functions, classes, methods, imports, doc sections) from immutable snapshot source files with SHA-256 content fingerprints and line/column coordinates.
- **Performs Lexical, Semantic & Hybrid Code Search**: BM25Okapi lexical retrieval with snake_case/camelCase sub-tokenization and symbol boosting; dense vector cosine similarity; and Reciprocal Rank Fusion ($k=60$) hybrid ranking.
- **Answers Repository Inquiries Grounded in Evidence**: Evaluates evidence sufficiency, answers questions with verifiable line-coordinate citations, detects insufficient evidence honestly, and sandboxes retrieved code against prompt injection.
- **Provides Zero-Key Operation with Optional Pluggable LLM/Embeddings**: Works out of the box with zero external API keys via deterministic grounded synthesis; optionally connects to configured local or external embedding and LLM providers.
- **Synthesizes Validated Code Patches (Phase 7)**: Transforms verified security and dependency findings into line-accurate unified diffs using deterministic AST transformations (`FIX-PYSEC001`, `FIX-PYSEC005`, `FIX-PYSEC004`, `FIX-PYSEC003`, `FIX-DEP-UPGRADE-VERSION`).
- **Enforces 5-Stage In-Memory Patch Validation**: Validates source integrity, patch structure, AST syntax parsing (`ast.parse`), deterministic static security rule elimination, and regression risk disclosure before human review without executing target repository code.
- **Requires Explicit Human Approval for Patch Application**: Enforces strict lifecycle decoupling (`PROPOSED` → `VALIDATING` → `VALIDATED` → `APPROVED` → `APPLIED`), preventing unauthorized or automatic filesystem modifications.
- **Guarantees Anti-Drift & Path Traversal Confinement**: Enforces pre-write and post-write SHA-256 hash checks, atomic temporary file replacement, protected path blocking (`.env`, `.git`), and read-only archive fallback to diff exports.
- **Issues stable SHA-256 finding fingerprints**: Guarantees idempotent issue tracking: `sha256(rule_id:file_path:start_line:evidence_summary)`.
- **Delivers a production REST API & React UI**: Features 36+ OpenAPI endpoints, structured JSON logging, and a low-latency React 19 dashboard with dedicated Code Search, AI Assistant, and Remediation Review consoles.

---

## The Problem

Engineering leaders and platform teams struggle to maintain codebase health, track security posture, and govern technical debt. Current market approaches fail across multiple operational dimensions:

| Dimension | "AI Wrapper" Coding Assistants | Monolithic Legacy SAST/SCA | Ad-Hoc Scripts & Linters | CodeSentinel AI |
| :--- | :--- | :--- | :--- | :--- |
| **Truth Grounding** | **Poor**: Hallucinates non-existent CVEs, deprecated APIs, and synthetic scores. | **Fair**: Rule-based, but generates high false-positive volumes with opaque heuristics. | **Good**: Deterministic, but output is fragmented across disparate tool formats. | **Absolute**: Deterministic AST/SCA baseline; zero synthetic scores; verifiable evidence coordinates. |
| **Execution Safety** | **Risky**: Cloud-dependent; source code leaves security perimeters to third-party APIs. | **Moderate**: Requires proprietary agents or heavyweight server compute. | **High Risk**: Many tools run build hooks (`setup.py`, `npm postinstall`) during scan. | **Zero Execution**: Code is parsed statically; never built, executed, or exported off-host. |
| **Air-Gap Capability** | **None**: Requires active internet connectivity to external LLM providers. | **Complex**: Expensive on-premise appliances with heavy license servers. | **Manual**: Requires configuring multiple disconnected offline package mirrors. | **Native**: Fully autonomous; runs locally with bundled, version-controlled advisory catalogs. |
| **Dependency Precision** | **Hallucinated**: Guesses transitive dependencies based on prompt tokens. | **Variable**: Often assumes top-level constraint equals installed version. | **Brittle**: Inconsistent between npm audit, pip-audit, and manual regex checks. | **Rigorous**: PEP 440 and Semver 2.0.0 specs; clearly separates declared vs. resolved versions. |
| **Architectural Governance** | **Surface-level**: Summarizes files textually without graph-theoretical rigor. | **Opaque**: Complex enterprise setups requiring deep configuration. | **Fragmented**: Separate import-linter configs with no unified health score. | **Formal**: Martin's coupling metrics, Tarjan's SCC cycle clusters, and JSON declarative boundary policies. |
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

### 1. Ingest a Repository & Execute Static Analysis

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

### 2. Evidence-Backed Repository Q&A Response

#### Request: Ask an Architectural Question
```bash
curl -X POST http://127.0.0.1:8000/api/v1/search/qa \
  -H "Content-Type: application/json" \
  -d '{
    "repository_id": "7f920be3-c21e-4509-9ec4-ff70d8a25c11",
    "question": "Where is user authentication implemented in this repository?"
  }'
```

#### Output: Grounded Evidence with Citations
```json
{
  "answer": "User authentication is implemented in 'backend/app/services/auth/service.py'. Specifically, the 'authenticate_user' function (lines 45-82) validates bearer JWT credentials against password hashes stored in the database.",
  "repository_id": "7f920be3-c21e-4509-9ec4-ff70d8a25c11",
  "snapshot_id": "a4d3e8e1-5e72-4d51-87c2-9e9f1a0e3b62",
  "status": "answered",
  "retrieval_mode": "hybrid",
  "used_llm": false,
  "confidence": 0.94,
  "citations": [
    {
      "chunk_id": "9d41b6...f3",
      "file_path": "backend/app/services/auth/service.py",
      "start_line": 45,
      "end_line": 82,
      "symbol_name": "authenticate_user"
    }
  ]
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

### 6. Inspect Discovered Dependency Inventory & Vulnerabilities
```bash
curl -X GET "http://127.0.0.1:8000/api/v1/dependency-analyses/6d1c9ef0-0a22-4876-9d3e-90f77ea61190/dependencies?ecosystem=npm&is_direct=true"
curl -X GET "http://127.0.0.1:8000/api/v1/dependency-analyses/6d1c9ef0-0a22-4876-9d3e-90f77ea61190/vulnerabilities?severity=HIGH"
```

### 7. Run Architectural Governance & Coupling Evaluation
```bash
curl -X POST "http://127.0.0.1:8000/api/v1/architecture/runs" \
  -H "Content-Type: application/json" \
  -d '{
    "repository_id": "7f920be3-c21e-4509-9ec4-ff70d8a25c11"
  }'
```

### 8. Fetch Codebase Health Score & Dimension Telemetry
```bash
curl -X GET "http://127.0.0.1:8000/api/v1/architecture/health/7f920be3-c21e-4509-9ec4-ff70d8a25c11"
```

### 9. Index Codebase Snapshot for Search & Q&A
```bash
curl -X POST "http://127.0.0.1:8000/api/v1/search/index" \
  -H "Content-Type: application/json" \
  -d '{
    "repository_id": "7f920be3-c21e-4509-9ec4-ff70d8a25c11",
    "snapshot_id": "a4d3e8e1-5e72-4d51-87c2-9e9f1a0e3b62"
  }'
```

### 10. Execute Hybrid Code Search
```bash
curl -X POST "http://127.0.0.1:8000/api/v1/search/search" \
  -H "Content-Type: application/json" \
  -d '{
    "repository_id": "7f920be3-c21e-4509-9ec4-ff70d8a25c11",
    "query": "SSRF guard redirect check",
    "mode": "hybrid",
    "limit": 10
  }'
```

### 11. Check Finding Remediation Availability
```bash
curl -X GET "http://127.0.0.1:8000/api/v1/remediation/findings/e812a674-c5a4-4a57-b249-1d428bf61298/availability"
```

### 12. Synthesize & Validate a Remediation Patch Proposal
```bash
curl -X POST "http://127.0.0.1:8000/api/v1/remediation/proposals" \
  -H "Content-Type: application/json" \
  -d '{
    "repository_id": "7f920be3-c21e-4509-9ec4-ff70d8a25c11",
    "snapshot_id": "a4d3e8e1-5e72-4d51-87c2-9e9f1a0e3b62",
    "finding_id": "e812a674-c5a4-4a57-b249-1d428bf61298"
  }'
```

### 13. Approve a Validated Patch Proposal
```bash
curl -X POST "http://127.0.0.1:8000/api/v1/remediation/proposals/3c847d01-e28a-4d2b-91c8-2b1239845701/approve" \
  -H "Content-Type: application/json" \
  -d '{
    "approved_by": "akhil@codesentinel.ai",
    "notes": "Verified that literal_eval safely replaces eval for parsing user configuration"
  }'
```

### 14. Apply an Approved Patch to Local Workspace
```bash
curl -X POST "http://127.0.0.1:8000/api/v1/remediation/proposals/3c847d01-e28a-4d2b-91c8-2b1239845701/apply" \
  -H "Content-Type: application/json" \
  -d '{
    "applied_by": "akhil@codesentinel.ai"
  }'
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
| `INDEX_VERSION` | `1.0.0` | Invalidation version for chunk parsing and indexing rules |
| `MAX_INDEX_FILES` | `2500` | Maximum number of source files indexed per repository snapshot |
| `CHUNK_MAX_LINES` | `120` | Maximum line span for an individual symbol chunk before splitting |
| `CHUNK_FALLBACK_LINES` | `80` | Fallback chunk window for unrecognized languages |
| `CHUNK_OVERLAP_LINES` | `15` | Overlap between sliding window fallback chunks |
| `EMBEDDING_PROVIDER` | `none` | Embedding provider (`none`, `local`, `test`, `openai`) |
| `LLM_PROVIDER` | `none` | Question answering LLM provider (`none`, `test`, `http`) |
| `QA_MAX_EVIDENCE_CHUNKS` | `8` | Maximum evidence chunks retrieved for synthesis |
| `QA_RELEVANCE_THRESHOLD` | `0.05` | Minimum relevance score required to consider evidence sufficient |

---

## System Architecture Diagram

*Figure 1: Multi-tiered system topology illustrating decoupled ingestion, static analysis, architectural governance, search, and persistence pipelines.*

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

    subgraph IngestionTier["Sandbox & Ingestion Engine"]
        Validator["Source Validator & SSRF Guard"]
        Acquisition["Streaming Downloader & Local Resolver"]
        SafeExtract["Safe Extractor<br/>(TarSlip / ZipSlip / Bomb Guard)"]
        Discovery["File Discovery & Secret Filter"]
        Metrics["Deterministic Metrics Engine<br/>(LOC & Proportional Language Shares)"]
    end

    subgraph AnalysisTier["Deterministic AST Analysis Engine"]
        PyParser["Python AST Parser<br/>(stdlib ast.parse)"]
        TsParser["TypeScript AST Adapter<br/>(Node.js + ts.createSourceFile)"]
        RuleRegistry["Deterministic Rule Registry<br/>(McCabe Complexity, Function Span, Syntax)"]
        SecRules["AppSec Intelligence Rules<br/>(Dynamic Exec, Deserialization, SQL Injection)"]
        Normalizer["Finding Normalizer & Fingerprinter<br/>(SHA-256 Hasher)"]
    end

    subgraph SCATier["Dependency Intelligence & SCA Engine"]
        ManifestParser["Manifest & Lockfile Parsers<br/>(pip, poetry, pipenv, npm, pnpm, yarn)"]
        InventoryNormalizer["Identity Normalizer<br/>(PEP 503 PyPI & npm Canonicalization)"]
        PEP440Engine["PEP 440 Matcher<br/>(packaging.version)"]
        SemverEngine["Semver 2.0.0 Matcher<br/>(NpmRangeEvaluator)"]
        AdvisoryCatalog[("Local Advisory Catalog<br/>(OSV / CVE Datasets)")]
    end

    subgraph ArchitectureTier["Architectural Governance & Health Engine"]
        ModuleGraph["Module Import Graph Builder<br/>(Internal vs External Edges)"]
        CouplingCalc["Martin's Coupling Metrics<br/>(Ca, Ce, Instability, Abstractness, Distance)"]
        TarjanSCC["Tarjan's SCC Cycle Detector<br/>(Circular Dependency Clusters)"]
        PolicyEngine["Declarative Boundary Policy<br/>(codesentinel.architecture.json)"]
        HealthIndex["5-Pillar Health Score Aggregator<br/>(Maintainability, Security, Arch, Deps, Cov)"]
    end

    subgraph SearchTier["Semantic Code Search & Grounded Q&A Engine"]
        Chunker["Syntax-Aware AST Chunker<br/>(Python, JS/TS, Markdown)"]
        LexicalBM25["BM25Okapi Lexical Indexer<br/>(CamelCase & Snake_Case Sub-Tokens)"]
        CosineVector["Dense Vector Semantic Evaluator<br/>(Cosine Similarity Engine)"]
        RRF["Reciprocal Rank Fusion<br/>(RRF k=60 Hybrid Combiner)"]
        PromptGuard["Prompt Injection Guard<br/>(Untrusted Delimiters)"]
        QASynthesizer["Evidence-Backed Grounded Q&A<br/>(Deterministic Zero-Key / Optional LLM)"]
    end

    subgraph StorageTier["Persistence & Telemetry Layer"]
        Postgres[("PostgreSQL 16 Engine<br/>(SQLAlchemy 2.0 + Alembic)")]
        Snapshots[("Snapshot & File Metadata")]
        FindingsDB[("Findings & Vulnerabilities")]
        ArchDB[("Architecture Runs & Violations")]
        ChunkDB[("Code Chunks & Embeddings")]
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
    RuleRegistry --> SecRules
    SecRules --> Normalizer
    Normalizer --> FindingsDB

    Snapshots --> ManifestParser
    ManifestParser --> InventoryNormalizer
    InventoryNormalizer --> PEP440Engine
    InventoryNormalizer --> SemverEngine
    AdvisoryCatalog --> PEP440Engine
    AdvisoryCatalog --> SemverEngine
    PEP440Engine --> FindingsDB
    SemverEngine --> FindingsDB

    Snapshots --> ModuleGraph
    ModuleGraph --> CouplingCalc
    ModuleGraph --> TarjanSCC
    ModuleGraph --> PolicyEngine
    PolicyEngine --> ArchDB
    CouplingCalc --> HealthIndex
    TarjanSCC --> HealthIndex
    FindingsDB --> HealthIndex
    HealthIndex --> ArchDB

    Snapshots --> Chunker
    Chunker --> ChunkDB
    ChunkDB --> LexicalBM25
    ChunkDB --> CosineVector
    LexicalBM25 --> RRF
    CosineVector --> RRF
    RRF --> PromptGuard
    PromptGuard --> QASynthesizer
    QASynthesizer --> APIClient

    classDef critical fill:#1e3a8a,stroke:#3b82f6,stroke-width:2px,color:#ffffff;
    classDef security fill:#831843,stroke:#ec4899,stroke-width:2px,color:#ffffff;
    classDef engine fill:#14532d,stroke:#22c55e,stroke-width:2px,color:#ffffff;
    classDef ai fill:#581c87,stroke:#a855f7,stroke-width:2px,color:#ffffff;

    class SafeExtract,Validator,PromptGuard security;
    class RuleRegistry,PEP440Engine,SemverEngine,PolicyEngine critical;
    class Metrics,Discovery,ManifestParser,CouplingCalc,TarjanSCC,HealthIndex engine;
    class Chunker,RRF,QASynthesizer ai;
```

---

## Core Workflow Sequence Diagram

*Figure 2: End-to-end repository audit lifecycle across ingestion, AST evaluation, SCA correlation, architectural analysis, indexing, and grounded retrieval.*

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
    participant ArchSvc as Architecture Governance Engine
    participant SearchSvc as Search & Q&A Engine

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

    opt Trigger Code Quality & AppSec Scan
        Dev->>UI: Click "Run Static Analysis"
        UI->>API: POST /api/v1/repositories/{id}/analyses
        API->>AnalysisSvc: execute_analysis_run(repo_id, snapshot_id)
        AnalysisSvc->>DB: Load source file paths
        AnalysisSvc->>AnalysisSvc: Parse ASTs (Python stdlib & TS compiler)
        AnalysisSvc->>AnalysisSvc: Evaluate complexity & 10 AppSec rules
        AnalysisSvc->>AnalysisSvc: Compute SHA-256 finding fingerprints
        AnalysisSvc->>DB: Persist AnalysisRun & AnalysisFindings
        AnalysisSvc-->>API: AnalysisRunResponse (Completed)
        API-->>UI: Display Paginated Findings & Severity Breakdown
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

    opt Trigger Architecture & Codebase Health Scan
        Dev->>UI: Click "Evaluate Architecture"
        UI->>API: POST /api/v1/architecture/runs
        API->>ArchSvc: execute_architecture_run(repo_id, snapshot_id)
        ArchSvc->>ArchSvc: Extract module import edges (Python & JS/TS)
        ArchSvc->>ArchSvc: Compute Martin's coupling metrics (Ca, Ce, I, A, D)
        ArchSvc->>ArchSvc: Detect circular dependency clusters (Tarjan's SCC)
        ArchSvc->>ArchSvc: Enforce layer boundary rules (codesentinel.architecture.json)
        ArchSvc->>ArchSvc: Calculate 5-pillar health score (0-100)
        ArchSvc->>DB: Persist ArchitectureRun, Violations, & Health Assessment
        ArchSvc-->>API: ArchitectureRunResponse (Completed)
        API-->>UI: Render Dependency Graph, Cycles, & Health Index
    end

    opt Index Snapshot & Query Repository Q&A
        Dev->>UI: Ask Question: "Where is authentication handled?"
        UI->>API: POST /api/v1/search/qa
        API->>SearchSvc: answer_question(repo_id, snapshot_id, query)
        SearchSvc->>DB: Retrieve top candidate chunks via RRF Hybrid Search
        SearchSvc->>SearchSvc: Check evidence sufficiency (score >= 0.05)
        SearchSvc->>SearchSvc: Sandbox retrieved code in <untrusted_repository_evidence>
        SearchSvc->>SearchSvc: Synthesize grounded answer & validate citations
        SearchSvc-->>API: QAResponse (Answer + Line Citations + Confidence)
        API-->>UI: Render Answer with Verifiable Inline Citations
    end
```

---

## Key Decision & Logic Flow: Ingestion Sandbox

*Figure 3: Multi-stage security validation, path traversal guard, and decompression bomb mitigation pipeline.*

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

## Database / Entity Relationship Diagram

*Figure 4: Complete PostgreSQL relational schema illustrating domain entities, snapshot relationships, findings, architectural graphs, and code chunk indexes.*

```mermaid
erDiagram
    REPOSITORIES ||--o{ REPOSITORY_SNAPSHOTS : "owns"
    REPOSITORIES ||--o{ ANALYSIS_RUNS : "initiates"
    REPOSITORIES ||--o{ DEPENDENCY_RUNS : "evaluates"
    REPOSITORIES ||--o{ ARCHITECTURE_RUNS : "governs"
    REPOSITORIES ||--o{ CODEBASE_HEALTH_ASSESSMENTS : "assesses"
    REPOSITORIES ||--o{ CODE_INDEX_RUNS : "indexes"

    REPOSITORY_SNAPSHOTS ||--o{ REPOSITORY_FILES : "contains"
    REPOSITORY_SNAPSHOTS ||--o{ ANALYSIS_RUNS : "benchmarks"
    REPOSITORY_SNAPSHOTS ||--o{ DEPENDENCY_RUNS : "targets"
    REPOSITORY_SNAPSHOTS ||--o{ ARCHITECTURE_RUNS : "models"
    REPOSITORY_SNAPSHOTS ||--o{ CODEBASE_HEALTH_ASSESSMENTS : "grades"
    REPOSITORY_SNAPSHOTS ||--o{ CODE_INDEX_RUNS : "targets"
    REPOSITORY_SNAPSHOTS ||--o{ CODE_CHUNKS : "chunks"

    ANALYSIS_RUNS ||--o{ ANALYSIS_FINDINGS : "emits"
    ARCHITECTURE_RUNS ||--o{ ARCHITECTURE_VIOLATIONS : "detects"
    CODE_INDEX_RUNS ||--o{ CODE_CHUNKS : "produces"

    ADVISORY_DATASETS ||--o{ VULNERABILITY_ADVISORIES : "catalogs"

    DEPENDENCY_RUNS ||--o{ REPOSITORY_DEPENDENCIES : "discovers"
    DEPENDENCY_RUNS ||--o{ DEPENDENCY_VULNERABILITIES : "matches"
    REPOSITORY_DEPENDENCIES ||--o{ DEPENDENCY_VULNERABILITIES : "flags"

    REPOSITORIES ||--o{ REMEDIATION_PROPOSALS : "owns"
    REPOSITORY_SNAPSHOTS ||--o{ REMEDIATION_PROPOSALS : "targets"
    ANALYSIS_FINDINGS ||--o{ REMEDIATION_PROPOSALS : "generates"
    REMEDIATION_PROPOSALS ||--o{ REMEDIATION_VALIDATIONS : "validates"
    REMEDIATION_PROPOSALS ||--o{ REMEDIATION_AUDITS : "audits"

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
        int total_findings
        json summary_json
        datetime started_at
        datetime completed_at
    }

    ANALYSIS_FINDINGS {
        string id PK
        string analysis_run_id FK
        string rule_id
        string rule_name
        string category
        string severity
        string confidence
        string file_path
        int start_line
        int start_column
        int end_line
        int end_column
        string evidence_summary
        string fingerprint
        json metadata_json
        datetime created_at
    }

    ADVISORY_DATASETS {
        string id PK
        string dataset_version
        string ecosystem
        string source_name
        int advisory_count
        string status
        datetime imported_at
    }

    VULNERABILITY_ADVISORIES {
        string id PK
        string dataset_id FK
        string advisory_id
        string ecosystem
        string package_name
        string summary
        string details
        string severity
        float cvss_score
        json affected_versions_json
        datetime published_at
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

    CODE_INDEX_RUNS {
        string id PK
        string repository_id FK
        string snapshot_id FK
        string status
        string index_version
        string embedding_provider
        string embedding_model
        int chunk_count
        int files_indexed
        bigint total_bytes_indexed
        string error_message
        json summary_json
        datetime started_at
        datetime completed_at
    }

    CODE_CHUNKS {
        string id PK
        string repository_id FK
        string snapshot_id FK
        string index_run_id FK
        string relative_path
        int start_line
        int end_line
        int start_col
        int end_col
        string symbol_name
        string symbol_type
        string language
        string chunking_strategy
        string content_hash
        text content
        json embedding
        datetime created_at
    }

    REMEDIATION_PROPOSALS {
        string id PK
        string repository_id FK
        string snapshot_id FK
        string finding_id FK
        string remediation_rule_id
        string target_path
        string original_source_hash
        string target_source_hash
        string status
        string risk_level
        string confidence
        int start_line
        int end_line
        text original_snippet
        text proposed_replacement
        text unified_diff
        text rationale
        datetime created_at
        datetime updated_at
    }

    REMEDIATION_VALIDATIONS {
        string id PK
        string proposal_id FK
        string check_id
        string status
        string message
        json details_json
        datetime executed_at
    }

    REMEDIATION_AUDITS {
        string id PK
        string proposal_id FK
        string action
        string from_status
        string to_status
        string performed_by
        text notes
        json metadata_json
        datetime created_at
    }
```

---

## Core Algorithm & Logic Explanation

CodeSentinel AI guarantees reproducible codebase intelligence by relying on seven deterministic algorithms:

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

### 3. Martin's Package Coupling & Tarjan's SCC Cycle Detection

Architectural quality is quantified using Robert C. Martin's package coupling metrics:
- **Afferent Coupling ($Ca$)**: Count of external modules that depend on this module.
- **Efferent Coupling ($Ce$)**: Count of external modules this module depends upon.
- **Instability ($I$)**:
  $$I = \frac{Ce}{Ca + Ce}$$
- **Abstractness ($A$)**: Ratio of abstract classes/interfaces ($N_a$) to total classes ($N_c$).
- **Normalized Distance ($D$)**: Distance from the Main Sequence line $A + I = 1$:
  $$D = |A + I - 1|$$

Circular dependency clusters are detected in $O(V + E)$ linear time using **Tarjan's Strongly Connected Components (SCC)** algorithm, identifying mutual import deadlocks across modules.

### 4. Explainable 5-Pillar Codebase Health Index

The overall codebase health score (0–100) is evaluated across five weighted engineering dimensions:
- **Maintainability (25%)**: Evaluated against AST complexity, oversized functions, and LOC density.
- **Application Security (25%)**: Evaluated against high-severity security findings.
- **Architecture (20%)**: Evaluated against coupling instability, circular dependencies, and boundary policy violations.
- **Dependency Risk (15%)**: Evaluated against matched CVE counts and CVSS severity scores.
- **Test Coverage (15%)**: Evaluated against unit test file existence and coverage telemetry.

When an input dimension lacks data (e.g., no test files configured), the engine dynamically normalizes the remaining weights to ensure honest, unskewed composite scores:
$$H = \frac{\sum_{i} w_i S_i}{\sum_{i} w_i}$$

### 5. Multi-Mode Search & Hybrid Reciprocal Rank Fusion

CodeSentinel AI implements three distinct retrieval modes without vendor lock-in:
1. **Lexical Retrieval (BM25Okapi)**: Tokenizes source code into both complete identifiers and sub-tokens via `camelCase` and `snake_case` boundary splitting. Query tokens matching exact symbol names or file path components receive deterministic relevance boosts ($1.5\times$ to $2.0\times$).
2. **Dense Vector Semantic Search**: Evaluates cosine similarity between query embeddings and chunk embeddings stored in PostgreSQL/SQLite:
   $$\text{sim}(q, c) = \frac{\mathbf{q} \cdot \mathbf{c}}{\|\mathbf{q}\| \|\mathbf{c}\|}$$
3. **Hybrid Reciprocal Rank Fusion (RRF)**: Combines ranked result lists from both lexical and semantic pipelines using constant $k=60$:
   $$RRF(d) = \sum_{m \in \{\text{lexical}, \text{semantic}\}} \frac{w_m}{60 + r_m(d)}$$

### 6. Grounded Evidence-Backed Q&A & Prompt-Injection Containment

The repository Q&A pipeline enforces strict grounding and sandbox guarantees:
1. **Repository Access & Snapshot Verification**: Queries are bounded to the exact immutable snapshot of the target repository.
2. **Evidence Retrieval & Deduplication**: Retrieves top $N$ candidate chunks using hybrid RRF, deduplicating identical file spans.
3. **Evidence Sufficiency Scoring**: Verifies whether top retrieved chunks cross the relevance threshold ($\ge 0.05$). If evidence is insufficient, the system returns an honest `insufficient` status without guessing.
4. **Deterministic Answer Synthesis (Zero-Key Mode)**: Generates structured, evidence-backed answers summarizing discovered symbols, line ranges, and file relationships without requiring any LLM API key.
5. **Prompt-Injection Defense**: All retrieved code, documentation, and user input are treated as untrusted text. System prompts encapsulate evidence inside `<untrusted_repository_evidence>` blocks and sanitize prompt-hijacking strings (`"ignore previous instructions"`, `"system:"`, etc.).
6. **Citation Validation**: Returned citations are verified against actual chunks in the database. Citations pointing to non-existent files or mismatched line ranges are pruned.

*Figure 5: Hybrid multi-strategy code retrieval and grounded evidence synthesis flow.*

```mermaid
flowchart TD
    UserQuery["User Natural Language Query"] --> Chunker["Tokenize Query (CamelCase, Snake_case, Morphological)"]

    subgraph RetrievalEngines["Multi-Strategy Retrieval Engines"]
        Chunker --> BM25["BM25Okapi Lexical Search<br/>(Symbol & Path Match Boosts)"]
        Chunker --> Embeddings["Dense Vector Embedding<br/>(Optional Local SentenceTransformer)"]
        Embeddings --> Cosine["Cosine Vector Similarity"]
    end

    BM25 --> RRFCombiner["Reciprocal Rank Fusion<br/>RRF(d) = Σ w / (60 + r(d))"]
    Cosine --> RRFCombiner

    RRFCombiner --> Deduplication["Deduplicate Spans & Apply File Filters"]
    Deduplication --> SufficiencyCheck{"Evidence Sufficiency Check<br/>(Top Relevance Score >= 0.05?)"}

    SufficiencyCheck -->|"No (Insufficient Evidence)"| UncertaintyResponse["Return Honest Uncertainty Status<br/>('Cannot answer confidently from available code')"]
    SufficiencyCheck -->|"Yes (Sufficient Ground Truth)"| SandboxWrap["Enclose Chunks in Sandbox:<br/>&lt;untrusted_repository_evidence&gt;"]

    SandboxWrap --> AnsweringEngine{"LLM Mode Configured?"}
    AnsweringEngine -->|"No (Default Zero-Key)"| DeterministicSynth["Deterministic Grounded Synthesizer<br/>(Summarize symbols, locations, coordinates)"]
    AnsweringEngine -->|"Yes (Optional HTTP Provider)"| BoundedLLM["Bounded LLM Answer Generation<br/>(Strict evidence constraint & prompt guard)"]

    DeterministicSynth --> CitationValidator["Citation Coordinate Validator<br/>(Verify against actual snapshot chunk spans)"]
    BoundedLLM --> CitationValidator

    CitationValidator --> FinalOutput(["Verified Grounded Answer with File/Line Citations"])

    classDef secure fill:#14532d,stroke:#22c55e,stroke-width:2px,color:#ffffff;
    classDef check fill:#1e293b,stroke:#94a3b8,stroke-width:1px,color:#ffffff;
    classDef caution fill:#7f1d1d,stroke:#ef4444,stroke-width:2px,color:#ffffff;
    classDef smart fill:#581c87,stroke:#a855f7,stroke-width:2px,color:#ffffff;

    class FinalOutput,DeterministicSynth secure;
    class UncertaintyResponse caution;
    class SufficiencyCheck,AnsweringEngine check;
    class RRFCombiner,CitationValidator smart;
```

### 7. Automated Remediation & Safe Patch Application Workflow

CodeSentinel AI implements a strict, multi-stage remediation workflow that transforms supported static security and dependency findings into verified, reviewable patch proposals:

```mermaid
flowchart TD
    Finding["Static / Dependency Finding<br/>(PYSEC001-005, JSSEC001-002, VULN)"] --> AvailCheck{"Remediation Available?<br/>(Rule Registry Match & Preconditions)"}
    AvailCheck -->|"No"| ManualReq["Emit MANUAL_REMEDIATION_REQUIRED<br/>(Rationale & Contextual Guidance)"]
    AvailCheck -->|"Yes"| ProposalSynth["Patch Proposal Engine<br/>(Exact-Match Line Slicing & Unified Diff)"]

    subgraph InMemoryValidation["In-Memory Validation Pipeline (Zero Untrusted Execution)"]
        ProposalSynth --> V1["Check 1: Source & Drift Integrity (SHA-256)"]
        V1 --> V2["Check 2: Patch Structure & Reconstitution"]
        V2 --> V3["Check 3: AST Syntax Parsing (ast.parse)"]
        V3 --> V4["Check 4: Static Rule Re-Check (Verify Vulnerability Eliminated)"]
        V4 --> V5["Check 5: Semantic Regression Risk Disclosure"]
    end

    V5 --> ValidationPass{"All Required Checks Passed?"}
    ValidationPass -->|"No"| ValFail["Status: VALIDATION_FAILED<br/>(Application Strictly Disabled)"]
    ValidationPass -->|"Yes"| ValPass["Status: VALIDATED<br/>(Ready for Human Review)"]

    ValPass --> HumanReview["Developer Review Console<br/>(Side-by-Side & Unified Diffs, Risk, Audit)"]
    HumanReview --> HumanDecision{"Human Decision"}
    HumanDecision -->|"Reject"| Rejected["Status: REJECTED<br/>(No Disk Files Altered)"]
    HumanDecision -->|"Approve"| Approved["Status: APPROVED<br/>(Application Permission Granted)"]

    Approved --> ApplyTrigger["Trigger Patch Application<br/>(Explicit Separate User Action)"]
    ApplyTrigger --> PreWriteCheck{"Pre-Write Anti-Drift Check<br/>(Disk SHA-256 == Original Hash?)"}
    PreWriteCheck -->|"No (File Modified)"| StaleAbort["Status: STALE<br/>(Write Aborted to Prevent Overwrite)"]
    PreWriteCheck -->|"Yes"| AtomicWrite["Atomic Write (.tmp file -> os.replace)"]

    AtomicWrite --> PostWriteCheck{"Post-Write Verification<br/>(Disk SHA-256 == Target Hash?)"}
    PostWriteCheck -->|"No"| Rollback["Safe Rollback & Report Failure"]
    PostWriteCheck -->|"Yes"| AppliedDone(["Status: APPLIED<br/>(Audit Log Recorded)"])

    classDef success fill:#14532d,stroke:#22c55e,stroke-width:2px,color:#ffffff;
    classDef warning fill:#78350f,stroke:#f59e0b,stroke-width:2px,color:#ffffff;
    classDef danger fill:#7f1d1d,stroke:#ef4444,stroke-width:2px,color:#ffffff;
    classDef neutral fill:#1e293b,stroke:#94a3b8,stroke-width:1px,color:#ffffff;

    class AppliedDone,ValPass success;
    class Approved,HumanReview,ProposalSynth warning;
    class ValFail,Rejected,StaleAbort,Rollback danger;
    class AvailCheck,ValidationPass,HumanDecision,PreWriteCheck,PostWriteCheck neutral;
```

Key Safety Guarantees:
1. **Decoupled Approval and Application**: Generating a proposal or passing validation NEVER writes to disk. Application requires an explicit separate approval and confirmation.
2. **Zero Untrusted Execution**: Source code from the target repository is never executed or imported. Validation uses Python's standard `ast.parse` and static rule AST re-checking.
3. **Anti-Drift Protection**: If a file changes on disk after proposal synthesis, the pre-write SHA-256 check fails, marking the proposal `STALE` and refusing the write.
4. **Protected Paths Confinement**: Writes targeting `.env`, `.git`, `.ssh`, `id_rsa`, or path traversals (`../`) are rejected unconditionally.
5. **Read-Only Archive Preservation**: Historical snapshots are immutable. If no local writable workspace is configured, the engine falls back to exporting unified diffs.

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

## Testing

The codebase maintains automated test coverage across both backend deterministic engines and frontend interactive components.

### Backend Test Suite (Pytest)

The backend test suite includes **216 automated tests** (with 3 skipped tests reserved for standalone PostgreSQL instances):

```bash
# Run complete backend test suite
pytest -q backend/tests

# Run Phase 7 automated remediation and patch engine tests specifically
pytest -v backend/tests/test_remediation_rules.py \
          backend/tests/test_patch_engine.py \
          backend/tests/test_remediation_validator.py \
          backend/tests/test_remediation_api.py \
          backend/tests/test_remediation_security.py

# Run Phase 6 code search and Q&A tests
pytest -v backend/tests/test_search_chunker.py \
          backend/tests/test_search_retrieval.py \
          backend/tests/test_qa_service.py \
          backend/tests/test_search_api.py \
          backend/tests/test_search_database.py

# Run Phase 5 architecture & health tests
pytest -v backend/tests/test_dependency_graph.py \
          backend/tests/test_architecture_policy.py \
          backend/tests/test_codebase_health.py \
          backend/tests/test_architecture_api.py

# Run security regression tests
pytest -v backend/tests/test_security_regressions.py
```

### Frontend Test Suite (Vitest)

The frontend test suite includes **53 automated unit and integration tests** across 15 test suites written in Vitest and React Testing Library:

```bash
cd frontend

# Run complete Vitest suite
npm test

# Run TypeScript compilation and typecheck
npm run build

# Run Oxlint validation
npm run lint
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

## Roadmap

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
- [x] **Phase 4: Application Security Intelligence & Semantic Rules (Complete)**
  - Decoupled Severity (`CRITICAL` to `INFO`) and Confidence (`HIGH`, `MEDIUM`, `LOW`)
  - 10 deterministic security rules for Python and JS/TS
  - Remediation guidance and why-it-matters contextual explanations
- [x] **Phase 5: Architectural Governance, Module Graphs & Codebase Health (Complete)**
  - Module dependency graphs for Python and JS/TS
  - Martin's package coupling metrics ($Ca$, $Ce$, $I$, $A$, $D$)
  - Tarjan's SCC cycle detection
  - Declarative architectural boundary policies (`codesentinel.architecture.json`)
  - 5-pillar codebase health score index (0–100) with dynamic weight renormalization
- [x] **Phase 6: Semantic Code Search & Evidence-Backed Repository Q&A (Complete)**
  - Syntax-aware AST chunking for Python, TypeScript, JavaScript, and Markdown
  - BM25Okapi lexical retrieval with sub-word identifier tokenization and symbol boosting
  - Dense vector semantic search and Reciprocal Rank Fusion (RRF) hybrid retrieval
  - Evidence-backed repository Q&A grounded in verified snapshot source code
  - Verifiable citation coordinates, uncertainty detection, and prompt injection defense
  - Zero-key local execution with optional pluggable LLM and embedding providers
- [x] **Phase 7: Automated Remediation & Safe Code Patch Synthesis (Complete)**
  - Deterministic remediation strategy catalog for Python security findings (`PYSEC001-005`) and dependency version upgrades
  - Exact-line deterministic patch engine with line-accurate unified diffs, SHA-256 anchoring, and line-ending preservation
  - 5-stage in-memory patch validation (source integrity, patch structure, AST syntax parsing, deterministic static rule elimination, regression risk disclosure) without untrusted code execution
  - Decoupled developer review console in React 19 with split and unified diff viewers, validation checklists, and audit history
  - Strict human approval gate and safe atomic patch application with pre/post-write anti-drift verification, protected path blocking (`.env`, `.git`), and read-only archive diff export fallback
- [ ] **Phase 8: Automated CI/CD Workflows & Pull Request Synthesis (Planned)**
  - GitHub Actions and GitLab CI automated governance workflows
  - Headless PR creation and commit generation for approved remediation patches

---

## Authors & Contributors

Developed and maintained by **[Akhil Bansal](https://github.com/Akhil-Bansal17)**.

Contributions, feature suggestions, and security vulnerability reports are welcome. Please open an issue or pull request in the [GitHub Repository](https://github.com/Akhil-Bansal17/CodeSentinel-AI).

---

## License

CodeSentinel AI is open-source software licensed under the [MIT License](LICENSE).
