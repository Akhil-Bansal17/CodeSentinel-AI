# Phase 1: Deterministic Repository Ingestion & Snapshots

> **CodeSentinel AI Architecture & Implementation Reference — Phase 1**

---

## 1. Overview & Objective

Phase 1 activates real, secure, deterministic repository ingestion within CodeSentinel AI. It ingests software repositories from public GitHub URLs or approved local directories, performs safe file discovery and language identification, calculates verifiable repository metrics, and persists point-in-time snapshots to PostgreSQL.

Strict architecture rule: **Zero Fake Data**. Phase 1 does not simulate metrics, fake vulnerabilities, or invoke speculative AI models. All metrics are mathematically derived from verified file metadata.

---

## 2. Ingestion Pipeline Workflow

```
Repository Source (GitHub URL / Local Path)
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
Repository Metrics Aggregation (Languages, Categories, LOC, Largest Files)
       ↓
Transactional Database Persistence (Repository, RepositorySnapshot, RepositoryFiles)
       ↓
REST API (/api/v1/repositories) & Frontend Dashboard
```

---

## 3. Supported Source Types

### A. Public GitHub Repository
- **URL Format**: `https://github.com/{owner}/{repository}` (with or without `.git`).
- **Security & Acquisition**:
  - Scheme must be HTTPS.
  - Host strictly restricted to `github.com`.
  - Credentials in URLs are rejected.
  - Streaming download via `codeload.github.com` tarball endpoints with redirect destination re-validation.
  - Download timeout and size limits enforced during streaming.
  - Does not require a personal access token or password for public repositories.

### B. Local Repository Directory
- **Local Path**: Absolute filesystem path on the host server.
- **Allowed Roots Boundary**: Path must resolve within configured `LOCAL_REPOSITORY_ROOTS`.
- **Security**: UNC network share paths, `..` traversal, and symlinks pointing outside allowed roots are rejected.

---

## 4. Security Defenses & Boundaries

| Threat | Defense Implementation |
| :--- | :--- |
| **Path Traversal / TarSlip / ZipSlip** | Strict member sanitization in `safe_extractor.py`. Absolute paths, Windows drive letters (`C:`), UNC paths (`\\server\share`), and `..` escape sequences are rejected before writing to disk. |
| **Decompression Bombs & Forged Headers** | Chunk-streamed extraction enforcing maximum extracted bytes (`MAX_REPOSITORY_EXTRACTED_BYTES`), individual file limit (`MAX_REPOSITORY_FILE_BYTES`), file count limit (`MAX_REPOSITORY_FILES`), and expansion ratio check (`MAX_ARCHIVE_EXPANSION_RATIO`). Validates actual bytes written rather than trusting archive header claims. |
| **SSRF (Server-Side Request Forgery)** | IP checks (`is_ip_private_or_loopback`) reject private, loopback, link-local, multicast, cloud metadata IPs (`169.254.169.254`), and NAT64 (RFC 6052 `64:ff9b::/96`) translated private addresses. Redirects enforce HTTPS, reject user credentials, disallow non-443 ports, and re-validate hosts on every hop. |
| **Symlink Escapes & Loops** | `discover_repository_files` verifies canonical resolved paths for every directory and file. Escaping symlinks are ignored and logged; cycle detection tracks both visited canonical paths and inodes to ensure robust protection on Windows and Linux. |
| **Sensitive File & Path Disclosure** | Secret patterns (`.env`, `*.pem`, `*.key`, `id_rsa`, `credentials.json`, etc.) are excluded from line-counting and content decoding. Error messages and validation details are strictly sanitized to prevent leaking host directory structures, server usernames, or internal paths. |
| **Code Execution Prevention** | Zero repository code is executed during ingestion. Build tools, `setup.py`, `package.json` scripts, Makefiles, and shell scripts are never invoked. |

---

## 5. Deterministic Language Classification

Languages and categories are detected deterministically using explicit extension maps in `language_detector.py`:
- **Source**: Python, TypeScript, JavaScript, Go, Rust, Java, C, C++, C#, Ruby, PHP, Kotlin, Swift, Dart, Scala, Shell, PowerShell, SQL, HTML, CSS, SCSS, Sass, Less, etc.
- **Configuration**: JSON, YAML, TOML, XML, INI, properties, `.editorconfig`.
- **Documentation**: Markdown, reStructuredText, AsciiDoc, Plain Text.
- **Data**: CSV, TSV, Parquet, SQLite.
- **Other**: Binary archives, images, executables, unknown extensions.

Compound extensions (e.g. `.d.ts`, `.test.ts`, `.spec.js`, `.blade.php`) are evaluated before general extensions. Known extensionless files (`Dockerfile`, `Makefile`, `Gemfile`, `Procfile`) are classified explicitly.

---

## 6. Database Schema & Models

- **`repositories`**: Stores repository identification, `source_type`, `source_url`, `source_identifier`, `status`, and `last_ingested_at`.
- **`repository_snapshots`**: Stores point-in-time run metrics (`file_count`, `source_file_count`, `ignored_file_count`, `total_size_bytes`, `directory_count`, `total_lines_of_code`, `language_distribution`, `metrics_json`, `failure_code`, `failure_reason`).
- **`repository_files`**: Stores individual file metadata (`relative_path`, `file_name`, `extension`, `language`, `category`, `size_bytes`, `is_source_file`, `is_binary`, `line_count`, `sha256`).

---

## 7. REST API Endpoints

All endpoints are registered under both `/api/v1/repositories` and `/api/repositories`:

- `POST /api/v1/repositories`: Register and deterministically ingest a repository.
- `GET /api/v1/repositories`: List repositories with pagination and latest snapshot summary.
- `GET /api/v1/repositories/{id}`: Get repository metadata and latest snapshot metrics.
- `GET /api/v1/repositories/{id}/files`: List snapshot file metadata with filters (`language`, `category`, `search`, `is_source_file`) and pagination.
- `GET /api/v1/repositories/{id}/snapshots/{snapshot_id}`: Get snapshot details.
- `POST /api/v1/repositories/{id}/reingest`: Re-ingest an existing repository creating a new snapshot.
- `DELETE /api/v1/repositories/{id}`: Delete repository database records and cascades (never touches local filesystem).
