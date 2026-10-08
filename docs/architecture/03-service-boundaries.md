# Service Boundaries & Architecture Contracts

To prevent tight coupling and avoid premature monolithic sprawl, CodeSentinel AI defines strict protocols using Python's `typing.Protocol` in `backend/app/services/interfaces.py`.

## 1. Boundary Matrix

| Service | Boundary Responsibilities | Primary Input / Output |
| :--- | :--- | :--- |
| **`RepositoryService`** | Repository cloning, Git snapshot extraction, branch tracking | URL / Local path → `RepositorySnapshot` |
| **`AnalysisService`** | Orchestrates deterministic engine execution runs | `SnapshotId` → `AnalysisRun`, `HealthScore` |
| **`CodeIntelligenceService`**| AST parsing, language detection, symbol graph generation | Source files → AST nodes, Symbols |
| **`SecurityAnalysisService`**| SAST rule evaluation, hardcoded secret discovery, CWE tag | Source tree → `SecurityFinding[]` |
| **`DependencyAnalysisService`**| Dependency manifest extraction, license compliance, CVE audit | Manifests → `Dependency[]` |
| **`TestAnalysisService`** | Test runner execution, coverage report parsing, flakiness | Coverage XML/LCOV → `TestMetric[]` |
| **`DocumentationAnalysisService`**| Docstring coverage, OpenAPI / markdown completeness | Source files → Doc metrics |
| **`EmbeddingService`** | AST-aware code chunking and vector embedding generation | Code chunks → Dense vector embeddings |
| **`RAGService`** | Semantic and hybrid retrieval over code index & evidence | Query string → Grounded context chunks |
| **`AIService`** | LLM reasoning over verified deterministic evidence | Evidence package + Prompt → Explanation |
| **`RecommendationService`**| Synthesizes and prioritizes verified findings | Findings list → `Recommendation[]` |
| **`AgentService`** | Proposes safe, auditable diffs with verification commands | Task goal → Unified Diff + Test Plan |

## 2. Inversion of Control & Extension Strategy

Because all interfaces are defined via `@runtime_checkable Protocol`:
1. Phase 1 through Phase 3 implementations can be swapped without touching the API routing layer.
2. Unit tests can easily inject mock services without relying on third-party mocking libraries.
3. Multiple engine backends (e.g., Semgrep vs custom AST linters, local Ollama vs Anthropic/OpenAI) can satisfy the same protocol.
