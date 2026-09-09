@echo off
title ReclaimIt Frontend
cd /d "%~dp0client"

if not exist "node_modules\" (
  echo Installing frontend dependencies...
  call npm.cmd install
  if errorlevel 1 exit /b 1
)

echo Starting ReclaimIt frontend on http://localhost:5173
node node_modules\vite\bin\vite.js
pause
