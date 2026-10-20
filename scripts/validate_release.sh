#!/usr/bin/env bash
# CodeSentinel AI - Phase 10 Release Candidate Validation Script (POSIX)
set -eo pipefail

echo "================================================================"
echo " CodeSentinel AI - Release Candidate Validation (Phase 10)"
echo "================================================================"

failed_checks=0

# 1. Backend Test Suite
echo -e "\n[Check 1/7] Running Backend Pytest Suite..."
if ./backend/.venv/bin/pytest -q backend/tests; then
    echo "  -> PASS: Backend test suite completed successfully."
else
    echo "  -> FAIL: Backend tests failed."
    failed_checks=$((failed_checks + 1))
fi

# 2. Frontend Vitest Suite
echo -e "\n[Check 2/7] Running Frontend Vitest Suite..."
if (cd frontend && npm test); then
    echo "  -> PASS: Frontend Vitest suite completed successfully."
else
    echo "  -> FAIL: Frontend tests failed."
    failed_checks=$((failed_checks + 1))
fi

# 3. Frontend Typecheck and Build
echo -e "\n[Check 3/7] Running Frontend Typecheck & Build..."
if (cd frontend && npm run build); then
    echo "  -> PASS: Frontend production build succeeded."
else
    echo "  -> FAIL: Frontend build failed."
    failed_checks=$((failed_checks + 1))
fi

# 4. Frontend Lint
echo -e "\n[Check 4/7] Running Frontend Lint..."
if (cd frontend && npm run lint); then
    echo "  -> PASS: Frontend lint passed (0 errors)."
else
    echo "  -> FAIL: Frontend lint failed."
    failed_checks=$((failed_checks + 1))
fi

# 5. Database Migration Chain
echo -e "\n[Check 5/7] Verifying Alembic Migration Chain..."
if ./backend/.venv/bin/alembic -c backend/alembic.ini heads && ./backend/.venv/bin/alembic -c backend/alembic.ini upgrade head --sql > /dev/null; then
    echo "  -> PASS: Alembic migration chain 0001-0009 verified."
else
    echo "  -> FAIL: Migration validation failed."
    failed_checks=$((failed_checks + 1))
fi

# 6. Live PostgreSQL Integration Tests
echo -e "\n[Check 6/7] Checking Live PostgreSQL Integration Tests..."
if ./backend/.venv/bin/pytest -q backend/tests/test_live_postgresql.py; then
    echo "  -> PASS: PostgreSQL integration tests completed or safely skipped."
else
    echo "  -> FAIL: PostgreSQL integration tests failed."
    failed_checks=$((failed_checks + 1))
fi

# 7. Docker Availability Check
echo -e "\n[Check 7/7] Checking Docker Engine & Vulnerability Scanner Availability..."
if docker info > /dev/null 2>&1; then
    echo "  -> Docker daemon is online. You may execute:"
    echo "     docker build -t codesentinel-backend ./backend"
    echo "     trivy image codesentinel-backend"
else
    echo "  -> NOT VERIFIED: Docker daemon is inactive on host."
    echo "     Required manual steps to verify container:"
    echo "     1. Start Docker Desktop"
    echo "     2. docker build -t codesentinel-backend ./backend"
    echo "     3. trivy image codesentinel-backend"
fi

echo -e "\n================================================================"
echo " Release Validation Summary"
echo "================================================================"
if [ "$failed_checks" -eq 0 ]; then
    echo "RESULT: ALL EXECUTABLE RELEASE GATES PASSED (0 failures)."
    exit 0
else
    echo "RESULT: $failed_checks RELEASE CHECKS FAILED."
    exit 1
fi
