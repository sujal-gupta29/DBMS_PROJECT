@echo off
setlocal enabledelayedexpansion
title EstateHub — Launcher

SET "SCRIPT_DIR=%~dp0"
SET "BACKEND_DIR=%SCRIPT_DIR%backend"
SET "FRONTEND_DIR=%SCRIPT_DIR%frontend"
SET "LOG_DIR=%SCRIPT_DIR%logs"

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"
if not exist "%BACKEND_DIR%\logs" mkdir "%BACKEND_DIR%\logs"

echo.
echo ============================================================
echo         EstateHub - Starting Application
echo ============================================================

REM ── Pre-flight checks ─────────────────────────────────────────────────────────
IF NOT EXIST "%BACKEND_DIR%\venv\Scripts\activate.bat" (
    echo [ERROR] Virtual environment not found.
    echo         Please run setup.bat first.
    pause & exit /b 1
)
IF NOT EXIST "%BACKEND_DIR%\.env" (
    echo [ERROR] .env file not found in backend folder.
    echo         Please run setup.bat first.
    pause & exit /b 1
)
IF NOT EXIST "%FRONTEND_DIR%\node_modules" (
    echo [ERROR] node_modules not found.
    echo         Please run setup.bat first.
    pause & exit /b 1
)

echo.
echo   Starting backend  ^(FastAPI^)  on  http://localhost:8000
echo   Starting frontend ^(React^)    on  http://localhost:3000
echo.
echo   Logs:
echo     Backend:  %BACKEND_DIR%\logs\backend.log
echo     Access:   %BACKEND_DIR%\logs\access.log
echo     Frontend: %LOG_DIR%\frontend.log
echo.
echo   API Docs: http://localhost:8000/docs
echo.
echo   Two windows will open. Close them to stop the servers.
echo   Wait ~20 seconds for React to compile on first start.
echo.

REM ── Start backend ─────────────────────────────────────────────────────────────
start "EstateHub — Backend API :8000" cmd /k "cd /d "%BACKEND_DIR%" && call venv\Scripts\activate.bat && echo Backend starting... && uvicorn main:app --host 0.0.0.0 --port 8000 --reload 2>&1"

REM Wait for backend to initialize
timeout /t 4 /nobreak >nul

REM ── Start frontend ────────────────────────────────────────────────────────────
start "EstateHub — Frontend UI :3000" cmd /k "cd /d "%FRONTEND_DIR%" && set BROWSER=none && echo Frontend compiling... && npm start 2>&1"

echo [OK] Both servers are starting in separate windows.
echo.
echo Open your browser at: http://localhost:3000
echo.
pause
