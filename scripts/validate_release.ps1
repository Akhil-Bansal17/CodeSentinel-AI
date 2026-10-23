<#
.SYNOPSIS
    CodeSentinel AI - Phase 13 Production Certification & Disaster Recovery Release Script
.DESCRIPTION
    Executes the reproducible release certification procedure across 12 strict gates:
    1. Static Checks (Frontend Oxlint code quality & config sanity)
    2. Backend Unit Tests (Pytest suite)
    3. Frontend Unit Tests (Vitest suite)
    4. Frontend Production Build & Typecheck (tsc -b && vite build)
    5. Database Migration Safety (Alembic single head & offline DDL)
    6. Integration Tests & Security Regressions
    7. Operational Failure Injection & Resilience Tests
    8. Backup, Checksum & Disaster Recovery Verification
    9. Strict Live HTTP Smoke Test Journeys (Probes, Ingestion, Search, Remediation, CI/CD, Metrics)
    10. Container Build and Runtime Tests (Docker engine dependent)
    11. Container Vulnerability Scanning (Trivy dependent)
    12. Live PostgreSQL Integration Tests (PostgreSQL dependent)
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
