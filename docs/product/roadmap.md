# CodeSentinel AI — Product Roadmap

## Phase 0: Foundation (Current Phase — Complete)
* [x] Monorepo architecture (`backend`, `frontend`, `docs`, `scripts`, `docker-compose.yml`)
* [x] FastAPI application foundation with `GET /api/health`
* [x] Database foundation with SQLAlchemy 2.0, PostgreSQL support, and Alembic migrations
* [x] Centralized error handling and structured logging
* [x] Conceptual domain models and typed service protocols
* [x] Vite 8 + React 19 + TypeScript developer UI with Tailwind styling
* [x] Reusable UI states: loading, error, honest empty state, backend unavailable state
* [x] Live backend connectivity telemetry
* [x] Zero-fake-metrics policy enforced

## Phase 1: Repository Ingestion & Deterministic Analysis Engines
* [ ] Safe Git repository cloning & local folder traversal
* [ ] Language detection and AST parsing (Tree-sitter integration)
* [ ] Static analysis engine (complexity, maintainability, architectural rules)
* [ ] Security analysis engine (SAST rules, secret detection, CVE matching)
* [ ] Dependency intelligence engine (npm, PyPI, Cargo manifest parsing)
* [ ] Test intelligence engine (test runner output & coverage calculation)
* [ ] Documentation analysis engine
* [ ] Deterministic Repository Health Scoring engine

## Phase 2: Knowledge Graph & Semantic Code Search
* [ ] Syntactic code chunking along function/class boundaries
* [ ] Vector embedding generation
* [ ] PostgreSQL `pgvector` indexing and hybrid search (AST + Vector)
* [ ] Symbol dependency graph navigation

## Phase 3: Grounded AI Reasoning & Safe Agency
* [ ] Retrieval-Augmented Generation (RAG) over verified repository evidence
* [ ] AI Codebase Assistant with evidence-cited answers
* [ ] Prioritized engineering recommendations
* [ ] Safe agentic code modification proposals with unified diffs and test plans
