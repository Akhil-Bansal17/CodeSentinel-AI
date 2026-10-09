# CodeSentinel AI

> **"AI-powered software engineering intelligence for your codebase."**

CodeSentinel AI is a serious developer intelligence platform designed to analyze software repositories and deliver deep architectural insights, security findings, dependency intelligence, and test health metrics.

Unlike simple "ChatGPT wrappers" that pass raw code directly to language models, CodeSentinel AI strictly separates **deterministic analysis** from **AI reasoning**:
* **Deterministic engines** discover repositories, classify languages, parse ASTs, audit dependencies, and compute verifiable health metrics.
* **The AI layer** explains, summarizes, and prioritizes verified facts—never hallucinating codebase state.

---

## High-Level Architecture & Pipeline

```
Repository Source (Public GitHub / Approved Local Directory)
       ↓
Source Validation & SSRF Protection
       ↓
Repository Acquisition (Streaming Tarball / Local Resolution)
       ↓
Safe Archive Extraction (TarSlip / ZipSlip & Bomb Protection)
       ↓
Safe File Discovery & Exclusion (Ignore Rules, Symlink Containment, Binary Detection)
       ↓
Deterministic Language Detection & LOC Calculation
       ↓
Deterministic Repository Metrics (Languages, Categories, LOC, Largest Files)
       ↓
Transactional Database Persistence (Repository, RepositorySnapshot, RepositoryFiles)
       ↓
REST API Layer (/api/v1/repositories)
       ↓
Developer Dashboard (Metrics, Language Breakdown, Paginated File Explorer)
```

---

## Implemented Capabilities: Phase 1

This repository implements **Phase 1: Deterministic Repository Ingestion, Safe File Discovery & Snapshots**:

1. **Source Ingestion**:
   - **Public GitHub Repositories**: Validates URLs, downloads archives safely via streaming HTTP with redirect re-validation, strips wrapper directories, and auto-detects default branches.
   - **Local Directory Repositories**: Scans local project directories in-place within configured `LOCAL_REPOSITORY_ROOTS`.
2. **Security & Sandboxing**:
   - **ZipSlip & TarSlip Protection**: Member path sanitization rejects absolute paths, Windows drive letters, UNC paths, and `..` traversal escapes.
   - **Decompression Bomb Protection**: Tracks uncompressed size and expansion ratio.
   - **SSRF Prevention**: Rejects private, loopback, and cloud metadata IP ranges.
   - **Symlink Protection**: Verifies containment within repository root; prevents symlink loops.
   - **Secret Protection**: Credential and sensitive files (`.env`, `*.pem`, `id_rsa`, etc.) are excluded from line-counting. Ingested code is never executed.
3. **Deterministic Classification & Metrics**:
   - Categorizes files into `source`, `configuration`, `documentation`, `data`, and `other`.
   - Computes file counts, source file counts, LOC, uncompressed size, language distributions, top-level directories, and largest files deterministically.
   - Zero synthetic scores or fake vulnerability numbers.
4. **Database & Snapshots**:
   - PostgreSQL/SQLite schema with Alembic migration `0002_phase1`.
   - Models: `Repository`, `RepositorySnapshot`, and `RepositoryFile`.
   - Failed ingestions preserve the previous successful snapshot.
5. **REST API**:
   - Endpoints under `/api/v1/repositories`: create/ingest, list, get details, file explorer with pagination & filtering, snapshot details, re-ingest, and delete.
6. **Frontend Experience**:
   - Connect Repository modal supporting both GitHub and Local inputs with validation.
   - Repository detail view featuring metric cards, proportional language distribution bar, top-level directory tables, and paginated file explorer with language and category filters.

---

## Technology Stack

### Backend
* **Python**: 3.12+ (tested on Python 3.14)
* **Framework**: FastAPI, Pydantic v2, Pydantic-Settings
* **Database & Migrations**: PostgreSQL, SQLAlchemy 2.0, Alembic
* **Driver**: `psycopg` (v3 binary)
* **Testing**: pytest, pytest-asyncio, HTTPX

### Frontend
* **Framework**: React 19, TypeScript, Vite 8
* **Styling**: Tailwind CSS (custom developer platform palette)
* **Icons**: Lucide React + custom SVG icons
* **Testing**: Vitest, React Testing Library, JSDOM

### Infrastructure
* **Containerization**: Docker, Docker Compose (PostgreSQL 16, backend, frontend)

---

## Local Development Setup

### Prerequisites
* Python 3.12+
* Node.js 20+ and npm
* Docker & Docker Compose (optional, for containerized PostgreSQL)

### 1. Setup Backend

```bash
cd backend

# Create & activate virtual environment
python -m venv .venv
# Windows:
.\.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env

# Run database migrations
alembic upgrade head

# Start development API server
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

The UI will be accessible at `http://localhost:5173`. In development mode, Vite proxies `/api` calls to the FastAPI backend running on port 8000.

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
# Run complete test suite (43 tests)
.\backend\.venv\Scripts\pytest -v backend/tests
```

### Frontend Tests (Vitest)
```bash
cd frontend
# Run complete test suite (22 tests)
npm test -- --run
```

### Typechecking & Production Build
```bash
cd frontend
npm run build
npm run lint
```

---

## Environment Configuration

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
| `LOCAL_REPOSITORY_ROOTS` | `""` | Comma-separated allowed directories for local ingestion |
| `MAX_REPOSITORY_DOWNLOAD_BYTES` | `52428800` (50MB) | Maximum allowed archive download size |
| `MAX_REPOSITORY_EXTRACTED_BYTES` | `157286400` (150MB) | Maximum allowed uncompressed extraction size |
| `MAX_REPOSITORY_FILES` | `10000` | Maximum discovered files per repository |
| `MAX_REPOSITORY_FILE_BYTES` | `2097152` (2MB) | File size threshold for line-counting |
| `REPOSITORY_INGESTION_TIMEOUT_SECONDS` | `60` | Ingestion pipeline execution timeout |
| `REPOSITORY_HTTP_TIMEOUT_SECONDS` | `20` | HTTP download read timeout |
| `MAX_ARCHIVE_EXPANSION_RATIO` | `10.0` | Maximum decompression expansion ratio |

---

## Planned Roadmap

* **Phase 1 (Complete)**: Deterministic repository ingestion, safe archive discovery, language detection, snapshot persistence, and frontend dashboard.
* **Phase 2**: Deterministic code parsing (AST), static analysis rules, security SAST scanning, dependency vulnerability audits, and test intelligence.
* **Phase 3**: Vector embeddings (`pgvector`), AST + semantic code search, RAG evidence grounding, AI Codebase Assistant, and safe agentic code changes.
