@echo off
REM =============================================================================
REM Voting System Deployment Script (Windows)
REM =============================================================================

echo ============================================
echo   Voting System - Windows Deployment
echo ============================================

set DB_NAME=voting_system
set DB_USER=voting_admin
set DB_PASSWORD=V0t1ngS3cur3!
set DB_HOST=localhost
set DB_PORT=3306
set BACKEND_PORT=5000

echo.
echo [1/4] Installing Python backend dependencies...
cd backend
python -m venv venv
call venv\Scripts\activate.bat
pip install -r requirements.txt
echo   Done.

echo.
echo [2/4] Installing frontend dependencies...
cd ..
call npm install
echo   Done.

echo.
echo [3/4] Building frontend...
call npm run build
echo   Done.

echo.
echo [4/4] Starting backend server...
cd backend
echo.
echo ============================================
echo   Starting Backend on port %BACKEND_PORT%
echo ============================================
echo.
echo   Admin: admin@votingsystem.com / Admin@123!
echo   Voter: voter1@test.com / Voter@123!
echo ============================================
call venv\Scripts\activate.bat
python app.py

pause
