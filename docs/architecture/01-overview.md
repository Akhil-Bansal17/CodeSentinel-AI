# CodeSentinel AI — System Architecture Overview

## 1. Architectural Philosophy

CodeSentinel AI is built on a strict tenet:

> **Separate deterministic analysis from AI reasoning.**
> Deterministic engines produce verified facts, metrics, and evidence. The AI layer explains, summarizes, and prioritizes over verified facts—never hallucinating codebase state.

Many AI developer tools are simple "ChatGPT wrappers" that pass raw code into an LLM and ask for security advice or code quality ratings. This produces hallucinated vulnerabilities, unstable metrics, and low developer trust.

In contrast, CodeSentinel AI uses a tiered architecture:
1. **Tier 1: Deterministic Engine Layer**: AST parsers, linters, static analyzers, dependency manifests, and test intelligence engines compute ground-truth facts.
2. **Tier 2: Knowledge & Evidence Store**: Stores AST nodes, symbol call graphs, vulnerabilities, and vector embeddings in PostgreSQL / pgvector.
3. **Tier 3: Grounded Reasoning Layer**: AI reasoning models consume verified findings and evidence packages to provide prioritized engineering guidance and propose safe code modifications.

## 2. Monorepo Organization

```
CodeSentinel-AI/
├── backend/                  # FastAPI 0.115+ REST API & Deterministic Core
│   ├── app/
│   │   ├── api/v1/           # Versioned API routes & dependency injection
│   │   ├── core/             # Settings, structured logging, centralized exceptions, DB engine
│   │   ├── models/           # SQLAlchemy Declarative models (Phase 0 base + tables)
│   │   ├── schemas/          # Pydantic schemas (health, error, and domain interfaces)
│   │   ├── services/         # Service boundaries and interface protocols
│   │   ├── repositories/     # Persistence abstraction
│   │   └── main.py           # Application factory & middleware pipeline
│   ├── alembic/              # Database migration version control
│   ├── tests/                # Pytest automated test suite
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/                 # Vite 8 + React 19 + TypeScript Developer UI
│   ├── src/
│   │   ├── components/       # Layout & reusable developer platform components
│   │   ├── pages/            # View pages with honest status and telemetry
│   │   ├── services/         # Type-safe API client
│   │   ├── hooks/            # Telemetry and health state hooks
│   │   └── types/            # TypeScript contracts
│   ├── tests/                # Vitest + React Testing Library suite
│   ├── package.json
│   └── Dockerfile
│
├── docs/                     # Architectural specifications and roadmap
├── scripts/                  # Setup automation
├── docker-compose.yml        # Orchestration (DB + Backend + Frontend)
└── README.md
```

## 3. Technology Stack

| Layer | Technologies | Justification |
| :--- | :--- | :--- |
| **Backend API** | FastAPI, Python 3.12+ | Async performance, strict Pydantic v2 validation, native OpenAPI generation |
| **Database & ORM** | PostgreSQL 16, SQLAlchemy 2.0, Alembic | Relational integrity, transactional schema migrations, future `pgvector` compatibility |
| **Driver** | `psycopg` (v3 binary) | High performance C-accelerated modern PostgreSQL driver |
| **Testing** | Pytest, HTTPX, pytest-asyncio | Standardized synchronous & asynchronous test runners |
| **Frontend UI** | React 19, TypeScript, Vite | Fast HMR, developer platform ecosystem |
| **Styling** | Tailwind CSS (developer-tool palette) | Cohesive GitHub/Linear-inspired dark UI theme |
| **Frontend Tests** | Vitest, JSDOM, React Testing Library | Fast unit and integration tests |
