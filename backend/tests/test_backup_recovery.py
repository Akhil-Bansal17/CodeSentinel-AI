"""Tests for Database Backup, Restore Verification & Disaster Recovery (Phase 13).

Verifies:
- Safety guards against overwriting production/staging/primary databases
- Backup file verification (existence, size > 0, header magic bytes, SHA-256 integrity)
- Rejection of 0-byte, nonexistent, corrupted, or header-invalid backups
- Creation of atomic SQLite backups with metadata sidecars
- Successful restoration into disposable recovery test databases
- Post-restore schema and record count verification
- Operational recovery objectives (RPO/RTO) and backup limitations documentation
"""

import hashlib
import json
from pathlib import Path
import sqlite3
import pytest

from backend.app.core.backup_recovery import (
    DEFAULT_RPO_TARGET_MINUTES,
    DEFAULT_RTO_TARGET_MINUTES,
    BackupMetadata,
    create_database_backup,
    get_backup_recovery_procedures_doc,
    is_safe_disposable_target,
    verify_backup_file,
    verify_restore_into_disposable_database,
)


def test_is_safe_disposable_target_guards():
    """Restoration helpers must reject protected and non-disposable target databases."""
    # 1. Protected names must be rejected
    protected_cases = [
        "postgresql://postgres:secret@db:5432/codesentinel",
        "postgresql://postgres:secret@db:5432/production",
        "postgresql://postgres:secret@db:5432/prod",
        "postgresql://postgres:secret@db:5432/staging",
        "postgresql://postgres:secret@db:5432/main",
        "sqlite:///codesentinel.db",
        "sqlite:///production.sqlite3",
        "codesentinel",
        "prod",
    ]
    for target in protected_cases:
        is_safe, reason = is_safe_disposable_target(target)
        assert not is_safe, f"Expected {target} to be rejected, but passed"
        assert "prohibited" in reason.lower() or "protected" in reason.lower()

    # 2. Arbitrary non-disposable names must be rejected
    unmarked_cases = [
        "postgresql://postgres:secret@db:5432/customer_analytics",
        "sqlite:///my_local_data.db",
        "arbitrary_name",
    ]
    for target in unmarked_cases:
        is_safe, reason = is_safe_disposable_target(target)
        assert not is_safe, f"Expected {target} to be rejected, but passed"
        assert "not marked as disposable" in reason.lower()

    # 3. Approved disposable targets must pass
    disposable_cases = [
        ":memory:",
        "sqlite:///:memory:",
        "sqlite:///test_restore_disposable.db",
        "sqlite:///scratch/recovery_test_db.sqlite",
        "postgresql://postgres:secret@db:5432/staging_restore_test_db",
        "postgresql://postgres:secret@db:5432/codesentinel_disposable_check",
    ]
    for target in disposable_cases:
        is_safe, reason = is_safe_disposable_target(target)
        assert is_safe, f"Expected {target} to pass disposable guard, but failed: {reason}"


def test_verify_backup_file_nonexistent(tmp_path: Path):
    """Non-existent backup path must report is_valid=False with clear error."""
    fake_path = tmp_path / "nonexistent_backup.dump"
    res = verify_backup_file(fake_path)
    assert not res.is_valid
    assert "does not exist" in res.error_message


def test_verify_backup_file_zero_byte(tmp_path: Path):
    """Empty (0-byte) backup file must be rejected."""
    empty_file = tmp_path / "empty_backup.db"
    empty_file.touch()
    res = verify_backup_file(empty_file)
    assert not res.is_valid
    assert res.file_size_bytes == 0
    assert "0 bytes" in res.error_message


def test_verify_backup_file_corrupted_header(tmp_path: Path):
    """Backup file with invalid magic bytes must be rejected."""
    corrupted_file = tmp_path / "corrupted_backup.db"
    corrupted_file.write_bytes(b"INVALID_HEADER_GARBAGE_BYTES_1234567890")
    res = verify_backup_file(corrupted_file)
    assert not res.is_valid
    assert res.detected_format == "corrupted_or_unrecognized"
    assert "invalid magic header" in res.error_message.lower()


def test_verify_backup_file_checksum_mismatch(tmp_path: Path):
    """Valid header file with wrong expected checksum must fail validation."""
    valid_sqlite = tmp_path / "valid_header.db"
    # Create valid SQLite file
    conn = sqlite3.connect(str(valid_sqlite))
    conn.execute("CREATE TABLE sample (id INT);")
    conn.commit()
    conn.close()

    wrong_checksum = "0" * 64
    res = verify_backup_file(valid_sqlite, expected_checksum=wrong_checksum)
    assert not res.is_valid
    assert "checksum mismatch" in res.error_message.lower()


def test_create_and_verify_sqlite_backup_lifecycle(tmp_path: Path):
    """Verify full creation, checksumming, and verification flow of SQLite backup."""
    # 1. Create a source database with test schema and data
    src_db = tmp_path / "source_app.db"
    conn = sqlite3.connect(str(src_db))
    conn.execute("CREATE TABLE alembic_version (version_num VARCHAR(32) NOT NULL PRIMARY KEY);")
    conn.execute("INSERT INTO alembic_version (version_num) VALUES ('0009_phase8');")
    conn.execute("CREATE TABLE repositories (id VARCHAR(36) PRIMARY KEY, name VARCHAR(255) NOT NULL);")
    conn.execute("INSERT INTO repositories (id, name) VALUES ('repo-1', 'CodeSentinel-Core');")
    conn.execute("CREATE TABLE analysis_runs (id VARCHAR(36) PRIMARY KEY, repository_id VARCHAR(36) NOT NULL);")
    conn.execute("INSERT INTO analysis_runs (id, repository_id) VALUES ('run-1', 'repo-1');")
    conn.execute("CREATE TABLE analysis_findings (id VARCHAR(36) PRIMARY KEY, analysis_run_id VARCHAR(36) NOT NULL);")
    conn.execute("INSERT INTO analysis_findings (id, analysis_run_id) VALUES ('finding-1', 'run-1');")
    conn.commit()
    conn.close()

    # 2. Create backup
    backup_dir = tmp_path / "backups"
    meta = create_database_backup(
        source_url=f"sqlite:///{src_db}",
        output_dir=backup_dir,
        backup_id="test_backup_001",
    )

    assert meta.backup_id == "test_backup_001"
    assert Path(meta.file_path).exists()
    assert meta.file_size_bytes > 0
    assert meta.format == "sqlite_binary"
    assert meta.alembic_head == "0009_phase8"
    assert "repositories" in meta.tables_included
    assert meta.record_counts.get("repositories") == 1
    assert meta.record_counts.get("analysis_runs") == 1
    assert meta.record_counts.get("analysis_findings") == 1

    # 3. Companion metadata file must exist
    meta_path = Path(meta.file_path).with_suffix(".db.meta.json")
    assert meta_path.exists()
    with open(meta_path, "r", encoding="utf-8") as mf:
        loaded_meta = json.load(mf)
    assert loaded_meta["sha256_checksum"] == meta.sha256_checksum

    # 4. Verify backup file
    res = verify_backup_file(meta.file_path)
    assert res.is_valid
    assert res.detected_format == "sqlite_binary"
    assert res.sha256_checksum == meta.sha256_checksum
    assert res.metadata is not None


def test_restore_into_disposable_database_success(tmp_path: Path):
    """Restore into disposable test database succeeds and verifies schema and record counts."""
    # 1. Create a source database
    src_db = tmp_path / "source_app_restore.db"
    conn = sqlite3.connect(str(src_db))
    conn.execute("CREATE TABLE alembic_version (version_num VARCHAR(32) NOT NULL PRIMARY KEY);")
    conn.execute("INSERT INTO alembic_version (version_num) VALUES ('0009_phase8');")
    conn.execute("CREATE TABLE repositories (id VARCHAR(36) PRIMARY KEY, name VARCHAR(255) NOT NULL);")
    conn.execute("INSERT INTO repositories (id, name) VALUES ('repo-abc', 'Sentinel-App');")
    conn.commit()
    conn.close()

    # 2. Backup
    backup_dir = tmp_path / "backups_restore"
    meta = create_database_backup(
        source_url=f"sqlite:///{src_db}",
        output_dir=backup_dir,
        backup_id="restore_sample_001",
    )

    # 3. Restore into disposable target
    disposable_target = tmp_path / "test_restore_disposable.db"
    target_url = f"sqlite:///{disposable_target}"
    res = verify_restore_into_disposable_database(meta.file_path, target_url)

    assert res.is_successful
    assert "repositories" in res.tables_verified
    assert "alembic_version" in res.tables_verified
    assert res.record_counts.get("repositories") == 1
    assert res.alembic_head == "0009_phase8"
    assert res.duration_seconds >= 0.0


def test_restore_rejects_production_target(tmp_path: Path):
    """Restoration helper must raise ValueError when targeting a production database."""
    fake_backup = tmp_path / "valid.db"
    conn = sqlite3.connect(str(fake_backup))
    conn.execute("CREATE TABLE test (id INT);")
    conn.commit()
    conn.close()

    # Targeting a production DB
    with pytest.raises(ValueError, match="prohibited"):
        verify_restore_into_disposable_database(fake_backup, "sqlite:///codesentinel.db")

    with pytest.raises(ValueError, match="prohibited"):
        verify_restore_into_disposable_database(
            fake_backup, "postgresql://postgres:secret@db:5432/codesentinel"
        )


def test_restore_corrupted_backup_rejected(tmp_path: Path):
    """Attempting restore with a corrupted file must report is_successful=False."""
    bad_backup = tmp_path / "corrupted.db"
    bad_backup.write_bytes(b"BAD_CONTENT_BYTES")

    disposable_target = tmp_path / "test_restore_disposable_bad.db"
    target_url = f"sqlite:///{disposable_target}"

    res = verify_restore_into_disposable_database(bad_backup, target_url)
    assert not res.is_successful
    assert "verification failed" in res.error_message.lower()


def test_recovery_targets_and_documentation():
    """Verify recovery objectives (RPO/RTO) and documentation details."""
    assert DEFAULT_RPO_TARGET_MINUTES > 0
    assert DEFAULT_RTO_TARGET_MINUTES > 0

    doc = get_backup_recovery_procedures_doc()
    assert "Operational Recovery Targets" in doc
    assert "Recovery Point Objective (RPO)" in doc
    assert "Recovery Time Objective (RTO)" in doc
    assert "pg_dump" in doc
    assert "disposable" in doc.lower()
    assert "downgrade" in doc.lower()
