# CodeSentinel AI — System Architecture Walkthrough

**Project:** CodeSentinel AI  
**Design Identity:** Obsidian Sentinel — High-Precision Engineering Console  
**Phase:** 9 — Portfolio Release Preparation  
**Reference Source:** [`docs/architecture/22-codesentinel-system-architecture.mmd`](22-codesentinel-system-architecture.mmd)  
**Date:** November 26, 2026  

---

## 1. Introduction

CodeSentinel AI is designed from the ground up as a deterministic software engineering intelligence and codebase governance platform. Unlike generic AI coding assistants that pipe unvetted source code to third-party language models, CodeSentinel AI strictly decouples **deterministic static inspection** from **high-level conversational reasoning**.

This document explains the system architecture depicted in [`22-codesentinel-system-architecture.mmd`](22-codesentinel-system-architecture.mmd) in clear, accessible, yet technically rigorous terms.

---

## 2. Layer-by-Layer Architectural Walkthrough

### Layer 1: Frontend Experience Layer (Obsidian Sentinel Console)
- **Technology:** React 19, TypeScript, Vite, Tailwind CSS.
- **Visual Design Identity:** *Obsidian Sentinel* — dark engineering console theme featuring a `#09090b` canvas, `#18181b` elevated cards, `#27272a` micro-borders, and `#6366f1` Indigo accents.
- **Key Modules:**
  - **App Shell & Global Navigation:** Collapsible, multi-tiered sidebar providing fast access to Overview, Repositories, Analysis, Security, Dependencies, Architecture, Health, Search, Q&A, Remediation, CI/CD, and Settings.
  - **Repository & Snapshot Context Provider (`RepositoryContext`):** Automatically synchronizes active repository and snapshot selection across all screens.
  - **Unified Diff Viewer:** High-contrast side-by-side and inline syntax-highlighted diff inspector for reviewing proposed code fixes.
  - **Chunk Detail Modal:** Source viewer displaying line numbers, AST metadata, SHA-256 hashes, and citation coordinates.

### Layer 2: API & Orchestration Gateway (FastAPI)
- **Technology:** FastAPI, Pydantic v2, Python 3.12/3.14.
- **Responsibilities:**
  - **Security Middleware:** Appends correlation identifiers (`X-Request-ID`), measures execution latency (`X-Process-Time-Ms`), and sets defensive HTTP headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`).
  - **Centralized Exception Handling:** Translates domain errors (`NotFoundError`, `SecurityViolationError`, `ValidationError`) into standardized JSON error envelopes.
  - **Task Lifecycle Manager:** In-memory async task tracking preventing thread contention during long-running analysis and indexing operations.

### Layer 3: Repository Ingestion & Snapshot Subsystem
- **Security Protections:**
  - **SSRF Shield (`source_validator.py`):** Strictly permits only public `github.com` repositories on HTTPS port 443. Rejects private RFC1918 IPs, loopback (`127.0.0.1`), link-local addresses, and RFC 6052 IPv4-IPv6 translation vectors.
  - **TarSlip & Decompression Bomb Defense (`safe_extractor.py`):** Blocks directory traversal sequences (`..`), drive letter prefixes (`C:`), and UNC paths. Enforces strict limits: max 50 MB archive, max 150 MB extracted size, max 10,000 files, and max 10.0x expansion ratio.
- **Snapshot Immutability:**
  - Every file is indexed with language classification, category, line count, and SHA-256 content checksum.
  - Ingestion builds an atomic, immutable `RepositorySnapshot` record. Once completed, a snapshot is frozen, ensuring historical analysis runs remain reproducible.

### Layer 4A: Deterministic Intelligence & Analysis Engines
- **Static Code Analysis:** AST parsing using Python's `ast` module and Node.js TypeScript compiler API (`ts.createSourceFile`). Detects high cyclomatic complexity (McCabe threshold > 10), oversized functions (> 50 lines), duplicate imports, and syntax errors.
- **Application Security Engine:** Scans AST trees for vulnerability sinks without executing code: dynamic execution (`eval`, `exec`), unsafe deserialization (`pickle`, `shelve`), command injection (`subprocess.Popen(shell=True)`), weak hashes (MD5, SHA1), unvalidated TLS (`verify=False`), and raw HTML sinks (`innerHTML`).
- **Dependency & SCA Engine:** Discovers 8 manifest and lockfile formats. Evaluates dependencies against curated OSV/CVE advisory records using PEP 440 (`packaging`) and Semver 2.0.0 (`NpmRangeEvaluator`) semantics.
- **Architecture & Coupling Engine:** Extracts import graphs, calculates Robert C. Martin's package metrics (Afferent Coupling $Ca$, Efferent Coupling $Ce$, Instability $I$, Abstractness $A$, and Normalized Distance $D$), and runs Tarjan's Strongly Connected Components algorithm to isolate circular dependency clusters.
- **Codebase Health Engine:** Synthesizes findings across 5 weighted dimensions (Maintainability 25%, AppSec 25%, Architecture 20%, Dependencies 20%, Coverage 10%) into an explainable 0–100 score with missing-input weight normalization.
- **Multi-Pillar Audit Runner:** Executes comprehensive read-only evaluations and exports standardized OASIS SARIF 2.1.0 and Markdown reports.

### Layer 4B: Retrieval, Grounded Q&A & Remediation Engines
- **Syntax-Aware Chunker:** Splits source files into logical AST chunks (functions, classes, blocks) preserving exact line and column ranges.
- **Hybrid Search Engine:** Combines BM25Okapi lexical token matching with dense vector cosine similarity using Reciprocal Rank Fusion ($k=60$).
- **Evidence-Backed Q&A:** Grounded strictly in retrieved source coordinates. When evidence scores fall below the relevance threshold, the engine honestly returns `INSUFFICIENT_EVIDENCE`, guaranteeing zero fabricated claims or citations.
- **Prompt Injection Defense (`PromptGuardShield`):** Sanitizes prompts against delimiter injection, system prompt extraction, and role override attempts.
- **Remediation & Human Approval Gate:**
  1. Generates targeted unified diff patches (`FIX-PYSEC001`, `FIX-DEP-UPGRADE`, etc.).
  2. Runs 5-stage in-memory AST validation to ensure the patch introduces no syntax errors or regressions.
  3. Halts at the **Human Approval Gate**: Patches are never applied automatically; explicit review and approval are mandatory.
  4. Once approved, the patch can be applied atomically to disk (with anti-drift pre/post hash checks) or bundled into a multi-proposal Git `.patch` file via the PR Synthesis Studio.

### Layer 5: Data & Persistence Layer
- **Database:** PostgreSQL 16 (or SQLite in-memory for local tests).
- **ORM & Migrations:** SQLAlchemy 2.0 with 9 sequential Alembic migrations (`0001_initial_repositories` through `0009_phase8`).
- **Integrity Invariants:** Cascade deletion cleanly removes child snapshots, findings, and chunks when a repository is deleted, preventing orphan data leaks.

---

## 3. Directional Data Flow

1. **Onboarding:** Client → Gateway → Ingestion Subsystem → PostgreSQL.
2. **Analysis:** Client → Gateway → Intelligence Engines (AST/Security/SCA/Architecture/Health) → PostgreSQL.
3. **Retrieval & Q&A:** Client → Gateway → Chunker & Search Engine → Evidence Evaluation → Grounded Answer → Client.
4. **Remediation:** Finding → Patch Synthesis → In-Memory Validation → Human Approval → Atomic Apply / PR Export.
