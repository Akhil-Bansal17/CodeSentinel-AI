<#
.SYNOPSIS
    CodeSentinel AI - Phase 11 Staging Certification & Deployment Verification Script
.DESCRIPTION
    Executes the reproducible release certification procedure:
    1. Backend Pytest test suite & security regressions
    2. Frontend Vitest suite
    3. Frontend TypeScript compilation (tsc -b) & Vite build
    4. Frontend Oxlint code quality verification
    5. Alembic migration chain verification (heads & offline DDL)
    6. Live PostgreSQL integration verification (or honest NOT VERIFIED report)
    7. Docker build and vulnerability scan verification (or honest NOT VERIFIED report)
    8. Strict live HTTP smoke test journeys (probes, ingestion, search, remediation, CI/CD)
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
