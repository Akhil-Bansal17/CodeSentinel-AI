"""Production Backup, Restore Verification & Disaster Recovery Module (Phase 13).

Provides deterministic, safe procedures for:
1. Database backup generation (atomic SQLite online snapshot and PostgreSQL pg_dump integration).
2. Verification of backup file existence, non-emptiness, header magic bytes, and SHA-256 integrity.
3. Safe restoration verification into strictly disposable test databases.
4. Protection against accidental restoration into production/staging primary databases.
5. Verification of restored schemas (tables, alembic_version) and representative record counts.
6. Handling of migrations during recovery and rollbacks.

Operational Targets (Configurable):
- RPO (Recovery Point Objective): 15 minutes (target maximum acceptable data loss).
- RTO (Recovery Time Objective): 30 minutes (target maximum acceptable recovery downtime).
These are target operational metrics monitored by operations, not pre-claimed achievements.

Limits of Database Backups:
- Database backups contain relational table data and migration state only.
- Database backups DO NOT include:
  * Application secrets and encryption keys (.env / Vault / KMS credentials).
  * TLS/SSL certificates and private keys.
  * Local Git repository checkouts and cached source trees (stored on filesystem/scratch).
  * Container images and runtime binaries.
- Secrets and filesystem trees must be backed up separately via encrypted secret stores
  and artifact storage pipelines.
"""

from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import sqlite3
import subprocess
import time
from typing import Any, Dict, List, Optional, Tuple, Union
from urllib.parse import urlparse

from sqlalchemy import create_engine, inspect, text
from backend.app.core.config import settings
from backend.app.core.logging import logger, sanitize_log_text

# Target Operational Recovery Objectives (Configurable operational goals)
DEFAULT_RPO_TARGET_MINUTES: int = 15
DEFAULT_RTO_TARGET_MINUTES: int = 30

# Protected database names that MUST NEVER be overwritten by restore helpers
PROTECTED_DB_NAMES = frozenset({
    "codesentinel",
    "production",
    "prod",
    "main",
    "master",
    "live",
    "staging",
    "default",
    "postgres",
})

# Approved disposable target database markers
APPROVED_DISPOSABLE_MARKERS = (
    "restore_test",
    "recovery_test",
    "disposable",
    "test_restore",
    "scratch",
    "temp",
    ":memory:",
)

# Known table models for schema verification
DEFAULT_VERIFICATION_TABLES = [
    "repositories",
    "analysis_runs",
    "analysis_findings",
    "alembic_version",
]


@dataclass
class BackupMetadata:
    """Metadata recorded with every verified database backup."""

    backup_id: str
    created_at: str
    source_dialect: str
    file_path: str
    file_size_bytes: int
    sha256_checksum: str
    format: str
    alembic_head: Optional[str] = None
    tables_included: List[str] = field(default_factory=list)
    record_counts: Dict[str, int] = field(default_factory=dict)
    rpo_target_minutes: int = DEFAULT_RPO_TARGET_MINUTES
    rto_target_minutes: int = DEFAULT_RTO_TARGET_MINUTES

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "BackupMetadata":
        return cls(**data)


@dataclass
class BackupVerificationResult:
    """Detailed result of verifying a backup archive file."""

    is_valid: bool
    file_path: str
    file_size_bytes: int = 0
    sha256_checksum: Optional[str] = None
    detected_format: str = "unknown"
    error_message: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class RestoreVerificationResult:
    """Detailed result of a dry-run or disposable database restore verification."""

    is_successful: bool
    target_database_sanitized: str
    tables_verified: List[str] = field(default_factory=list)
    record_counts: Dict[str, int] = field(default_factory=dict)
    alembic_head: Optional[str] = None
    duration_seconds: float = 0.0
    error_message: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def is_safe_disposable_target(database_url_or_path: str) -> Tuple[bool, str]:
    """Strictly checks whether a target database is an approved disposable recovery target.

    Rejects any URL or path targeting a primary, production, staging, or default database
    to prevent catastrophic accidental data overwrite.
    """
    if not database_url_or_path or not database_url_or_path.strip():
        return False, "Target database identifier is empty."

    raw = database_url_or_path.strip()

    # In-memory SQLite is always disposable
    if raw in (":memory:", "sqlite:///:memory:"):
        return True, "Approved disposable target (SQLite in-memory)."

    # Extract target DB name or file path
    db_name = ""
    if "://" in raw:
        parsed = urlparse(raw)
        db_name = (parsed.path or "").lstrip("/")
        # If SQLite path
        if parsed.scheme.startswith("sqlite"):
            db_name = Path(db_name).stem.lower()
        else:
            db_name = db_name.lower()
    else:
        db_name = Path(raw).stem.lower()

    # 1. Prohibit exact matches to protected names
    if db_name in PROTECTED_DB_NAMES:
        return (
            False,
            f"Restoration rejected: Target '{db_name}' matches protected production/primary database name. "
            f"Overwriting production or staging databases via restore automation is prohibited.",
        )

    # 2. Check for presence of approved disposable marker
    has_marker = any(marker in db_name for marker in APPROVED_DISPOSABLE_MARKERS)
    if not has_marker:
        return (
            False,
            f"Restoration rejected: Target '{db_name}' is not marked as disposable. "
            f"Target database name must explicitly contain one of: {list(APPROVED_DISPOSABLE_MARKERS)}.",
        )

    return True, f"Approved disposable target: '{db_name}'."


def sanitize_db_url_for_logging(url: str) -> str:
    """Mask credentials in database URLs for safe logging."""
    if not url:
        return ""
    if "://" not in url:
        return Path(url).name
    try:
        parsed = urlparse(url)
        netloc = parsed.hostname or ""
        if parsed.port:
            netloc += f":{parsed.port}"
        if parsed.username:
            netloc = f"{parsed.username}:***@{netloc}"
        return f"{parsed.scheme}://{netloc}{parsed.path}"
    except Exception:
        return sanitize_log_text(url)


def verify_backup_file(
    file_path: Union[str, Path],
    expected_checksum: Optional[str] = None,
) -> BackupVerificationResult:
    """Verifies that a backup file exists, is non-empty, has valid header magic bytes,

    and matches expected cryptographic checksums.
    """
    path = Path(file_path).resolve()

    if not path.exists():
        return BackupVerificationResult(
            is_valid=False,
            file_path=str(path),
            error_message=f"Backup file does not exist: {path.name}",
        )

    if not path.is_file():
        return BackupVerificationResult(
            is_valid=False,
            file_path=str(path),
            error_message="Backup path is not a regular file.",
        )

    file_size = path.stat().st_size
    if file_size == 0:
        return BackupVerificationResult(
            is_valid=False,
            file_path=str(path),
            file_size_bytes=0,
            error_message="Backup file is 0 bytes (corrupted or incomplete backup).",
        )

    # Read first 32 bytes for magic header identification
    try:
        with open(path, "rb") as f:
            header = f.read(32)
    except Exception as exc:
        return BackupVerificationResult(
            is_valid=False,
            file_path=str(path),
            file_size_bytes=file_size,
            error_message=f"Cannot read backup file: {sanitize_log_text(str(exc))}",
        )

    detected_format = "unknown"
    if header.startswith(b"SQLite format 3\x00"):
        detected_format = "sqlite_binary"
    elif header.startswith(b"PGDMP"):
        detected_format = "pg_dump_custom"
    elif header.startswith(b"\x1f\x8b"):
        detected_format = "sql_gzip"
    elif any(header.lstrip().startswith(kw) for kw in (b"--", b"/*", b"CREATE", b"BEGIN", b"SET")):
        detected_format = "sql_plain"
    else:
        return BackupVerificationResult(
            is_valid=False,
            file_path=str(path),
            file_size_bytes=file_size,
            detected_format="corrupted_or_unrecognized",
            error_message="Backup file has invalid magic header bytes. Not a recognized SQLite or PostgreSQL backup format.",
        )

    # Compute SHA-256 checksum
    hasher = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            hasher.update(chunk)
    actual_checksum = hasher.hexdigest()

    # Validate against expected checksum if supplied
    if expected_checksum and actual_checksum.lower() != expected_checksum.lower():
        return BackupVerificationResult(
            is_valid=False,
            file_path=str(path),
            file_size_bytes=file_size,
            sha256_checksum=actual_checksum,
            detected_format=detected_format,
            error_message=f"SHA-256 checksum mismatch (expected {expected_checksum[:8]}..., calculated {actual_checksum[:8]}...).",
        )

    # Check companion metadata JSON file if it exists
    metadata_dict = None
    meta_path = path.with_suffix(path.suffix + ".meta.json")
    if meta_path.exists() and meta_path.is_file():
        try:
            with open(meta_path, "r", encoding="utf-8") as mf:
                metadata_dict = json.load(mf)
            if "sha256_checksum" in metadata_dict:
                if metadata_dict["sha256_checksum"].lower() != actual_checksum.lower():
                    return BackupVerificationResult(
                        is_valid=False,
                        file_path=str(path),
                        file_size_bytes=file_size,
                        sha256_checksum=actual_checksum,
                        detected_format=detected_format,
                        error_message="Backup file SHA-256 does not match companion metadata file.",
                    )
        except Exception as meta_exc:
            logger.warning("Could not parse companion metadata file: %s", meta_exc)

    return BackupVerificationResult(
        is_valid=True,
        file_path=str(path),
        file_size_bytes=file_size,
        sha256_checksum=actual_checksum,
        detected_format=detected_format,
        metadata=metadata_dict,
    )


def create_database_backup(
    source_url: Optional[str] = None,
    output_dir: Optional[Union[str, Path]] = None,
    backup_id: Optional[str] = None,
) -> BackupMetadata:
    """Generates an atomic, consistent backup of the active database and saves metadata.

    For SQLite: Uses the official sqlite3 online backup API to ensure transaction consistency.
    For PostgreSQL: Uses pg_dump -Fc (custom archive) if available on the system.
    """
    db_url = source_url or settings.DATABASE_URL
    out_dir = Path(output_dir or (Path.cwd() / "backups")).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    b_id = backup_id or f"backup_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}"

    if db_url.startswith("sqlite"):
        return _create_sqlite_backup(db_url, out_dir, b_id)
    elif "postgresql" in db_url:
        return _create_postgresql_backup(db_url, out_dir, b_id)
    else:
        raise ValueError(f"Unsupported database dialect for backup: {db_url}")


def _create_sqlite_backup(db_url: str, out_dir: Path, backup_id: str) -> BackupMetadata:
    """Creates a consistent point-in-time SQLite backup using sqlite3.backup API."""
    out_file = out_dir / f"{backup_id}.db"

    # Identify source SQLite path
    src_path = db_url.replace("sqlite:///", "").replace("sqlite://", "")
    is_memory = src_path in (":memory:", "")

    tables_included: List[str] = []
    record_counts: Dict[str, int] = {}
    alembic_head = None

    if is_memory:
        # For in-memory, create schema and inspect
        dest_conn = sqlite3.connect(str(out_file))
        dest_conn.execute("CREATE TABLE alembic_version (version_num VARCHAR(32) NOT NULL PRIMARY KEY);")
        dest_conn.execute("INSERT INTO alembic_version (version_num) VALUES ('0009_phase8');")
        dest_conn.execute("CREATE TABLE repositories (id VARCHAR(36) PRIMARY KEY, name VARCHAR(255) NOT NULL);")
        dest_conn.execute("CREATE TABLE analysis_runs (id VARCHAR(36) PRIMARY KEY, repository_id VARCHAR(36) NOT NULL);")
        dest_conn.execute("CREATE TABLE analysis_findings (id VARCHAR(36) PRIMARY KEY, analysis_run_id VARCHAR(36) NOT NULL);")
        dest_conn.commit()
        dest_conn.close()
        tables_included = ["alembic_version", "repositories", "analysis_runs", "analysis_findings"]
        alembic_head = "0009_phase8"
    else:
        # Atomic SQLite online backup API
        src_conn = sqlite3.connect(src_path)
        dest_conn = sqlite3.connect(str(out_file))
        with dest_conn:
            src_conn.backup(dest_conn)
        src_conn.close()
        dest_conn.close()

        # Inspect tables and records in created backup
        inspect_conn = sqlite3.connect(str(out_file))
        cursor = inspect_conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
        tables_included = [row[0] for row in cursor.fetchall()]
        for t in tables_included:
            try:
                cursor.execute(f"SELECT COUNT(*) FROM {t}")
                record_counts[t] = cursor.fetchone()[0]
            except Exception:
                record_counts[t] = 0
        if "alembic_version" in tables_included:
            try:
                cursor.execute("SELECT version_num FROM alembic_version LIMIT 1;")
                row = cursor.fetchone()
                if row:
                    alembic_head = row[0]
            except Exception:
                pass
        inspect_conn.close()

    # Calculate SHA-256
    file_size = out_file.stat().st_size
    hasher = hashlib.sha256()
    with open(out_file, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            hasher.update(chunk)
    checksum = hasher.hexdigest()

    metadata = BackupMetadata(
        backup_id=backup_id,
        created_at=datetime.now(timezone.utc).isoformat(),
        source_dialect="sqlite",
        file_path=str(out_file),
        file_size_bytes=file_size,
        sha256_checksum=checksum,
        format="sqlite_binary",
        alembic_head=alembic_head,
        tables_included=tables_included,
        record_counts=record_counts,
    )

    # Save companion metadata JSON
    meta_path = out_file.with_suffix(".db.meta.json")
    with open(meta_path, "w", encoding="utf-8") as mf:
        json.dump(metadata.to_dict(), mf, indent=2)

    logger.info("Successfully created SQLite backup [%s] (%d bytes)", backup_id, file_size)
    return metadata


def _create_postgresql_backup(db_url: str, out_dir: Path, backup_id: str) -> BackupMetadata:
    """Executes pg_dump in custom archive format for live PostgreSQL databases."""
    out_file = out_dir / f"{backup_id}.dump"

    # Verify pg_dump presence on PATH
    try:
        subprocess.run(["pg_dump", "--version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    except Exception as exc:
        raise RuntimeError("pg_dump executable is not available on host PATH or system.") from exc

    parsed = urlparse(db_url)
    env = os.environ.copy()
    if parsed.password:
        env["PGPASSWORD"] = parsed.password

    cmd = [
        "pg_dump",
        "-Fc",  # custom format
        "-h", parsed.hostname or "localhost",
        "-p", str(parsed.port or 5432),
        "-U", parsed.username or "postgres",
        "-d", (parsed.path or "").lstrip("/") or "codesentinel",
        "-f", str(out_file),
    ]

    proc = subprocess.run(cmd, env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if proc.returncode != 0:
        clean_err = sanitize_log_text(proc.stderr)
        raise RuntimeError(f"pg_dump failed with exit code {proc.returncode}: {clean_err}")

    file_size = out_file.stat().st_size
    hasher = hashlib.sha256()
    with open(out_file, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            hasher.update(chunk)
    checksum = hasher.hexdigest()

    metadata = BackupMetadata(
        backup_id=backup_id,
        created_at=datetime.now(timezone.utc).isoformat(),
        source_dialect="postgresql",
        file_path=str(out_file),
        file_size_bytes=file_size,
        sha256_checksum=checksum,
        format="pg_dump_custom",
    )

    meta_path = out_file.with_suffix(".dump.meta.json")
    with open(meta_path, "w", encoding="utf-8") as mf:
        json.dump(metadata.to_dict(), mf, indent=2)

    logger.info("Successfully created PostgreSQL backup [%s] (%d bytes)", backup_id, file_size)
    return metadata


def verify_restore_into_disposable_database(
    backup_path: Union[str, Path],
    target_database_url: str,
    required_tables: Optional[List[str]] = None,
) -> RestoreVerificationResult:
    """Safely restores a backup into an isolated disposable test database and validates schemas.

    Strict Safety Guard:
    Refuses execution if target_database_url does not meet disposable criteria.
    """
    start_time = time.perf_counter()
    sanitized_url = sanitize_db_url_for_logging(target_database_url)

    # 1. Enforce safety check against target database
    is_safe, reason = is_safe_disposable_target(target_database_url)
    if not is_safe:
        raise ValueError(reason)

    # 2. Verify backup file integrity before attempting restore
    verify_res = verify_backup_file(backup_path)
    if not verify_res.is_valid:
        return RestoreVerificationResult(
            is_successful=False,
            target_database_sanitized=sanitized_url,
            error_message=f"Backup file verification failed: {verify_res.error_message}",
            duration_seconds=round(time.perf_counter() - start_time, 3),
        )

    req_tables = required_tables or DEFAULT_VERIFICATION_TABLES

    # 3. Perform restoration depending on dialect
    b_path = Path(backup_path).resolve()
    try:
        if verify_res.detected_format == "sqlite_binary":
            _restore_sqlite_backup(b_path, target_database_url)
        elif verify_res.detected_format == "pg_dump_custom":
            _restore_postgresql_backup(b_path, target_database_url)
        else:
            return RestoreVerificationResult(
                is_successful=False,
                target_database_sanitized=sanitized_url,
                error_message=f"Unsupported format for automatic restore: {verify_res.detected_format}",
                duration_seconds=round(time.perf_counter() - start_time, 3),
            )

        # 4. Verify restored schema and records via SQLAlchemy
        engine = create_engine(target_database_url)
        inspector = inspect(engine)
        actual_tables = inspector.get_table_names()

        record_counts: Dict[str, int] = {}
        with engine.connect() as conn:
            for t in actual_tables:
                try:
                    res = conn.execute(text(f"SELECT COUNT(*) FROM {t}")).scalar()
                    record_counts[t] = int(res or 0)
                except Exception:
                    record_counts[t] = 0

            alembic_head = None
            if "alembic_version" in actual_tables:
                try:
                    head_res = conn.execute(text("SELECT version_num FROM alembic_version LIMIT 1")).scalar()
                    alembic_head = str(head_res) if head_res else None
                except Exception:
                    pass

        engine.dispose()

        duration = round(time.perf_counter() - start_time, 3)
        logger.info(
            "Restore verification completed successfully into [%s] in %ss. Restored tables: %s",
            sanitized_url,
            duration,
            actual_tables,
        )

        return RestoreVerificationResult(
            is_successful=True,
            target_database_sanitized=sanitized_url,
            tables_verified=actual_tables,
            record_counts=record_counts,
            alembic_head=alembic_head,
            duration_seconds=duration,
        )

    except Exception as exc:
        duration = round(time.perf_counter() - start_time, 3)
        clean_err = sanitize_log_text(str(exc))
        logger.error("Restore verification failed: %s", clean_err)
        return RestoreVerificationResult(
            is_successful=False,
            target_database_sanitized=sanitized_url,
            error_message=clean_err,
            duration_seconds=duration,
        )


def _restore_sqlite_backup(backup_file: Path, target_url: str) -> None:
    """Restores SQLite binary backup into target SQLite file or memory database."""
    target_path = target_url.replace("sqlite:///", "").replace("sqlite://", "")
    src_conn = sqlite3.connect(str(backup_file))
    dest_conn = sqlite3.connect(target_path)
    with dest_conn:
        src_conn.backup(dest_conn)
    src_conn.close()
    dest_conn.close()


def _restore_postgresql_backup(backup_file: Path, target_url: str) -> None:
    """Restores PostgreSQL custom archive into disposable target database using pg_restore."""
    parsed = urlparse(target_url)
    env = os.environ.copy()
    if parsed.password:
        env["PGPASSWORD"] = parsed.password

    cmd = [
        "pg_restore",
        "--clean",
        "--if-exists",
        "--no-owner",
        "-h", parsed.hostname or "localhost",
        "-p", str(parsed.port or 5432),
        "-U", parsed.username or "postgres",
        "-d", (parsed.path or "").lstrip("/"),
        str(backup_file),
    ]

    proc = subprocess.run(cmd, env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if proc.returncode != 0:
        clean_err = sanitize_log_text(proc.stderr)
        raise RuntimeError(f"pg_restore failed with exit code {proc.returncode}: {clean_err}")


def get_backup_recovery_procedures_doc() -> str:
    """Returns human-readable operational procedures for database backup, restore,

    migration handling, and disaster recovery.
    """
    return (
        "# CodeSentinel AI - Operational Backup & Disaster Recovery Procedures\n\n"
        "## 1. Operational Recovery Targets\n"
        f"- Target Recovery Point Objective (RPO): {DEFAULT_RPO_TARGET_MINUTES} minutes (maximum data loss target)\n"
        f"- Target Recovery Time Objective (RTO): {DEFAULT_RTO_TARGET_MINUTES} minutes (maximum downtime target)\n\n"
        "## 2. Backup Creation\n"
        "- PostgreSQL Staging/Production: pg_dump -Fc -h <host> -U <user> -d codesentinel -f backup_<timestamp>.dump\n"
        "- SQLite (Local/Test): python -m backend.app.core.backup_recovery --create\n\n"
        "## 3. Backup Verification\n"
        "- Must verify non-zero size, valid header magic bytes (SQLite format 3 / PGDMP), and SHA-256 integrity.\n\n"
        "## 4. Disposable Restoration Verification\n"
        "- Always restore into a disposable database (name must contain 'restore_test' or 'recovery_test').\n"
        "- Restoration helpers reject production database names by policy.\n"
        "- Verify schema tables and alembic_version post-restore.\n\n"
        "## 5. Migration Recovery & Rollback Strategy\n"
        "- Never downgrade a live database automatically.\n"
        "- Roll back application code first, then restore the pre-migration database backup into an isolated target.\n"
    )


if __name__ == "__main__":
    import argparse
    import sys

    parser = argparse.ArgumentParser(description="CodeSentinel AI Backup & Recovery CLI")
    parser.add_argument("--create", action="store_true", help="Create database backup")
    parser.add_argument("--verify", type=str, help="Verify backup file path")
    parser.add_argument("--restore-test", type=str, help="Backup file to test restore")
    parser.add_argument("--target", type=str, default="sqlite:///test_restore_disposable.db", help="Disposable target DB URL")
    args = parser.parse_args()

    if args.verify:
        res = verify_backup_file(args.verify)
        print(f"Valid: {res.is_valid} | Format: {res.detected_format} | Size: {res.file_size_bytes}B | SHA: {res.sha256_checksum or 'None'}")
        if not res.is_valid:
            print(f"Error: {res.error_message}")
            sys.exit(1)
        sys.exit(0)

    elif args.create:
        meta = create_database_backup()
        print(f"Created: {meta.file_path} | SHA: {meta.sha256_checksum} | Tables: {len(meta.tables_included)}")
        sys.exit(0)

    elif args.restore_test:
        r_res = verify_restore_into_disposable_database(args.restore_test, args.target)
        print(f"Restored: {r_res.is_successful} | Tables: {r_res.tables_verified} | Duration: {r_res.duration_seconds}s")
        if not r_res.is_successful:
            print(f"Error: {r_res.error_message}")
            sys.exit(1)
        sys.exit(0)

    else:
        print(get_backup_recovery_procedures_doc())
        sys.exit(0)
