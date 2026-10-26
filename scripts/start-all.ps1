# ==============================================================================
# SmartQMS — Windows Full-Stack Startup Script
# ==============================================================================

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Starting SmartQMS: E-Commerce Quality Management Suite" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$root = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $root "backend"
$frontendDir = Join-Path $root "frontend"
$pythonExe = Join-Path $root "venv\Scripts\python.exe"

# 1. Verify Prerequisites
if (-not (Test-Path $pythonExe)) {
    Write-Host "[ERROR] Python virtual environment not found at $pythonExe" -ForegroundColor Red
    exit 1
}

# 2. Check Backend Database
Write-Host "[1/3] Verifying database..." -ForegroundColor Yellow
& $pythonExe -m app.database.init_db
if ($LASTEXITCODE -ne 0) {
    Write-Host "[WARNING] Database initialization check failed. Proceeding with caution." -ForegroundColor DarkYellow
}

# 3. Launch Backend Server
Write-Host "[2/3] Launching FastAPI Backend on http://127.0.0.1:8000..." -ForegroundColor Yellow
Start-Process -FilePath $pythonExe -ArgumentList "-m uvicorn app.main:app --host 127.0.0.1 --port 8000" -WorkingDirectory $backendDir

# Wait for backend readiness
Start-Sleep -Seconds 2

# 4. Launch Frontend Dev Server
Write-Host "[3/3] Launching Vite Frontend on http://127.0.0.1:5173..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run dev -- --host 127.0.0.1 --port 5173" -WorkingDirectory $frontendDir

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "  SmartQMS Services Started Successfully!" -ForegroundColor Green
Write-Host "  Web Application:   http://127.0.0.1:5173/" -ForegroundColor White
Write-Host "  API Backend:       http://127.0.0.1:8000/" -ForegroundColor White
Write-Host "  API Documentation: http://127.0.0.1:8000/docs" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Green
