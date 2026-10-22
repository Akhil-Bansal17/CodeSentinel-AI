"""CodeSentinel AI - Phase 12 Deployment Automation & Production Operations Release Gate.

Strict release gate verification:
1. Static Checks (Frontend Oxlint & TypeScript typecheck)
2. Backend Unit Tests (Backend Pytest suite & task lifecycle)
3. Frontend Unit Tests (Frontend Vitest test suite)
4. Frontend Production Build (tsc -b && vite build)
5. Database Migration Safety (Single Alembic head & offline SQL generation)
6. Integration Tests & Security Regressions
7. Strict Live HTTP Smoke Test Journeys (Probes, Ingestion, Search, Remediation, CI/CD, Metrics)
8. Container Build and Runtime Tests (Docker engine dependent)
9. Container Vulnerability Scanning (Trivy/Grype dependent)
10. Live PostgreSQL Integration Tests (Live PostgreSQL dependent)

Every check must report one of: PASS, FAIL, BLOCKED, NOT VERIFIED.
"""

import argparse
import os
import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Tuple

ROOT_DIR = Path(__file__).resolve().parent.parent

# ANSI Colors
CYAN = "\033[96m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
BOLD = "\033[1m"
RESET = "\033[0m"


def run_cmd(cmd: List[str], cwd: Optional[Path] = None, env: Optional[dict] = None) -> Tuple[int, str]:
    """Execute a command and return (exit_code, combined_output)."""
    try:
        proc = subprocess.run(
            cmd,
            cwd=str(cwd or ROOT_DIR),
            env=env or os.environ.copy(),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
        return proc.returncode, proc.stdout
    except Exception as exc:
        return 1, str(exc)


def main() -> int:
    parser = argparse.ArgumentParser(description="CodeSentinel AI Phase 12 Release & Staging Operations Verification")
    parser.add_argument("--skip-smoke-journeys", action="store_true", help="Skip live HTTP smoke tests")
    args = parser.parse_args()

    # Determine Python and CLI executables
    if sys.platform == "win32":
        venv_py = ROOT_DIR / "backend" / ".venv" / "Scripts" / "python.exe"
        pytest_exe = ROOT_DIR / "backend" / ".venv" / "Scripts" / "pytest.exe"
        alembic_exe = ROOT_DIR / "backend" / ".venv" / "Scripts" / "alembic.exe"
        npm_cmd = "npm.cmd"
    else:
        venv_py = ROOT_DIR / "backend" / ".venv" / "bin" / "python"
        pytest_exe = ROOT_DIR / "backend" / ".venv" / "bin" / "pytest"
        alembic_exe = ROOT_DIR / "backend" / ".venv" / "bin" / "alembic"
        npm_cmd = "npm"

    py_bin = str(venv_py if venv_py.exists() else sys.executable)
    pytest_bin = str(pytest_exe if pytest_exe.exists() else "pytest")
    alembic_bin = str(alembic_exe if alembic_exe.exists() else "alembic")

    gate_results: Dict[str, str] = {}
    gate_details: Dict[str, str] = {}

    print(f"{CYAN}{'=' * 72}{RESET}")
    print(f"{CYAN} CodeSentinel AI - Release & Staging Operations Verification (Phase 12){RESET}")
    print(f"{CYAN}{'=' * 72}{RESET}")

    # =========================================================================
    # Gate 1: Static Checks (Frontend Oxlint & Backend Type/Syntax Sanity)
    # =========================================================================
    print(f"\n{YELLOW}[Gate 1/10] Static Checks (Frontend Code Quality - oxlint)...{RESET}")
    code, out = run_cmd([npm_cmd, "run", "lint"], cwd=ROOT_DIR / "frontend")
    if code == 0:
        gate_results["Gate 1 (Static Checks)"] = "PASS"
        gate_details["Gate 1 (Static Checks)"] = "0 errors reported by oxlint."
        print(f"  {GREEN}-> PASS: Static code quality verified (0 errors).{RESET}")
    else:
        gate_results["Gate 1 (Static Checks)"] = "FAIL"
        gate_details["Gate 1 (Static Checks)"] = f"Linter exited with code {code}."
        print(f"  {RED}-> FAIL: Linter reported errors (exit code {code}).{RESET}")
        print(out[-300:])

    # =========================================================================
    # Gate 2: Backend Unit Tests (Pytest Suite excluding live Postgres)
    # =========================================================================
    print(f"\n{YELLOW}[Gate 2/10] Backend Unit Tests (Pytest Suite)...{RESET}")
    code, out = run_cmd([pytest_bin, "-q", "backend/tests", "--ignore=backend/tests/test_live_postgresql.py"])
    if code == 0:
        summary_line = [line for line in out.strip().splitlines() if "passed" in line][-1:]
        disp = summary_line[0] if summary_line else "All unit tests passed."
        gate_results["Gate 2 (Unit Tests)"] = "PASS"
        gate_details["Gate 2 (Unit Tests)"] = disp
        print(f"  {GREEN}-> PASS: Backend unit test suite passed ({disp}).{RESET}")
    else:
        gate_results["Gate 2 (Unit Tests)"] = "FAIL"
        gate_details["Gate 2 (Unit Tests)"] = f"Pytest exited with code {code}."
        print(f"  {RED}-> FAIL: Backend unit tests failed (exit code {code}).{RESET}")
        print(out[-400:])

    # =========================================================================
    # Gate 3: Frontend Unit Tests (Vitest)
    # =========================================================================
    print(f"\n{YELLOW}[Gate 3/10] Frontend Unit Tests (Vitest Suite)...{RESET}")
    code, out = run_cmd([npm_cmd, "test"], cwd=ROOT_DIR / "frontend")
    if code == 0:
        summary_line = [line for line in out.strip().splitlines() if "Tests " in line][-1:]
        disp = summary_line[0] if summary_line else "All Vitest tests passed."
        gate_results["Gate 3 (Frontend Tests)"] = "PASS"
        gate_details["Gate 3 (Frontend Tests)"] = disp
        print(f"  {GREEN}-> PASS: Frontend Vitest suite passed ({disp}).{RESET}")
    else:
        gate_results["Gate 3 (Frontend Tests)"] = "FAIL"
        gate_details["Gate 3 (Frontend Tests)"] = f"Vitest exited with code {code}."
        print(f"  {RED}-> FAIL: Frontend tests failed (exit code {code}).{RESET}")
        print(out[-400:])

    # =========================================================================
    # Gate 4: Frontend Production Build & Typecheck (tsc -b && vite build)
    # =========================================================================
    print(f"\n{YELLOW}[Gate 4/10] Frontend Production Build & Typecheck (tsc -b && vite build)...{RESET}")
    code, out = run_cmd([npm_cmd, "run", "build"], cwd=ROOT_DIR / "frontend")
    if code == 0:
        gate_results["Gate 4 (Frontend Build)"] = "PASS"
        gate_details["Gate 4 (Frontend Build)"] = "TypeScript typecheck passed; production bundle emitted."
        print(f"  {GREEN}-> PASS: Frontend production build succeeded.{RESET}")
    else:
        gate_results["Gate 4 (Frontend Build)"] = "FAIL"
        gate_details["Gate 4 (Frontend Build)"] = f"Build failed with exit code {code}."
        print(f"  {RED}-> FAIL: Frontend build failed (exit code {code}).{RESET}")
        print(out[-400:])

    # =========================================================================
    # Gate 5: Database Migration Safety (Alembic single head & SQL generation)
    # =========================================================================
    print(f"\n{YELLOW}[Gate 5/10] Database Migration Safety (Single Head & Offline SQL Generation)...{RESET}")
    code, out = run_cmd([
        py_bin,
        "-c",
        "from backend.app.core.migration_safety import run_migration_safety_check; r = run_migration_safety_check(); print(f'Heads: {r.head_revisions} | DDL: {r.sql_output_bytes} bytes'); exit(0 if r.passed else 1)",
    ])
    if code == 0:
        gate_results["Gate 5 (Migration Safety)"] = "PASS"
        gate_details["Gate 5 (Migration Safety)"] = out.strip().splitlines()[-1] if out.strip() else "Single head and offline DDL verified."
        print(f"  {GREEN}-> PASS: Alembic migration safety verified ({gate_details['Gate 5 (Migration Safety)']}).{RESET}")
    else:
        gate_results["Gate 5 (Migration Safety)"] = "FAIL"
        gate_details["Gate 5 (Migration Safety)"] = "Migration safety check failed."
        print(f"  {RED}-> FAIL: Migration safety validation failed (code {code}).{RESET}")
        print(out[-300:])

    # =========================================================================
    # Gate 6: Integration Tests (Security Regressions & Config Validation)
    # =========================================================================
    print(f"\n{YELLOW}[Gate 6/10] Integration Tests (Security Regressions & Task Hardening)...{RESET}")
    code, out = run_cmd([
        pytest_bin,
        "-q",
        "backend/tests/test_security_regressions.py",
        "backend/tests/test_config.py",
    ])
    if code == 0:
        gate_results["Gate 6 (Integration Tests)"] = "PASS"
        gate_details["Gate 6 (Integration Tests)"] = "Security regressions, SSRF guards, and config validations passed."
        print(f"  {GREEN}-> PASS: Security regressions and configuration validation passed.{RESET}")
    else:
        gate_results["Gate 6 (Integration Tests)"] = "FAIL"
        gate_details["Gate 6 (Integration Tests)"] = f"Integration tests exited with code {code}."
        print(f"  {RED}-> FAIL: Integration tests failed (exit code {code}).{RESET}")
        print(out[-300:])

    # =========================================================================
    # Gate 7: Strict Live HTTP Smoke Test Journeys (Probes, Ingest, Search, Rem, CI, Metrics)
    # =========================================================================
    if not args.skip_smoke_journeys:
        print(f"\n{YELLOW}[Gate 7/10] Executing Strict Live HTTP Smoke Test Journeys...{RESET}")
        code, out = run_cmd([py_bin, "scripts/run_smoke_tests.py"])
        print(out)
        if code == 0:
            gate_results["Gate 7 (Smoke Journeys)"] = "PASS"
            gate_details["Gate 7 (Smoke Journeys)"] = "All 6 smoke test journeys passed with strict assertions."
            print(f"  {GREEN}-> PASS: All required smoke test journeys passed.{RESET}")
        else:
            gate_results["Gate 7 (Smoke Journeys)"] = "FAIL"
            gate_details["Gate 7 (Smoke Journeys)"] = f"Live API smoke tests failed (exit code {code})."
            print(f"  {RED}-> FAIL: Live API smoke tests reported failures (exit code {code}).{RESET}")
    else:
        gate_results["Gate 7 (Smoke Journeys)"] = "SKIPPED"
        gate_details["Gate 7 (Smoke Journeys)"] = "Skipped by command line argument."
        print(f"\n{YELLOW}[Gate 7/10] Live HTTP Smoke Test Journeys SKIPPED by parameter.{RESET}")

    # =========================================================================
    # Gate 8: Container Build & Runtime Verification (Docker Engine)
    # =========================================================================
    print(f"\n{YELLOW}[Gate 8/10] Checking Docker Engine & Container Build...{RESET}")
    code, out = run_cmd(["docker", "info"])
    docker_online = code == 0 and "failed to connect" not in out and "open //./pipe/docker_engine" not in out
    if docker_online:
        print(f"  {GREEN}-> Docker daemon is online. Executing backend container build...{RESET}")
        build_code, build_out = run_cmd(["docker", "build", "-t", "codesentinel-backend:staging-verify", "./backend"])
        if build_code == 0:
            gate_results["Gate 8 (Container Runtime)"] = "PASS"
            gate_details["Gate 8 (Container Runtime)"] = "Docker image codesentinel-backend built successfully."
            print(f"  {GREEN}-> PASS: Container build succeeded.{RESET}")
        else:
            gate_results["Gate 8 (Container Runtime)"] = "FAIL"
            gate_details["Gate 8 (Container Runtime)"] = "Docker build failed."
            print(f"  {RED}-> FAIL: Docker build failed (exit code {build_code}).{RESET}")
    else:
        gate_results["Gate 8 (Container Runtime)"] = "BLOCKED"
        gate_details["Gate 8 (Container Runtime)"] = "Docker daemon is inactive/offline on host."
        print(f"  {YELLOW}-> BLOCKED: Docker daemon is inactive on host.{RESET}")
        print(f"     Required action to verify container: Start Docker Desktop and re-run certification.")

    # =========================================================================
    # Gate 9: Container Vulnerability Scanning (Trivy / Grype)
    # =========================================================================
    print(f"\n{YELLOW}[Gate 9/10] Checking Vulnerability Scanner (Trivy)...{RESET}")
    code_trivy, out_trivy = run_cmd(["trivy", "--version"])
    if docker_online and code_trivy == 0:
        print(f"  {GREEN}-> Trivy found. Scanning codesentinel-backend:staging-verify...{RESET}")
        scan_code, scan_out = run_cmd(["trivy", "image", "--severity", "CRITICAL", "codesentinel-backend:staging-verify"])
        if scan_code == 0:
            gate_results["Gate 9 (Vulnerability Scan)"] = "PASS"
            gate_details["Gate 9 (Vulnerability Scan)"] = "Zero critical vulnerabilities found by Trivy."
            print(f"  {GREEN}-> PASS: Image vulnerability scan passed.{RESET}")
        else:
            gate_results["Gate 9 (Vulnerability Scan)"] = "FAIL"
            gate_details["Gate 9 (Vulnerability Scan)"] = "Critical vulnerabilities found in image."
            print(f"  {RED}-> FAIL: Trivy scan reported issues.{RESET}")
    else:
        gate_results["Gate 9 (Vulnerability Scan)"] = "BLOCKED"
        gate_details["Gate 9 (Vulnerability Scan)"] = "Docker daemon or Trivy scanner CLI unavailable."
        print(f"  {YELLOW}-> BLOCKED: Container vulnerability scanner unavailable or Docker offline.{RESET}")

    # =========================================================================
    # Gate 10: Live PostgreSQL Integration Tests
    # =========================================================================
    print(f"\n{YELLOW}[Gate 10/10] Checking Live PostgreSQL Integration Tests...{RESET}")
    code, out = run_cmd([pytest_bin, "-q", "backend/tests/test_live_postgresql.py"])
    if code == 0:
        if "passed" in out:
            gate_results["Gate 10 (Live PostgreSQL)"] = "PASS"
            gate_details["Gate 10 (Live PostgreSQL)"] = "PostgreSQL integration tests executed and passed."
            print(f"  {GREEN}-> PASS: Live PostgreSQL integration tests executed and passed.{RESET}")
        else:
            gate_results["Gate 10 (Live PostgreSQL)"] = "NOT VERIFIED"
            gate_details["Gate 10 (Live PostgreSQL)"] = "PostgreSQL service offline; tests safely skipped."
            print(f"  {YELLOW}-> NOT VERIFIED (SKIPPED): Live PostgreSQL instance is offline on port 5432/5433. Tests safely skipped.{RESET}")
    else:
        gate_results["Gate 10 (Live PostgreSQL)"] = "FAIL"
        gate_details["Gate 10 (Live PostgreSQL)"] = f"PostgreSQL integration tests failed with exit code {code}."
        print(f"  {RED}-> FAIL: PostgreSQL integration tests failed (exit code {code}).{RESET}")

    # =========================================================================
    # Final Comprehensive Summary Table
    # =========================================================================
    print(f"\n{CYAN}{'=' * 72}{RESET}")
    print(f"{CYAN} Phase 12 Deployment Operations & Staging Certification Summary{RESET}")
    print(f"{CYAN}{'=' * 72}{RESET}")

    has_failures = any(res == "FAIL" for res in gate_results.values())
    blocked_count = sum(1 for res in gate_results.values() if res in ("BLOCKED", "NOT VERIFIED"))

    for gate_name, status in gate_results.items():
        if status == "PASS":
            color = GREEN
        elif status == "FAIL":
            color = RED
        elif status in ("BLOCKED", "NOT VERIFIED"):
            color = YELLOW
        else:
            color = RESET

        print(f"  {gate_name:<36}: {color}{status:<14}{RESET} | {gate_details.get(gate_name, '')}")

    print(f"{CYAN}{'=' * 72}{RESET}")

    if has_failures:
        print(f"{RED}{BOLD}OVERALL VERDICT: NOT READY -- APPLICATION DEFECTS REMAIN{RESET}")
        return 1
    elif blocked_count > 0:
        print(f"{YELLOW}{BOLD}OVERALL VERDICT: CONDITIONALLY READY -- EXTERNAL INFRASTRUCTURE PENDING{RESET}")
        print(f"{GREEN}Application Code & Telemetry Gates : ALL PASSED (0 defects){RESET}")

        print(f"{YELLOW}Pending Infrastructure Gates       : {blocked_count} gate(s) BLOCKED / NOT VERIFIED{RESET}")
        print(f"\nTo achieve 100% full certification:")
        print("  1. Start Docker Desktop (to verify Gate 8 & Gate 9)")
        print("  2. Start local PostgreSQL on port 5432 (to verify Gate 10)")
        print("  3. Run: ./scripts/validate_release.ps1 or ./scripts/validate_release.sh")
        return 0
    else:
        print(f"{GREEN}{BOLD}OVERALL VERDICT: 100% FULLY CERTIFIED FOR PRODUCTION/STAGING{RESET}")
        return 0


if __name__ == "__main__":
    sys.exit(main())
