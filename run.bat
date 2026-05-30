@echo off
REM =============================================================================
REM VoteSecure - Windows Local Runner
REM Usage: run.bat [--fresh-db] [--skip-frontend] [--skip-backend] [--help]
REM =============================================================================
setlocal enabledelayedexpansion

set DB_NAME=voting_system
set DB_USER=voting_admin
set DB_PASS=V0t1ngS3cur3!
set DB_HOST=localhost
set DB_PORT=3306
set BACKEND_PORT=5000
set FRONTEND_PORT=5173

set FRESH_DB=false
set SKIP_FRONTEND=false
set SKIP_BACKEND=false
set SETUP_ONLY=false

:parse_args
if "%~1"=="" goto :main
if "%~1"=="--fresh-db"     set FRESH_DB=true
if "%~1"=="--skip-frontend" set SKIP_FRONTEND=true
if "%~1"=="--skip-backend"  set SKIP_BACKEND=true
if "%~1"=="--setup-only"    set SETUP_ONLY=true
if "%~1"=="--help"          goto :help
shift
goto :parse_args

:help
echo Usage: run.bat [OPTIONS]
echo.
echo Options:
echo   --fresh-db       Drop and recreate the database
echo   --skip-frontend  Don't start React frontend
echo   --skip-backend   Don't start Flask backend
echo   --setup-only     Only setup, don't run
echo   --help           Show this message
echo.
echo Example: run.bat --fresh-db
exit /b 0

:main
echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║  VoteSecure - Electronic Voting System                   ║
echo ║  React + Flask + MySQL + AES-256                         ║
echo ╚══════════════════════════════════════════════════════════╝
echo.

REM ── Step 1: Check prerequisites ──────────────────────────────────────────
echo [1/6] Checking prerequisites...
where python >nul 2>&1 || (echo   ✗ python3 missing && exit /b 1)
where node   >nul 2>&1 || (echo   ✗ node missing    && exit /b 1)
where npm    >nul 2>&1 || (echo   ✗ npm missing     && exit /b 1)
where mysql  >nul 2>&1 || (echo   ✗ mysql missing   && exit /b 1)
echo   ✓ All tools found

REM ── Step 2: Database ─────────────────────────────────────────────────────
echo [2/6] Setting up MySQL database...

if "%FRESH_DB%"=="true" (
    echo   --fresh-db: dropping existing database...
    mysql -u root -h %DB_HOST% -e "DROP DATABASE IF EXISTS %DB_NAME%;" 2>nul
)

REM Check if DB exists
mysql -u root -h %DB_HOST% --skip-column-names -e "SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME='%DB_NAME%'" 2>nul | findstr "%DB_NAME%" >nul
if errorlevel 1 (
    echo   Running schema.sql...
    mysql -u root -h %DB_HOST% < schema.sql 2>nul
    if errorlevel 1 (
        echo   ✗ Failed. Try: mysql -u root -p ^< schema.sql
        exit /b 1
    )
    echo   ✓ Database created
) else (
    echo   ✓ Database already exists (use --fresh-db to recreate)
)

REM ── Step 3: Python backend ───────────────────────────────────────────────
echo [3/6] Setting up Python backend...
cd backend

if not exist "venv\" (
    python -m venv venv
    echo   Created virtual environment
)

call venv\Scripts\activate.bat
echo   Installing Python packages...
pip install -q -r requirements.txt
echo   ✓ Backend ready
cd ..

REM ── Step 4: Frontend ─────────────────────────────────────────────────────
echo [4/6] Setting up React frontend...
if not exist "node_modules\" (
    call npm install --silent
) else (
    echo   node_modules already exists, skipping
)
echo   ✓ Frontend ready

REM ── Step 5: Quick verify ─────────────────────────────────────────────────
echo [5/6] Verifying...
cd backend
call venv\Scripts\activate.bat
python -c "from app import create_app; from models import *; print('  ✓ Python imports OK')" 2>nul || echo   ⚠ Import check had issues
cd ..
echo   ✓ Verification done

if "%SETUP_ONLY%"=="true" (
    echo.
    echo ✅ Setup complete! Run 'run.bat' to start the application.
    exit /b 0
)

REM ── Step 6: Start services ───────────────────────────────────────────────
echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║               Starting Services                          ║
echo ╚══════════════════════════════════════════════════════════╝
echo.

REM Set environment for backend
set FLASK_ENV=development
set DB_NAME=%DB_NAME%
set DB_USER=%DB_USER%
set DB_HOST=%DB_HOST%
set DB_PORT=%DB_PORT%

if "%SKIP_BACKEND%"=="false" (
    echo Starting Flask backend on http://localhost:%BACKEND_PORT%
    start "VoteSecure Backend" cmd /c "cd backend && venv\Scripts\activate.bat && python app.py"
    echo   Backend started in new window
)

if "%SKIP_FRONTEND%"=="false" (
    echo Starting React frontend on http://localhost:%FRONTEND_PORT%
    start "VoteSecure Frontend" cmd /c "npm run dev -- --host"
    echo   Frontend started in new window
)

echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║  ✅ VoteSecure is running!                              ║
echo ╠══════════════════════════════════════════════════════════╣
echo ║                                                        ║
echo ║  Frontend : http://localhost:%FRONTEND_PORT%                       ║
echo ║  Backend  : http://localhost:%BACKEND_PORT%                        ║
echo ║                                                        ║
echo ║  Admin: admin@votingsystem.com / Admin@123!            ║
echo ║  Voter: voter1@test.com / Voter@123!                   ║
echo ║  (100 voters: voter1..voter100@test.com)               ║
echo ║                                                        ║
echo ║  Close the backend/frontend windows to stop.           ║
echo ╚══════════════════════════════════════════════════════════╝
echo.

pause
endlocal
