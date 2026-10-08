# CodeSentinel AI

> **"AI-powered software engineering intelligence for your codebase."**

CodeSentinel AI is a developer platform designed to analyze software repositories and deliver deep architectural insights, security findings, dependency intelligence, and test health metrics.

Unlike simple "ChatGPT wrappers" that pass code directly to generic language models, CodeSentinel AI strictly separates **deterministic analysis** from **AI reasoning**:
* **Deterministic engines** parse ASTs, run static analysis rules, audit dependencies, and compute verifiable health scores.
* **The AI layer** explains, summarizes, and prioritizes verified facts—never hallucinating codebase state.

---

## High-Level Architecture & Planned Pipeline

```
Repository (Git / Local)
       ↓
Repository Ingestion
       ↓
File Discovery & Language Detection
       ↓
Code Parsing (Tree-sitter AST)
       ↓
Deterministic Engines: Static Analysis | Security SAST | Dependency Audit | Test Intelligence | Docs
       ↓
Evidence Store & Verifiable Health Engine
       ↓
Knowledge Representation: Code Chunking | Embeddings | Vector Store (pgvector)
       ↓
Grounded AI Reasoning: RAG | Codebase Assistant | Prioritized Recommendations
       ↓
Safe Agentic Code Changes (Diffs + Verification Plans)
```

---

## Phase 0: Foundation Scope

This repository currently implements **Phase 0 (Foundation)**:
1. **Monorepo Architecture**: Clean separation between `backend/`, `frontend/`, `docs/`, and orchestration.
2. **Backend Foundation**: FastAPI application with configuration via environment variables, structured logging, safe exception handling, and health telemetry.
3. **Database Foundation**: SQLAlchemy 2.0 with PostgreSQL support, session management, and Alembic database migration infrastructure.
4. **Service Contracts**: Typed Python `Protocol` interfaces in `backend/app/services/interfaces.py` for future analysis engines without premature monolithic logic.
5. **Frontend Foundation**: Modern Vite 8 + React 19 + TypeScript developer UI featuring dark developer-tool design, responsive desktop/mobile shells, live API health telemetry, reusable empty/error states, and zero simulated/fake metrics.
6. **Automated Testing**: 100% passing test suites across both backend (pytest) and frontend (Vitest).

---

## Technology Stack

### Backend
* **Python**: 3.12+ (tested through 3.14)
* **Framework**: FastAPI, Pydantic v2, Pydantic-Settings
* **Database & Migrations**: PostgreSQL, SQLAlchemy 2.0, Alembic
* **Driver**: `psycopg` (v3 binary)
* **Testing**: pytest, pytest-asyncio, HTTPX

### Frontend
* **Framework**: React 19, TypeScript, Vite 8
* **Styling**: Tailwind CSS (custom developer platform palette)
* **Icons**: Lucide React
* **Testing**: Vitest, React Testing Library, JSDOM

### Infrastructure
* **Containerization**: Docker, Docker Compose (PostgreSQL 16, backend, frontend)

---

## Local Development Setup

### Prerequisites
* Python 3.12+
* Node.js 20+ and npm
* Docker & Docker Compose (optional, for containerized PostgreSQL)

### 1. Clone & Setup Backend

```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows:
.\.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env

# Run Alembic migrations (with running DB or offline check)
alembic upgrade head

# Start development server
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

The API will be available at `http://127.0.0.1:8000`.
* Health check: `http://127.0.0.1:8000/api/health`
* Interactive OpenAPI documentation: `http://127.0.0.1:8000/api/docs`

### 2. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The UI will be accessible at `http://localhost:5173`. In development mode, Vite automatically proxies `/api` calls to the FastAPI backend running on port 8000.

### 3. Running via Docker Compose

```bash
docker compose up --build
```
* Frontend: `http://localhost:3000`
* Backend API: `http://localhost:8000`
* PostgreSQL: `localhost:5432`

---

## Running Automated Tests

### Backend Tests (pytest)
```bash
# From workspace root
.\backend\.venv\Scripts\pytest -v backend/tests

# Or from backend directory
cd backend && pytest -v
```

### Frontend Tests (Vitest)
```bash
cd frontend
npm test
```

### Frontend Typecheck & Build
```bash
cd frontend
npm run build
```

---

## Environment Configuration

Configuration is managed strictly through environment variables.

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `PROJECT_NAME` | `CodeSentinel AI` | Application name |
| `SERVICE_NAME` | `codesentinel-api` | Identifier returned by health checks |
| `VERSION` | `0.1.0` | Application release version |
| `ENVIRONMENT` | `development` | Deployment environment |
| `DEBUG` | `false` | Enables debug logging |
| `API_PREFIX` | `/api` | Base path for REST API endpoints |
| `DATABASE_URL` | `postgresql+psycopg://postgres:postgres@localhost:5432/codesentinel` | Connection string |
| `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Allowed CORS origins |
| `LOG_LEVEL` | `INFO` | Logging threshold (DEBUG, INFO, WARNING, ERROR) |

---

## Phase 0 Limitations

* **No Repository Ingestion**: Phase 0 does not yet clone remote Git repositories or parse local folders.
* **No AI/LLM Execution**: No calls to external LLM providers or vector databases are executed in Phase 0.
* **Truthfulness Enforced**: The dashboard displays clean empty states ("No repository analyzed yet") rather than fake health scores or dummy vulnerability counts.

---

## Planned Roadmap

* **Phase 1**: Repository ingestion, AST parsing, static analysis rules, dependency vulnerability audits, test intelligence, and verifiable health scoring.
* **Phase 2**: Syntactic code chunking, vector embeddings, PostgreSQL `pgvector` indexing, and AST + semantic code search.
* **Phase 3**: RAG over verified evidence, AI Codebase Assistant, prioritized recommendations, and safe agentic code changes with test verification.
