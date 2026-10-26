# ==============================================================================
# SmartQMS — Automated Test & Build Suite Runner
# ==============================================================================

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Running SmartQMS Full Test & Build Suite" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$root = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $root "backend"
$frontendDir = Join-Path $root "frontend"
$pytestExe = Join-Path $root "venv\Scripts\pytest.exe"

# 1. Run Backend Pytest Suite
Write-Host "`n[1/2] Running 44 Backend Automated Tests..." -ForegroundColor Yellow
Set-Location $backendDir
& $pytestExe -v --disable-warnings tests/
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n[FAIL] Backend tests failed!" -ForegroundColor Red
    exit $LASTEXITCODE
}
Write-Host "[PASS] All 44 Backend Tests Passed!" -ForegroundColor Green

# 2. Run Frontend Build
Write-Host "`n[2/2] Running Frontend TypeScript Check & Build..." -ForegroundColor Yellow
Set-Location $frontendDir
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n[FAIL] Frontend build failed!" -ForegroundColor Red
    exit $LASTEXITCODE
}
Write-Host "[PASS] Frontend Production Build Succeeded!" -ForegroundColor Green

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "  All SmartQMS Quality Checks Passed Successfully!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Set-Location $root
