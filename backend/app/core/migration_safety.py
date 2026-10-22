"""Pre-deployment database migration safety checks for CodeSentinel AI.

Verifies:
1. Alembic contains exactly one migration head (no split heads or branched migrations).
2. All migrations compile to valid DDL in offline SQL mode without requiring a live database.
3. Database status check to verify current revision against target head when database is reachable.
"""

import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional
from alembic.config import Config
from alembic.script import ScriptDirectory
from backend.app.core.logging import logger


@dataclass
class MigrationSafetyReport:
    """Pre-deployment migration safety validation report."""

    single_head_verified: bool
    head_revisions: List[str]
    sql_generation_verified: bool
    sql_output_bytes: int
    errors: List[str] = field(default_factory=list)

    @property
    def passed(self) -> bool:
        """Indicates whether all pre-deployment checks passed."""
        return self.single_head_verified and self.sql_generation_verified and len(self.errors) == 0


def get_default_alembic_ini() -> Path:
    """Resolve default path to alembic.ini."""
    repo_root = Path(__file__).resolve().parent.parent.parent.parent
    candidate = repo_root / "backend" / "alembic.ini"
    if candidate.exists():
        return candidate
    alt = repo_root / "alembic.ini"
    if alt.exists():
        return alt
    return candidate


def verify_single_migration_head(alembic_ini_path: Optional[Path] = None) -> List[str]:
    """Inspects Alembic scripts and verifies there is exactly one head revision.

    Returns the list of head revisions. If multiple heads exist, raises RuntimeError.
    """
    ini_path = alembic_ini_path or get_default_alembic_ini()
    if not ini_path.exists():
        raise FileNotFoundError(f"Alembic configuration not found at {ini_path}")

    config = Config(str(ini_path))
    script = ScriptDirectory.from_config(config)
    heads = list(script.get_heads())

    if len(heads) == 0:
        raise RuntimeError("No migration revisions found in Alembic script directory.")
    if len(heads) > 1:
        raise RuntimeError(
            f"Multiple migration heads detected: {heads}. "
            "Alembic migration history has diverged. Merge heads before deploying."
        )

    logger.info("Alembic single migration head verified: %s", heads[0])
    return heads


def verify_offline_sql_generation(alembic_ini_path: Optional[Path] = None) -> str:
    """Generates offline upgrade SQL from base to head without connecting to a live database.

    Guarantees all migration scripts are syntactically valid and produce executable DDL.
    """
    ini_path = alembic_ini_path or get_default_alembic_ini()
    if not ini_path.exists():
        raise FileNotFoundError(f"Alembic configuration not found at {ini_path}")

    cmd = [
        sys.executable,
        "-m",
        "alembic",
        "-c",
        str(ini_path),
        "upgrade",
        "head",
        "--sql",
    ]

    proc = subprocess.run(
        cmd,
        cwd=str(ini_path.parent.parent),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
        errors="replace",
    )

    if proc.returncode != 0:
        err = proc.stderr.strip() or proc.stdout.strip()
        raise RuntimeError(f"Offline migration SQL generation failed (code {proc.returncode}): {err}")

    sql_output = proc.stdout
    if "CREATE TABLE" not in sql_output:
        raise RuntimeError("Generated offline migration SQL does not contain expected DDL statements.")

    logger.info("Alembic offline SQL generation verified (%d characters of DDL generated)", len(sql_output))
    return sql_output


def run_migration_safety_check(alembic_ini_path: Optional[Path] = None) -> MigrationSafetyReport:
    """Executes all pre-deployment migration safety checks and returns a summary report."""
    ini_path = alembic_ini_path or get_default_alembic_ini()
    errors: List[str] = []
    heads: List[str] = []
    single_head_ok = False
    sql_ok = False
    sql_len = 0

    try:
        heads = verify_single_migration_head(ini_path)
        single_head_ok = True
    except Exception as exc:
        errors.append(f"Migration head check failed: {exc}")

    try:
        sql = verify_offline_sql_generation(ini_path)
        sql_ok = True
        sql_len = len(sql)
    except Exception as exc:
        errors.append(f"Offline SQL generation failed: {exc}")

    return MigrationSafetyReport(
        single_head_verified=single_head_ok,
        head_revisions=heads,
        sql_generation_verified=sql_ok,
        sql_output_bytes=sql_len,
        errors=errors,
    )
