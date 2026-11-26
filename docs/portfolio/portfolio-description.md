# CodeSentinel AI — Portfolio Project Description

**Project Name:** CodeSentinel AI  
**Identity:** AI-Powered Software Engineering Intelligence Platform  
**Target Roles:** Software Engineering Intern, Backend Engineering Intern, AI/ML Systems Intern  
**Repository:** `https://github.com/Akhil-Bansal17/CodeSentinel-AI`  
**Date:** November 26, 2026  

---

## 1. Short Description (1–2 Sentences)

CodeSentinel AI is a local-first software engineering intelligence platform that combines deterministic AST static analysis, graph-based architecture governance, and evidence-backed hybrid retrieval to detect vulnerabilities, track codebase health, and safely synthesize human-approved code remediations.

---

## 2. Detailed Description

Modern AI code assistants often act as unconstrained wrappers around large language models, leading to hallucinated security findings, fabricated library recommendations, and unverified code suggestions. CodeSentinel AI was built to solve this problem by anchoring code intelligence in **verifiable, deterministic computer science fundamentals**.

The platform ingests public GitHub repositories through a security-hardened pipeline that defends against SSRF and archive decompression attacks. Once ingested, immutable snapshots are evaluated across multiple deterministic engines:
- **AST Static Analysis & Security:** Traverses Python and TypeScript syntax trees to compute cyclomatic complexity, flag code smells, and detect critical vulnerability sinks (SQL injection, unsafe deserialization, shell injection).
- **Software Composition Analysis (SCA):** Discovers dependency manifests and lockfiles, resolving direct and transitive packages against curated security advisories using PEP 440 and Semver 2.0.0 specification-compliant evaluators.
- **Architecture & Coupling Engine:** Models imports as directed graphs, calculates Robert C. Martin's package coupling metrics ($Ca, Ce, Instability, Distance$), and applies Tarjan's Strongly Connected Components algorithm to detect circular module dependencies.
- **Explainable Codebase Health:** Aggregates findings into a transparent 0–100 health index across 5 weighted dimensions.
- **Hybrid Retrieval & Grounded Q&A:** Employs BM25Okapi lexical matching and vector embeddings with Reciprocal Rank Fusion ($k=60$). Synthesizes answers strictly with verified source coordinate citations, falling back to an explicit `INSUFFICIENT_EVIDENCE` status if evidence is lacking.
- **Safe Remediation & CI/CD Studio:** Synthesizes line-accurate unified diffs, executes 5-stage in-memory AST validation, enforces a strict human approval gate before disk modifications, and exports standardized OASIS SARIF 2.1.0 audit reports.

---

## 3. Technical Highlights & Stack

| Dimension | Technologies & Standards | Architectural Role |
| :--- | :--- | :--- |
| **Backend & API** | Python 3.12/3.14, FastAPI, Pydantic v2 | High-throughput asynchronous REST gateway, correlation tracking, centralized exception handling. |
| **Database & ORM** | PostgreSQL 16, SQLAlchemy 2.0, Alembic | Relational data persistence across 17 tables, 9 sequential database migrations, cascade isolation. |
| **Frontend Console** | React 19, TypeScript, Vite 8, Tailwind CSS | Obsidian Sentinel high-density dark UI theme, unified diff viewer, responsive AST chunk inspection modals. |
| **Static & Graph Analysis** | Python `ast`, TypeScript Compiler API, Tarjan's SCC | Deterministic syntax tree traversal, cyclomatic complexity calculations, graph cycle detection. |
| **Search & Retrieval** | BM25Okapi, Dense Vector Embeddings, Reciprocal Rank Fusion | Hybrid multi-modal source chunk retrieval combining keyword frequencies with semantic similarity. |
| **Security & Sandbox** | RFC 6052 IP Filters, TarSlip Protection, HMAC-SHA256 | SSRF prevention, safe archive streaming, decompression bomb bounds, webhook signature verification. |
| **Testing & CI/CD** | Pytest, Vitest, React Testing Library, Docker, SARIF 2.1.0 | 326 backend tests + 141 frontend tests (100% pass rate), multi-stage Docker builds, OASIS SARIF export. |

---

## 4. Problem Solved

Software engineering teams face three critical challenges when managing complex repositories:
1. **Hallucination Risk in AI Tools:** Generative AI models frequently generate plausible-sounding but completely fabricated function names, deprecated packages, or non-existent CVEs.
2. **Fragmented Tooling:** Teams juggle disparate linters, vulnerability scanners, dependency auditors, and architectural diagramming tools that output conflicting metrics.
3. **Unsafe Automated Modifications:** Direct automated code refactorings often break syntax or introduce subtle regressions when applied without intermediate validation and explicit human review.

CodeSentinel AI solves these problems by providing an integrated, local-first intelligence console that grounds every finding in exact line numbers, validates patches in memory before touching disk, and maintains strict human approval boundaries.

---

## 5. Engineering Contributions

- **Engineered the Ingestion Security Subsystem:** Implemented recursive IP validation filtering private RFC1918 subnets and RFC 6052 IPv6-translated addresses to defeat SSRF attacks. Built a stream-based archive extractor enforcing file count, individual size, total bytes, and expansion ratio limits to prevent TarSlip and zip bomb exploits.
- **Implemented Architectural Graph Algorithms:** Implemented directed dependency graph builders resolving static imports in Python and TypeScript. Applied Tarjan's Strongly Connected Components algorithm to efficiently isolate circular import clusters.
- **Developed Hybrid Retrieval & Citation Grounding:** Implemented a syntax-aware AST chunker that splits source code into logical declaration blocks. Integrated BM25Okapi token matching and vector cosine similarity through Reciprocal Rank Fusion ($k=60$), paired with a deterministic citation validator that completely prevents hallucinated references.
- **Built Safe 5-Stage Patch Validation:** Created an automated remediation workflow that transforms static analysis findings into unified diffs, verifies AST syntax in memory using `ast.parse`, checks anti-drift SHA-256 hashes, and enforces a mandatory human approval gate before file modification.
- **Designed & Implemented Obsidian Sentinel UI:** Built a high-density, dark-themed engineering dashboard using React 19, Vite, and Tailwind CSS. Implemented an interactive unified diff viewer, custom status badges, and asynchronous race condition protection to prevent out-of-order state overwrites.
- **Established Full Automated Test Suites:** Created comprehensive test suites encompassing 326 pytest backend tests (including security regression and failure injection suites) and 141 Vitest frontend component tests.

---

## 6. Challenges & Solutions

### Challenge 1: Preventing TarSlip and Decompression Bomb Attacks
- *Context:* Ingesting arbitrary user-provided GitHub repository archives can expose the server to malicious archives designed to overwrite system files (`../../../etc/passwd`) or exhaust disk space via decompression bombs.
- *Solution:* Built `safe_extractor.py` which inspects every archive entry before extraction. The extractor cleans path delimiters, rejects drive prefixes (`C:`) and UNC paths, verifies that resolved destination paths stay strictly within the target extraction sandbox, and monitors byte stream throughput to abort if expansion exceeds a 10.0x ratio or 150 MB ceiling.

### Challenge 2: Eliminating AI Hallucinations in Repository Q&A
- *Context:* Standard language model generation frequently invents plausible-looking code excerpts and non-existent citations when answering questions about unfamiliar repositories.
- *Solution:* Implemented an evidence-sufficiency gate. Retrieved AST chunks are scored and compared against a relevance threshold. If evidence is lacking or insufficient, the engine deterministically returns an `INSUFFICIENT_EVIDENCE` status. When evidence is present, citations are validated against actual source files, ensuring every reference points to real line ranges.

### Challenge 3: Async State Race Conditions in Frontend Search
- *Context:* Rapid typing in search inputs or switching repositories while background requests were in flight could cause older, slower responses to resolve last and overwrite newer results.
- *Solution:* Implemented a sequence reference counter (`searchRequestIdRef = useRef<number>(0)`). Each new search increments the ID, and resolved promises are discarded if their ID does not match the current counter value. Additionally, switching repositories automatically invalidates stale state and dismisses open inspection modals.

---

## 7. Future Improvements

1. **Tree-Sitter Multi-Language Parser Integration:** Expand AST parsing beyond Python and JavaScript/TypeScript to Go, Rust, Java, and C++ using Tree-Sitter grammar bindings.
2. **Route-Level Dynamic Code Splitting:** Decompose the single 621 kB frontend JavaScript bundle into dynamic route chunks using `React.lazy()` to further reduce initial asset payload.
3. **Webhook-Driven Incremental Re-Indexing:** Implement incremental snapshot diffing so that incoming GitHub push webhooks only re-parse modified files rather than re-indexing entire repositories.
