# SKUEvolve Dev Launcher
# Activates venv, builds dashboard data, then starts Flask + React in separate windows

$root = $PSScriptRoot

Write-Host "Activating virtual environment..." -ForegroundColor Cyan
& "$root\.venv\Scripts\Activate.ps1"

Write-Host "Building dashboard data..." -ForegroundColor Cyan
python "$root\backend\scripts\build_dashboard.py"

if ($LASTEXITCODE -ne 0) {
    Write-Host "build_dashboard.py failed. Aborting." -ForegroundColor Red
    exit 1
}

Write-Host "Starting Flask backend (port 5000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", `
    "& '$root\.venv\Scripts\Activate.ps1'; cd '$root\backend'; python wsgi.py"

Write-Host "Starting React frontend (port 3000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", `
    "cd '$root\frontend'; npm start"

Write-Host ""
Write-Host "All services launched." -ForegroundColor Yellow
Write-Host "  Frontend : http://localhost:3000" -ForegroundColor White
Write-Host "  Backend  : http://localhost:5000" -ForegroundColor White
Write-Host "  Health   : http://localhost:5000/api/health" -ForegroundColor White
