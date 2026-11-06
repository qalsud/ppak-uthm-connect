@echo off
setlocal EnableExtensions
title PPAK UTHM Connect - Server Launcher
cd /d "%~dp0"

echo ============================================================
echo   PPAK UTHM Connect - local development server
echo ============================================================
echo.
echo   App      http://127.0.0.1:8001
echo   Vite     http://localhost:5173
echo   Reverb   ws://localhost:8082
echo.
echo Each service opens in its own window. Close those windows to stop.
echo.

where php >nul 2>nul
if errorlevel 1 (
    echo [ERROR] PHP was not found on PATH. Start Laragon first, then try again.
    pause
    exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node/npm was not found on PATH.
    pause
    exit /b 1
)

if not exist "vendor\autoload.php" (
    echo [ERROR] PHP dependencies are missing. Run: composer install
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo [ERROR] JavaScript dependencies are missing. Run: npm install
    pause
    exit /b 1
)

netstat -ano | findstr ":8001" | findstr "LISTENING" >nul
if not errorlevel 1 (
    echo [INFO] Port 8001 is already in use.
    echo        Opening http://127.0.0.1:8001 - close the old server first if it is not this app.
    start "" "http://127.0.0.1:8001"
    exit /b 0
)

echo Starting the app, Vite, queue worker, scheduler and Reverb...
start "PPAK - App Server (8001)" cmd /k "php artisan serve --host=127.0.0.1 --port=8001"
start "PPAK - Vite (5173)" cmd /k "npm run dev"
start "PPAK - Queue Worker" cmd /k "php artisan queue:work --tries=1 --timeout=0"
start "PPAK - Scheduler" cmd /k "php artisan schedule:work"

netstat -ano | findstr ":8082" | findstr "LISTENING" >nul
if errorlevel 1 (
    start "PPAK - Reverb (8082)" cmd /k "php artisan reverb:start --host=127.0.0.1 --port=8082 --debug"
) else (
    echo [WARN] Port 8082 is busy - skipping Reverb. Chat will fall back to polling.
)

echo.
echo Waiting for the app to boot...
ping -n 5 127.0.0.1 >nul
start "" "http://127.0.0.1:8001"

echo.
echo Done. You can close this launcher window.
ping -n 3 127.0.0.1 >nul
exit /b 0
