<#
.SYNOPSIS
    CodeSentinel AI - Phase 12 Deployment Automation & Production Operations Release Script
.DESCRIPTION
    Executes the reproducible release certification procedure across 10 strict gates:
    1. Static Checks (Frontend Oxlint code quality)
    2. Backend Unit Tests (Pytest suite)
    3. Frontend Unit Tests (Vitest suite)
    4. Frontend Production Build & Typecheck (tsc -b && vite build)
    5. Database Migration Safety (Alembic single head & offline DDL)
    6. Integration Tests & Security Regressions
    7. Strict Live HTTP Smoke Test Journeys (Probes, Ingestion, Search, Remediation, CI/CD, Metrics)
    8. Container Build and Runtime Tests (Docker engine dependent)
    9. Container Vulnerability Scanning (Trivy dependent)
    10. Live PostgreSQL Integration Tests (PostgreSQL dependent)
#>

param(
    [switch]$SkipSmokeJourneys
)

$pyBin = ".\backend\.venv\Scripts\python.exe"
if (-not (Test-Path $pyBin)) {
    $pyBin = "python"
}

$pyArgs = @("scripts/validate_release.py")
if ($SkipSmokeJourneys) {
    $pyArgs += "--skip-smoke-journeys"
}

& $pyBin $pyArgs
exit $LASTEXITCODE
