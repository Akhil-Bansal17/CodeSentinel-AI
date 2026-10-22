#!/usr/bin/env bash
# CodeSentinel AI - Phase 12 Deployment Automation & Production Operations Release Script (POSIX)

set -eo pipefail

PY_BIN="./backend/.venv/bin/python"
if [ ! -f "$PY_BIN" ]; then
    PY_BIN="python3"
fi

exec "$PY_BIN" scripts/validate_release.py "$@"
