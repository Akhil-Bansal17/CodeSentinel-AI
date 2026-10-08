#!/usr/bin/env bash
set -e

echo "=== Initializing CodeSentinel AI Development Environment ==="

# 1. Backend setup
echo "Configuring Backend..."
cd backend
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
fi
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
if [ ! -f ".env" ]; then
    cp .env.example .env
fi
cd ..

# 2. Frontend setup
echo "Configuring Frontend..."
cd frontend
npm install
if [ ! -f ".env" ]; then
    cp .env.example .env
fi
cd ..

echo "=== Setup complete! ==="
echo "To run backend: cd backend && source .venv/bin/activate && uvicorn backend.app.main:app --reload --port 8000"
echo "To run frontend: cd frontend && npm run dev"
