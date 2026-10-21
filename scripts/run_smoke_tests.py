"""Automated Smoke Test Runner for CodeSentinel AI.

Launches a test backend instance with an isolated test SQLite database (if backend is not already running),
runs the strict smoke test journeys, and ensures clean teardown.
"""

import os
import sys
import time
import subprocess
import urllib.request
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))
TEST_DB_PATH = ROOT_DIR / "smoke_test.db"
TEST_DB_URL = f"sqlite:///{TEST_DB_PATH.as_posix()}"

os.environ["DATABASE_URL"] = TEST_DB_URL
os.environ["ENVIRONMENT"] = "test"
os.environ["DEBUG"] = "false"

def is_backend_alive(url: str = "http://127.0.0.1:8000/api/health") -> bool:
    try:
        with urllib.request.urlopen(url, timeout=2) as resp:
            return resp.status == 200
    except Exception:
        return False

def main() -> int:
    backend_proc = None
    started_ourself = False

    try:
        if not is_backend_alive():
            print("[Runner] Starting local test backend on http://127.0.0.1:8000 with isolated test database...")
            env = os.environ.copy()
            env["DATABASE_URL"] = TEST_DB_URL
            env["PYTHONPATH"] = str(ROOT_DIR)

            cmd = [
                sys.executable,
                "-m",
                "uvicorn",
                "backend.app.main:app",
                "--host",
                "127.0.0.1",
                "--port",
                "8000",
                "--log-level",
                "warning",
            ]
            backend_proc = subprocess.Popen(cmd, cwd=str(ROOT_DIR), env=env)
            started_ourself = True

            # Wait up to 15 seconds for backend to become ready
            ready = False
            for _ in range(30):
                time.sleep(0.5)
                if is_backend_alive():
                    ready = True
                    break
                if backend_proc.poll() is not None:
                    print(f"[Runner Error] Backend process terminated prematurely with exit code {backend_proc.returncode}")
                    return 1

            if not ready:
                print("[Runner Error] Timed out waiting for test backend to become healthy.")
                return 1
            print("[Runner] Test backend is healthy.")
        else:
            print("[Runner] Connected to already running backend at http://127.0.0.1:8000.")

        # Run smoke test journeys
        from scripts.smoke_test_journeys import run_smoke_journeys
        exit_code = run_smoke_journeys()
        return exit_code

    finally:
        if started_ourself and backend_proc:
            print("[Runner] Stopping local test backend...")
            backend_proc.terminate()
            try:
                backend_proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                backend_proc.kill()
            print("[Runner] Test backend stopped.")

        if TEST_DB_PATH.exists():
            try:
                TEST_DB_PATH.unlink()
            except Exception:
                pass


if __name__ == "__main__":
    sys.exit(main())
