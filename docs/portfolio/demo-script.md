# CodeSentinel AI — Professional Demonstration Script (5–7 Minutes)

**Project:** CodeSentinel AI  
**Design Identity:** Obsidian Sentinel — High-Precision Engineering Console  
**Target Audience:** Engineering Leads, Technical Interviewers, Security Architects  
**Duration:** 6 Minutes 30 Seconds  
**Demonstration Repository:** `https://github.com/pallets/click` (or local fixture `local:code-sentinel-demo`)  

---

## Timeline & Scene Overview

| Timestamp | Phase | Primary Screen | Key Focus |
| :--- | :--- | :--- | :--- |
| **0:00 – 0:40** | 1. Introduction & Problem Statement | Overview Console | The truth-grounding problem in AI coding tools. |
| **0:40 – 1:20** | 2. Ingestion & Snapshot Immutability | Repository Portfolio | SSRF defense, streaming extraction, SHA-256 snapshots. |
| **1:20 – 2:30** | 3. Multi-Pillar Code Intelligence | Analysis / Security / Arch | AST parsing, cyclomatic complexity, coupling, health score. |
| **2:30 – 3:30** | 4. Hybrid Search & Grounded Q&A | Code Search / Q&A | BM25 + Vector RRF, zero-hallucination citations. |
| **3:30 – 4:40** | 5. Automated Remediation | Remediation Studio | 5-stage in-memory AST validation, human approval gate. |
| **4:40 – 5:40** | 6. CI/CD Workflows & Audits | CI/CD & Audit Studio | Hardened GitHub Actions, SARIF export, PR change synthesis. |
| **5:40 – 6:30** | 7. Architecture Summary & Closing | System Architecture | Decoupled architecture, safety invariants, closing wrap-up. |

---

## Detailed Step-by-Step Script

### Phase 1: Introduction & Problem Statement (0:00 – 0:40)
- **Screen:** System Overview (`http://localhost:5173/`)
- **What to Click:** Hover over the global health badge and summary metrics.
- **What to Say:**
  > "Hello. Today I'm demonstrating **CodeSentinel AI**, an AI-powered software engineering intelligence and codebase governance platform.
  >
  > Most AI tools today act as black-box LLM wrappers—they pipe raw code into cloud models that often hallucinate non-existent security vulnerabilities, invent fake metrics, or hallucinate citations.
  >
  > CodeSentinel AI solves this by strictly decoupling **deterministic static analysis** from **high-level conversational reasoning**. Every finding, metric, and citation emitted by the platform is anchored in formal AST parsing, mathematical graph theory, and exact source code coordinates, with zero untrusted code execution."

---

### Phase 2: Ingestion & Snapshot Immutability (0:40 – 1:20)
- **Screen:** Repositories Portfolio (`/repositories`)
- **What to Click:** Click **"Add Repository"** button, show GitHub URL input, then select an existing ingested repository (`click`).
- **What to Say:**
  > "Let's look at how code enters the system. When a repository URL is submitted, CodeSentinel AI doesn't simply clone the repository with Git.
  >
  > Instead, our ingestion pipeline enforces an **SSRF shield** that blocks private IP ranges, loopbacks, and port manipulation. Archives are streamed and processed through a safe extraction engine that prevents **TarSlip directory traversal**, drive letter escapes, and decompression bombs.
  >
  > Once discovered, every file is hashed with SHA-256, and an **immutable snapshot** is frozen in PostgreSQL. This guarantees that subsequent analysis runs are 100% reproducible and tamper-proof."

---

### Phase 3: Multi-Pillar Code Intelligence (1:20 – 2:30)
- **Screen:** Repository Detail View (`/repositories/{id}`)
- **What to Click:** Click through tabs: **Static Analysis** → **Security Findings** → **Dependencies & SCA** → **Architecture & Coupling** → **Codebase Health**.
- **What to Say:**
  > "Once a snapshot is established, CodeSentinel AI runs five deterministic inspection engines:
  >
  > 1. **Static Analysis:** Inspects syntax trees via Python's AST and TypeScript's compiler API to calculate cyclomatic complexity and function length violations.
  > 2. **Application Security:** Flags high-risk AST patterns like SQL injection, unsafe deserialization, shell injection, and hardcoded secrets, with decoupled Severity and Confidence ratings.
  > 3. **Dependency SCA:** Parses manifests and lockfiles, evaluating direct and transitive dependencies against curated advisories using PEP 440 and Semver 2.0.0 semantics.
  > 4. **Architecture & Coupling:** Constructs a directed module import graph, calculates Robert C. Martin's package coupling metrics ($Ca, Ce, Instability$), and runs **Tarjan's Strongly Connected Components algorithm** to uncover circular dependencies.
  > 5. **Codebase Health Index:** Synthesizes these diagnostics into an explainable 0–100 score with mathematical weight normalization."

---

### Phase 4: Hybrid Search & Grounded Q&A (2:30 – 3:30)
- **Screen:** Code Search (`/search`) and AI Assistant (`/assistant`)
- **What to Click:**
  1. On Code Search, click the suggested symbol `make_context`, toggle between **Hybrid (RRF)** and **Lexical (BM25)**, then click **Inspect** on a result chunk.
  2. Switch to **AI Assistant**, submit the question: *"Where is parameter parsing handled?"*
- **What to Say:**
  > "For code exploration, CodeSentinel AI uses syntax-aware AST chunking. We combine **BM25 lexical retrieval** with optional **dense vector embeddings** using **Reciprocal Rank Fusion (RRF)**.
  >
  > Notice the AI Assistant: Unlike generic chatbots, every answer is synthesized strictly from retrieved AST coordinates. Notice the bracketed citations `[src/click/core.py:L1420-L1512]`. Clicking a citation opens the exact verified chunk.
  >
  > Furthermore, if the repository does not contain relevant code for a query, the engine doesn't guess—it honestly returns an `INSUFFICIENT_EVIDENCE` status, completely eliminating hallucinations."

---

### Phase 5: Automated Remediation & Human Approval Gate (3:30 – 4:40)
- **Screen:** Remediation Console (`/remediation`)
- **What to Click:** Click **Review Proposal** on a security proposal, view the side-by-side **Unified Diff Viewer**, highlight the 5-stage validation checks.
- **What to Say:**
  > "Detecting issues is only half the battle; fixing them safely is where engineering rigor matters.
  >
  > CodeSentinel AI synthesizes deterministic code patches with line-accurate unified diffs. But before any code can be modified, the patch must pass a **5-stage in-memory validation pipeline**:
  > - Verifies original file hash integrity (anti-drift).
  > - Checks AST syntax compilation (`ast.parse`) in memory.
  > - Confirms the targeted vulnerability rule is eliminated.
  > - Discloses any potential regression risks.
  >
  > Most importantly, the platform enforces an absolute **Human Approval Gate**. Patches are never applied autonomously. An engineer must explicitly inspect the diff, review the validation diagnostics, and approve the change."

---

### Phase 6: CI/CD Workflows & Multi-Pillar Audits (4:40 – 5:40)
- **Screen:** CI/CD & Audits Console (`/cicd`)
- **What to Click:**
  1. Click **Workflow Generator** tab, display the generated GitHub Actions YAML with commit-pinned SHAs.
  2. Click **Audit Dashboard** tab, view the multi-pillar audit summary and click **Export SARIF 2.1.0**.
  3. Click **PR Synthesis** tab to show multi-proposal patch bundle composition.
- **What to Say:**
  > "To shift these protections into continuous integration, our CI/CD engine generates hardened GitHub Actions pipelines featuring immutable commit-pinned action SHAs, least-privilege token permissions, and shell injection guards.
  >
  > We can also trigger a unified **6-Pillar Codebase Audit** that exports findings into OASIS SARIF 2.1.0 format—making it directly compatible with GitHub Advanced Security and enterprise vulnerability dashboards.
  >
  > Finally, our **PR Synthesis Studio** aggregates multiple approved remediation patches, detects overlapping file edit conflicts, and bundles them into clean Git `.patch` files ready for pull request submission."

---

### Phase 7: Architecture Summary & Closing (5:40 – 6:30)
- **Screen:** Settings / Platform Diagnostics (`/settings`)
- **What to Click:** Show live health probes, database connection status, and GitHub reachability tester.
- **What to Say:**
  > "To wrap up: CodeSentinel AI is built with a production-grade tech stack—React 19 on the frontend, FastAPI on the backend, PostgreSQL 16 with 9 Alembic migrations, and full Docker containerization.
  >
  > Our test suite contains **326 backend tests** and **141 frontend tests**, achieving a 100% pass rate.
  >
  > In summary, CodeSentinel AI gives engineering teams verifiable, evidence-backed intelligence to govern their codebases with confidence. Thank you!"

---

## Limitations to Disclose Honestly During Demos

If asked by interviewers or evaluators:
1. **Offline Baseline:** By default, CodeSentinel AI operates 100% offline using deterministic AST algorithms and BM25 search without requiring paid API keys. External LLMs and vector embeddings are optional pluggable enhancements.
2. **Read-Only Code Extraction:** The platform never executes user code (`no build steps`, `no eval`, `no npm install`). All analysis is static AST analysis.
3. **Database Requirements:** Local development supports in-memory SQLite, while production deployment uses PostgreSQL 16 with connection pooling.
