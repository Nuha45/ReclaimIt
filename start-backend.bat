@echo off
title ReclaimIt Backend
cd /d "%~dp0"

if not exist "node_modules\" (
  echo Installing backend dependencies...
  call npm.cmd install
  if errorlevel 1 exit /b 1
)

if not exist "uploads\" mkdir uploads

echo Starting ReclaimIt backend on http://localhost:5000
node server.js
pause
