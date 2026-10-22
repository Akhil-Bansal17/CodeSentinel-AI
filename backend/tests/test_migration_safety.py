"""Tests for Pre-deployment Migration Safety Checks (Phase 12).

Verifies:
- Detection of single migration head vs divergent branches
- Offline migration SQL DDL generation without requiring a live database
- Structured MigrationSafetyReport output
- Error handling for missing configuration or invalid history
"""

from pathlib import Path
from unittest.mock import MagicMock, patch
import pytest
from backend.app.core.migration_safety import (
    MigrationSafetyReport,
    get_default_alembic_ini,
    run_migration_safety_check,
    verify_offline_sql_generation,
    verify_single_migration_head,
)


def test_default_alembic_ini_exists():
    """Verify default alembic.ini is discovered in the project structure."""
    ini_path = get_default_alembic_ini()
    assert ini_path.exists(), f"alembic.ini not found at {ini_path}"


def test_verify_single_migration_head_passes():
    """Verify that the codebase has exactly one migration head."""
    heads = verify_single_migration_head()
    assert isinstance(heads, list)
    assert len(heads) == 1
    assert heads[0] == "0009_phase8"


def test_verify_single_migration_head_fails_on_multiple_heads():
    """Verify that multiple heads raise RuntimeError to prevent deploying branched migrations."""
    with patch("backend.app.core.migration_safety.ScriptDirectory") as mock_sd:
        mock_instance = MagicMock()
        mock_instance.get_heads.return_value = ["head_a", "head_b"]
        mock_sd.from_config.return_value = mock_instance

        with pytest.raises(RuntimeError, match="Multiple migration heads detected"):
            verify_single_migration_head()


def test_verify_single_migration_head_fails_on_missing_config(tmp_path: Path):
    """Verify FileNotFoundError is raised when alembic.ini does not exist."""
    fake_path = tmp_path / "nonexistent.ini"
    with pytest.raises(FileNotFoundError):
        verify_single_migration_head(fake_path)


def test_verify_offline_sql_generation():
    """Verify offline SQL generation produces valid DDL without modifying any live database."""
    sql = verify_offline_sql_generation()
    assert isinstance(sql, str)
    assert len(sql) > 1000
    assert "CREATE TABLE" in sql
    assert "alembic_version" in sql


def test_run_migration_safety_check_report():
    """Verify full pre-deployment migration check produces a passing report."""
    report = run_migration_safety_check()
    assert isinstance(report, MigrationSafetyReport)
    assert report.passed is True
    assert report.single_head_verified is True
    assert report.sql_generation_verified is True
    assert report.sql_output_bytes > 0
    assert len(report.errors) == 0
    assert report.head_revisions == ["0009_phase8"]
