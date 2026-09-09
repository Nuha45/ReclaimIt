@echo off
title ReclaimIt - Start All
cd /d "%~dp0"

echo ========================================
echo   ReclaimIt - Lost ^& Found Platform
echo ========================================
echo.
echo Starting backend and frontend...
echo.

start "ReclaimIt Backend" cmd /k "%~dp0start-backend.bat"
timeout /t 3 /nobreak >nul
start "ReclaimIt Frontend" cmd /k "%~dp0start-frontend.bat"

echo.
echo Backend:  http://localhost:5000/api/health
echo Frontend: http://localhost:5173
echo.
echo Two new windows have opened. Close them to stop the servers.
pause
