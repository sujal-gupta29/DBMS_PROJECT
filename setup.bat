@echo off
setlocal enabledelayedexpansion
title EstateHub — Setup

echo.
echo ============================================================
echo       EstateHub - Real Estate DBMS  ^|  Windows Setup
echo ============================================================
echo.

SET "SCRIPT_DIR=%~dp0"
SET "BACKEND_DIR=%SCRIPT_DIR%backend"
SET "FRONTEND_DIR=%SCRIPT_DIR%frontend"
SET "SCRIPTS_DIR=%SCRIPT_DIR%scripts"
SET "LOG_DIR=%SCRIPT_DIR%logs"

REM ── Create top-level logs folder ─────────────────────────────────────────────
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"
SET "SETUP_LOG=%LOG_DIR%\setup.log"
echo Setup started: %DATE% %TIME% > "%SETUP_LOG%"

echo [1/7] Checking prerequisites...
echo [1/7] Checking prerequisites >> "%SETUP_LOG%"

python --version >nul 2>&1
IF ERRORLEVEL 1 (
    echo [ERROR] Python not found. Install Python 3.9+ from https://python.org
    echo [ERROR] Python not found >> "%SETUP_LOG%"
    pause & exit /b 1
)
FOR /F "tokens=*" %%v IN ('python --version 2^>^&1') DO (
    echo   Found: %%v
    echo   Found: %%v >> "%SETUP_LOG%"
)

node --version >nul 2>&1
IF ERRORLEVEL 1 (
    echo [ERROR] Node.js not found. Install from https://nodejs.org
    echo [ERROR] Node.js not found >> "%SETUP_LOG%"
    pause & exit /b 1
)
FOR /F "tokens=*" %%v IN ('node --version 2^>^&1') DO (
    echo   Found: Node %%v
    echo   Found: Node %%v >> "%SETUP_LOG%"
)

mysql --version >nul 2>&1
IF ERRORLEVEL 1 (
    echo [ERROR] MySQL not found. Install MySQL 8 and add it to PATH.
    echo [ERROR] MySQL not found >> "%SETUP_LOG%"
    pause & exit /b 1
)
echo   Found: MySQL OK
echo   Found: MySQL OK >> "%SETUP_LOG%"
echo [OK] All prerequisites found.
echo.

REM ── MySQL credentials ─────────────────────────────────────────────────────────
echo [2/7] MySQL Database Configuration
echo [2/7] MySQL Configuration >> "%SETUP_LOG%"

SET /P "DB_HOST=   Host [localhost]: "
IF "!DB_HOST!"=="" SET "DB_HOST=localhost"

SET /P "DB_PORT=   Port [3306]: "
IF "!DB_PORT!"=="" SET "DB_PORT=3306"

SET /P "DB_USER=   User [root]: "
IF "!DB_USER!"=="" SET "DB_USER=root"

SET /P "DB_PASS=   Password: "

SET /P "DB_NAME=   Database name [real_estate]: "
IF "!DB_NAME!"=="" SET "DB_NAME=real_estate"

echo   Testing connection...
mysql -h!DB_HOST! -P!DB_PORT! -u!DB_USER! "-p!DB_PASS!" -e "SELECT 1;" >nul 2>&1
IF ERRORLEVEL 1 (
    echo [ERROR] Cannot connect to MySQL. Check your credentials.
    echo [ERROR] MySQL connection failed >> "%SETUP_LOG%"
    pause & exit /b 1
)
echo [OK] MySQL connection successful.
echo MySQL connection OK >> "%SETUP_LOG%"
echo.

REM ── Generate secret key ───────────────────────────────────────────────────────
FOR /F "tokens=*" %%k IN ('python -c "import secrets; print(secrets.token_hex(32))"') DO SET "SECRET_KEY=%%k"

REM ── Write .env ────────────────────────────────────────────────────────────────
echo [3/7] Writing backend configuration...
echo [3/7] Writing .env >> "%SETUP_LOG%"

(
  echo DB_HOST=!DB_HOST!
  echo DB_PORT=!DB_PORT!
  echo DB_USER=!DB_USER!
  echo DB_PASSWORD=!DB_PASS!
  echo DB_NAME=!DB_NAME!
  echo SECRET_KEY=!SECRET_KEY!
  echo ALGORITHM=HS256
  echo ACCESS_TOKEN_EXPIRE_MINUTES=1440
) > "%BACKEND_DIR%\.env"

echo [OK] .env written.
echo .env written OK >> "%SETUP_LOG%"
echo.

REM ── Load SQL ──────────────────────────────────────────────────────────────────
echo [4/7] Loading database schema and seed data...
echo [4/7] Loading SQL >> "%SETUP_LOG%"

mysql -h!DB_HOST! -P!DB_PORT! -u!DB_USER! "-p!DB_PASS!" < "%SCRIPTS_DIR%\setup_db.sql" >> "%SETUP_LOG%" 2>&1
IF ERRORLEVEL 1 (
    echo [ERROR] Failed to load SQL. Check %LOG_DIR%\setup.log for details.
    echo [ERROR] SQL load failed >> "%SETUP_LOG%"
    pause & exit /b 1
)
echo [OK] Database created and seeded.
echo SQL loaded OK >> "%SETUP_LOG%"
echo.

REM ── Python venv ───────────────────────────────────────────────────────────────
echo [5/7] Creating Python virtual environment...
echo [5/7] Python venv >> "%SETUP_LOG%"

cd /d "%BACKEND_DIR%"
python -m venv venv >> "%SETUP_LOG%" 2>&1
IF ERRORLEVEL 1 (
    echo [ERROR] Failed to create venv.
    pause & exit /b 1
)
call venv\Scripts\activate.bat

echo   Installing Python packages (this takes ~30 seconds)...
python -m pip install --upgrade pip >> "%SETUP_LOG%" 2>&1
pip install -r requirements.txt >> "%SETUP_LOG%" 2>&1
IF ERRORLEVEL 1 (
    echo [ERROR] pip install failed. Check %LOG_DIR%\setup.log
    pause & exit /b 1
)
call venv\Scripts\deactivate.bat
echo [OK] Python environment ready.
echo Python deps installed OK >> "%SETUP_LOG%"
echo.

REM ── Frontend ──────────────────────────────────────────────────────────────────
echo [6/7] Installing frontend packages (this takes 1-2 minutes)...
echo [6/7] Frontend npm install >> "%SETUP_LOG%"

cd /d "%FRONTEND_DIR%"
call npm install --legacy-peer-deps >> "%SETUP_LOG%" 2>&1
IF ERRORLEVEL 1 (
    echo [ERROR] npm install failed. Check %LOG_DIR%\setup.log
    pause & exit /b 1
)
REM Fix the ajv module issue that occurs with some Node versions
call npm install ajv@^8 --legacy-peer-deps >> "%SETUP_LOG%" 2>&1
echo [OK] Frontend packages installed.
echo npm install OK >> "%SETUP_LOG%"
echo.

REM ── Create backend logs dir ───────────────────────────────────────────────────
echo [7/7] Creating log directories...
if not exist "%BACKEND_DIR%\logs" mkdir "%BACKEND_DIR%\logs"
echo [OK] Log directories ready.
echo.

REM ── Done ──────────────────────────────────────────────────────────────────────
echo Setup completed: %DATE% %TIME% >> "%SETUP_LOG%"

echo ============================================================
echo    Setup Complete!  All steps passed successfully.
echo ============================================================
echo.
echo    Next step:    Double-click  start.bat
echo.
echo    Login URL:    http://localhost:3000
echo    API Docs:     http://localhost:8000/docs
echo    Setup log:    %LOG_DIR%\setup.log
echo.
echo    Demo password for ALL accounts: password123
echo    Admin:   admin@estate.com
echo    Manager: anil.mgr@estate.com
echo    Agent:   rahul.agt@estate.com
echo    Client:  vikram@mail.com
echo.
pause
