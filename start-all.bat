@echo off
setlocal
set "ROOT=%~dp0"

echo ======================================================
echo   Starting AuraLearn Research Services (Minimized)
echo ======================================================

:: Clean stale .next dev cache to prevent Windows/OneDrive EPERM lock errors
if exist "%ROOT%Frontend\.next\dev" rmdir /s /q "%ROOT%Frontend\.next\dev" >nul 2>&1

echo [1/5] Starting AI Tutor Backend on port 8002...
start "AI Tutor" /d "%ROOT%llm-tutor-backend" /min python main.py

echo [2/5] Starting Adaptive Reminder Backend on port 8001...
start "Reminder Backend" /d "%ROOT%adaptive-reminder-system\backend" /min python -m uvicorn app.main:app --host 127.0.0.1 --port 8001

echo [3/5] Starting Summarizer Backend on port 8000...
start "Summarizer Backend" /d "%ROOT%summarizer-backend" /min python -m uvicorn app.main:app --host 127.0.0.1 --port 8000

echo [4/5] Starting Emotion Backend on port 8004...
start "Emotion Backend" /d "%ROOT%Backend" /min python main.py

echo [5/5] Starting Next.js Frontend on port 3000...
start "Frontend" /d "%ROOT%Frontend" /min cmd /k npm run dev

echo Waiting for services to finish booting up...
powershell -NoProfile -Command "$ready = $false; for ($i = 0; $i -lt 45; $i++) { Start-Sleep -Seconds 1; $c3 = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue; $c8 = Get-NetTCPConnection -LocalPort 8002 -State Listen -ErrorAction SilentlyContinue; if ($c3 -and $c8) { $ready = $true; break } }; if ($ready) { try { Invoke-WebRequest -Uri 'http://localhost:3000' -UseBasicParsing -TimeoutSec 10 -ErrorAction SilentlyContinue | Out-Null } catch {}; exit 0 } else { exit 1 }"

if %ERRORLEVEL% EQU 0 (
    echo ======================================================
    echo  All services are ready and online!
    echo  - Frontend:          http://localhost:3000
    echo  - AI Tutor Backend:  http://127.0.0.1:8002
    echo  - Reminder Backend:  http://127.0.0.1:8001
    echo  - Summarizer Backend:http://127.0.0.1:8000
    echo  - Emotion Backend:   http://127.0.0.1:8004
    echo ======================================================
    echo Opening http://localhost:3000 in your browser...
    start http://localhost:3000
) else (
    echo ======================================================
    echo  Warning: Frontend or AI Tutor took longer to boot.
    echo  Please check the minimized windows for details.
    echo ======================================================
)
endlocal
