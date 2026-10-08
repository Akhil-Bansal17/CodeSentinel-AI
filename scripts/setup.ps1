Write-Host "=== Initializing CodeSentinel AI Development Environment ===" -ForegroundColor Cyan

# 1. Backend setup
Write-Host "Configuring Backend..." -ForegroundColor Yellow
if (-not (Test-Path "backend\.venv")) {
    python -m venv backend\.venv
}
& ".\backend\.venv\Scripts\python.exe" -m pip install --upgrade pip
& ".\backend\.venv\Scripts\python.exe" -m pip install -r "backend\requirements.txt"
if (-not (Test-Path "backend\.env")) {
    Copy-Item "backend\.env.example" "backend\.env"
}

# 2. Frontend setup
Write-Host "Configuring Frontend..." -ForegroundColor Yellow
Push-Location "frontend"
npm.cmd install
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
}
Pop-Location

Write-Host "=== Setup complete! ===" -ForegroundColor Green
Write-Host "To run backend: .\backend\.venv\Scripts\uvicorn.exe backend.app.main:app --reload --port 8000"
Write-Host "To run frontend: cd frontend; npm.cmd run dev"
