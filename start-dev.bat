@echo off
setlocal

set ROOT=%~dp0

echo Activating virtual environment...
call "%ROOT%.venv\Scripts\activate.bat"

echo Building dashboard data...
python "%ROOT%backend\scripts\build_dashboard.py"
if errorlevel 1 (
    echo build_dashboard.py failed. Aborting.
    pause
    exit /b 1
)

echo Starting Flask backend (port 5000)...
start "SKUEvolve Backend" cmd /k "call "%ROOT%.venv\Scripts\activate.bat" && cd /d "%ROOT%backend" && python wsgi.py"

echo Starting React frontend (port 3000)...
start "SKUEvolve Frontend" cmd /k "cd /d "%ROOT%frontend" && npm start"

echo.
echo All services launched.
echo   Frontend : http://localhost:3000
echo   Backend  : http://localhost:5000
echo   Health   : http://localhost:5000/api/health
