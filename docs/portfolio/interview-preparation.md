# CodeSentinel AI — Technical Interview Preparation Guide

**Project:** CodeSentinel AI  
**Design Identity:** Obsidian Sentinel — High-Precision Engineering Console  
**Target Roles:** Software Engineering Intern, Backend Engineering Intern, Systems / AI Intern  
**Date:** November 26, 2026  

---

## 1. Project Pitches & Explanations

### The 30-Second Elevator Pitch
> "CodeSentinel AI is a local-first software engineering intelligence platform. Instead of piping raw source code to external AI models that hallucinate, it uses deterministic AST parsing, dependency graph algorithms, and specification-compliant vulnerability matching to evaluate codebase health. It features hybrid BM25 and vector code retrieval, evidence-backed Q&A with real line citations, and automated remediation with a strict human approval gate."

### The 1-Minute Pitch
> "Most AI coding tools on the market are essentially prompt wrappers around cloud LLMs. They often hallucinate non-existent security vulnerabilities, invent deprecated libraries, or provide ungrounded code suggestions.
>
> I built CodeSentinel AI to solve that problem by anchoring software intelligence in deterministic computer science principles. When a repository is ingested, we enforce strict SSRF and archive decompression protections, create immutable snapshots, and run multiple deterministic analysis engines: AST static analysis for cyclomatic complexity and code smells, AST vulnerability scanning, multi-ecosystem dependency analysis, and circular dependency detection using Tarjan's algorithm.
>
> For code exploration and Q&A, we combine BM25 and vector embeddings via Reciprocal Rank Fusion, strictly citing verified source line coordinates. If the evidence isn't in the codebase, the system honestly says so rather than hallucinating. We also generate automated remediation diffs with in-memory syntax validation, but require explicit human approval before any file is touched."

### The 3-Minute Technical Deep Dive
> "CodeSentinel AI is architected in four clean, decoupled layers:
>
> **Layer 1 is the Frontend Console:** Built with React 19, TypeScript, Vite, and Tailwind CSS using our 'Obsidian Sentinel' dark engineering design system. It features an interactive unified diff viewer, AST chunk inspection modals, and asynchronous race condition protection to prevent out-of-order state overwrites.
>
> **Layer 2 is the FastAPI Gateway:** Provides asynchronous REST endpoints with Pydantic v2 data validation, request latency measurement, correlation tracking with `X-Request-ID`, and centralized exception handling that shields internal stack traces.
>
> **Layer 3 is Repository Ingestion:** We can stream public GitHub archives or ingest local folders. To ensure absolute safety, we built custom security validators: an SSRF filter that blocks private RFC1918 subnets and RFC 6052 IPv6-translated addresses, and an archive extractor that blocks TarSlip directory traversal, drive letter escapes, and decompression bombs by enforcing strict expansion ratio and byte ceilings. Once extracted, files are hashed with SHA-256 and frozen into an immutable database snapshot.
>
> **Layer 4 contains the Intelligence Engines:**
> - In **Static Analysis**, we parse syntax trees via Python's AST module and TypeScript's compiler API to compute McCabe cyclomatic complexity and flag functions over 50 lines.
> - In **Security**, we detect dangerous AST sinks like SQL injection, dynamic `eval`/`exec`, shell commands, and unsafe `pickle` deserialization without executing user code.
> - In **Dependency SCA**, we parse 8 manifest and lockfile formats, matching dependencies against curated advisories using PEP 440 and Semver 2.0.0 evaluators.
> - In **Architecture**, we construct a directed import graph, calculate Robert C. Martin's package coupling metrics ($Ca, Ce, Instability$), and run Tarjan's Strongly Connected Components algorithm to find circular import cycles.
> - In **Retrieval and Q&A**, we use syntax-aware chunking and hybrid Reciprocal Rank Fusion ($k=60$) combining BM25 and vector similarity. Q&A answers must cite real coordinates, and if evidence scores fall below our threshold, the system returns an `INSUFFICIENT_EVIDENCE` status.
> - Finally, in **Remediation**, we generate unified diff patches, validate their syntax in memory with `ast.parse`, and enforce a mandatory human approval gate before disk writes.
>
> The persistence layer uses PostgreSQL 16 with SQLAlchemy 2.0 and 9 Alembic migrations. The entire platform is validated by 326 backend tests and 141 frontend tests with 100% pass rate."

---

## 2. Core Architecture Questions & Model Answers

### Q1: Why did you choose FastAPI over Flask or Django?
**Answer:**  
FastAPI was chosen for three primary reasons:
1. **Asynchronous Throughput:** FastAPI natively supports `async/await` on top of Starlette and AnyIO, which is ideal for streaming archive downloads and concurrent analysis tasks without blocking the main event loop.
2. **Pydantic v2 Type Safety & Auto-Documentation:** FastAPI integrates deeply with Pydantic, providing automatic request serialization, runtime data validation, and OpenAPI 3.1 documentation generation out of the box.
3. **Lightweight & Modular:** Unlike Django, which includes heavy ORM and template coupling, FastAPI gives us the flexibility to use SQLAlchemy 2.0 with customized connection pooling and custom lifespan management.

### Q2: Why React 19 and TypeScript on the frontend?
**Answer:**  
We chose React 19 and TypeScript to build a high-performance, type-safe single-page engineering console. TypeScript ensures strict contract alignment with our FastAPI backend Pydantic models. React 19's optimized rendering and hooks allow us to manage complex state transitions—such as interactive side-by-side diff comparisons, real-time code search filtering, and multi-tab repository inspections—without unnecessary re-renders.

### Q3: How does repository ingestion work, and why are snapshots immutable?
**Answer:**  
Ingestion starts by validating the repository source. For GitHub URLs, we verify the scheme, host, and port, and resolve the IP to ensure it doesn't target private or loopback networks. The archive is streamed into a temporary directory and extracted using our safe extractor, which enforces TarSlip path traversal checks and decompression limits.

Every discovered file is classified, counted, and hashed with SHA-256. These are linked to a single `RepositorySnapshot` record. **Snapshots are immutable** so that historical analysis results, health scores, and vulnerability findings are permanently frozen in time. If a repository is rescanned later, a brand new snapshot is created. This guarantees reproducible audit trails and prevents scan-drift.

### Q4: Why use AST parsing instead of regular expressions for static code analysis?
**Answer:**  
Regular expressions operate on raw text and have no semantic understanding of code syntax. Regex easily generates false positives (e.g., matching the word `eval` inside a comment or string literal) and false negatives (e.g., missing multi-line statements or aliased imports like `import pickle as p; p.loads(...)`).

An Abstract Syntax Tree (AST) represents the actual grammatical hierarchy of the code. By traversing AST nodes (`ast.FunctionDef`, `ast.Call`, `ast.Import`), we can reliably inspect function arguments, evaluate branch decision points for McCabe cyclomatic complexity, and detect exact vulnerability call sinks with zero syntactic ambiguity.

### Q5: How does dependency analysis work across different ecosystems?
**Answer:**  
Different ecosystems follow fundamentally different versioning specifications. Python uses PEP 440 (supporting epochs, local versions, and `~=` compatible release operators), while Node.js uses Semver 2.0.0 (supporting `^` caret, `~` tilde, and `x` wildcards).

CodeSentinel AI implements dedicated parsers for 8 manifest and lockfile formats (`requirements.txt`, `Pipfile.lock`, `package.json`, `package-lock.json`, etc.). We distinctly separate declared constraints (e.g., `requests>=2.25.0`) from actual resolved versions (e.g., `2.31.0`). We then evaluate resolved versions against vulnerability advisory event ranges using specification-compliant matching engines (`packaging.specifiers` for Python and our `NpmRangeEvaluator` for npm).

### Q6: How does Tarjan's algorithm detect circular dependencies?
**Answer:**  
We model the repository's modules as a directed graph where nodes are module files and directed edges represent static import statements (`Module A -> Module B`).

A circular dependency exists if and only if two or more modules belong to the same directed cycle. **Tarjan's algorithm** finds all **Strongly Connected Components (SCCs)** in a directed graph in linear time, $\mathcal{O}(V + E)$, using depth-first search and a low-link node tracking stack. Any strongly connected component with more than one node represents an import cycle.

### Q7: How is the Codebase Health Index calculated?
**Answer:**  
The health score is a deterministic, explainable index on a 0–100 scale synthesized across 5 weighted dimensions:
- Maintainability (25%)
- Application Security (25%)
- Architectural Health (20%)
- Dependency Risk (20%)
- Analysis Coverage (10%)

Deductions are mathematically calculated (e.g., severe vulnerabilities or circular cycles deduct points based on fixed penalty curves). If certain analysis runs are not yet executed, the engine dynamically **renormalizes the weights** across the available dimensions rather than arbitrarily penalizing the codebase with zeroes.

### Q8: What is Hybrid Search, and what is Reciprocal Rank Fusion (RRF)?
**Answer:**  
Single-mode search has clear limitations:
- **Lexical search (BM25Okapi)** is great at exact keyword matching, symbol lookups, and variable names, but fails to capture conceptual synonyms.
- **Dense vector semantic search** captures high-level conceptual intent via cosine similarity, but struggles with exact token matches (like finding `authenticate_user_v2`).

**Hybrid Search** combines the strengths of both. We run lexical and semantic retrievals in parallel and merge their result rankings using **Reciprocal Rank Fusion (RRF)**:
$$RRF\_Score(d) = \sum_{m \in M} \frac{1}{k + rank_m(d)}$$
where $k$ is a smoothing constant (we use $k=60$). RRF prioritizes chunks that rank well across both keyword matching and semantic similarity without requiring fragile score normalization across different vector and lexical scoring scales.

### Q9: How does the AI Assistant eliminate hallucinations in repository Q&A?
**Answer:**  
We enforce an **evidence-sufficiency gate**:
1. When a user asks a question, we retrieve candidate AST chunks using our hybrid search engine.
2. We compute an evidence sufficiency score based on chunk relevance. If no chunks meet the relevance threshold, the system halts and deterministically returns an `INSUFFICIENT_EVIDENCE` status, stating that the repository does not contain matching evidence.
3. When evidence is sufficient, the answer must cite verified source coordinates (e.g. `[src/auth.py:L15-L30]`). Citations are validated against the actual snapshot files before the response is returned to the user.

### Q10: How does the Automated Remediation Engine ensure safe patch application?
**Answer:**  
Automated code modifications can easily introduce syntax errors or break existing logic. To prevent this, CodeSentinel AI uses a **5-stage in-memory validation pipeline**:
1. **Pre-check:** Computes the target file's current SHA-256 hash to ensure it matches the snapshot baseline (anti-drift check).
2. **Patch Synthesis:** Generates a unified diff using deterministic AST rewrite rules.
3. **In-Memory Syntax Validation:** Parses the patched code in memory using `ast.parse` without touching disk.
4. **Vulnerability Verification:** Re-runs the target security rule against the patched AST to confirm the finding is eliminated.
5. **Human Approval Gate:** The patch is marked `VALIDATED` and presented to the engineer in an interactive diff viewer. **Only after explicit human approval** can the patch be written to disk or exported as a Git `.patch` bundle.

---

## 3. Engineering & Systems Questions

### Q11: How do you handle asynchronous race conditions in the frontend?
**Answer:**  
In interactive search and Q&A, a user might submit multiple queries quickly. If search query #1 takes 800ms and search query #2 takes 200ms, query #2 will resolve first, and query #1 resolving later could overwrite the screen with stale results.

We solved this using a sequence reference counter: `searchRequestIdRef = useRef<number>(0)`. Every outgoing search increments the counter. When the API response resolves, we verify `if (requestId !== searchRequestIdRef.current) return;`. If the request ID does not match the latest counter value, the response is discarded. In addition, switching repositories immediately invalidates stale state and dismisses open modals.

### Q12: How is SSRF prevented during repository ingestion?
**Answer:**  
In `source_validator.py`, we validate the URL:
1. Only the `https` scheme is allowed.
2. Only standard port 443 is permitted.
3. Embedded credentials (`user:pass@...`) are blocked.
4. Only `github.com` is accepted.
5. We perform DNS resolution using `socket.getaddrinfo` and check the resolved IP using Python's `ipaddress` module. We reject private RFC 1918 subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), loopback (`127.0.0.0/8`), link-local (`169.254.0.0/16`), and RFC 6052 translated IPv6 addresses (`64:ff9b::/96`).

### Q13: How is database integrity maintained when deleting a repository?
**Answer:**  
In our SQLAlchemy ORM models, the `Repository` entity defines relationships to child entities (`snapshots`, `analyses`, `dependency_analyses`, `architecture_analyses`, `index_runs`, `remediation_proposals`, `audit_runs`) with `cascade="all, delete-orphan"` and database-level `ondelete="CASCADE"` foreign keys. When a repository is deleted, all associated snapshots, files, findings, chunks, and proposals are automatically and atomically purged in a single transaction, preventing orphaned records.

---

## 4. Honest Limitation Questions & Handling

### Q14: What is not implemented yet or what are the current limitations?
**Answer:**  
"I believe in being transparent about system boundaries:
1. **Offline Baseline:** By default, CodeSentinel AI operates in 100% offline mode using deterministic AST algorithms and BM25 lexical search without requiring paid API keys. External LLMs and vector embeddings are optional enhancements.
2. **Language Coverage:** AST parsing is currently implemented for Python and JavaScript/TypeScript. Expanding to languages like Go, Rust, and Java using Tree-Sitter is on our roadmap.
3. **Frontend Bundle Size:** The frontend is currently built as a single ~621 kB bundle (144 kB gzipped). Implementing route-level dynamic code-splitting using `React.lazy()` is a natural next optimization."

### Q15: What would need to change before deploying this to a large enterprise production environment?
**Answer:**  
"For enterprise-scale production:
1. **Distributed Task Queue:** Right now, we manage background ingestion and indexing via an in-memory task manager. In enterprise production, we would decouple background tasks to Celery or Redis/RabbitMQ workers so API gateway containers remain stateless.
2. **Object Storage:** Repository archives are currently stored in temporary disk directories. In production, archives would be streamed directly to an S3-compatible object store.
3. **Multi-Tenant Authentication:** We would add OAuth2/OIDC integration (e.g. GitHub SSO or Keycloak) and role-based access control (RBAC)."
