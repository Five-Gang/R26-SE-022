# =============================================================================
# AuraLearn - Start All Services (Minimized on Taskbar - No Popups)
# =============================================================================

$root = $PSScriptRoot

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  Starting AuraLearn Research Services (Minimized)    " -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

# Pre-clean stale dev cache from .next to prevent EPERM errors (common on Windows/OneDrive)
$nextDev = Join-Path $root "Frontend\.next\dev"
if (Test-Path -LiteralPath $nextDev) {
    Remove-Item -LiteralPath $nextDev -Recurse -Force -ErrorAction SilentlyContinue
}

# 1. AI Tutor Backend (Port 8002) - Your Component
Write-Host "[1/5] Starting AI Tutor Backend on port 8002..." -ForegroundColor Green
Start-Process -FilePath "cmd.exe" -ArgumentList "/k python main.py" -WorkingDirectory "$root\llm-tutor-backend" -WindowStyle Minimized

# 2. Adaptive Reminder System Backend (Port 8001)
Write-Host "[2/5] Starting Adaptive Reminder Backend on port 8001..." -ForegroundColor Green
Start-Process -FilePath "cmd.exe" -ArgumentList "/k python -m uvicorn app.main:app --host 127.0.0.1 --port 8001" -WorkingDirectory "$root\adaptive-reminder-system\backend" -WindowStyle Minimized

# 3. Summarizer Backend (Port 8000)
Write-Host "[3/5] Starting Summarizer Backend on port 8000..." -ForegroundColor Green
Start-Process -FilePath "cmd.exe" -ArgumentList "/k python -m uvicorn app.main:app --host 127.0.0.1 --port 8000" -WorkingDirectory "$root\summarizer-backend" -WindowStyle Minimized

# 4. Emotion Detection Backend (Port 8004)
Write-Host "[4/5] Starting Emotion Backend on port 8004..." -ForegroundColor Green
Start-Process -FilePath "cmd.exe" -ArgumentList "/k python main.py" -WorkingDirectory "$root\Backend" -WindowStyle Minimized

# 5. Frontend (Port 3000)
Write-Host "[5/5] Starting Next.js Frontend on port 3000..." -ForegroundColor Green
Start-Process -FilePath "cmd.exe" -ArgumentList "/k npm run dev" -WorkingDirectory "$root\Frontend" -WindowStyle Minimized

Write-Host "Waiting for services to finish booting up..." -ForegroundColor Gray

# Dynamically poll until Next.js (port 3000) and AI Tutor (port 8002) are actively listening
$frontendReady = $false
for ($i = 0; $i -lt 45; $i++) {
    Start-Sleep -Seconds 1
    $conn3000 = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
    $conn8002 = Get-NetTCPConnection -LocalPort 8002 -State Listen -ErrorAction SilentlyContinue
    if ($conn3000 -and $conn8002) {
        $frontendReady = $true
        break
    }
}

if ($frontendReady) {
    # Warm up frontend route so user does not see a loading stall or connection refused
    try {
        Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 15 -ErrorAction SilentlyContinue | Out-Null
    } catch {}

    Write-Host ""
    Write-Host "======================================================" -ForegroundColor Cyan
    Write-Host " All services are ready and online!" -ForegroundColor Green
    Write-Host " - Frontend:          http://localhost:3000           " -ForegroundColor White
    Write-Host " - AI Tutor Backend:  http://127.0.0.1:8002           " -ForegroundColor White
    Write-Host " - Reminder Backend:  http://127.0.0.1:8001           " -ForegroundColor White
    Write-Host " - Summarizer Backend:http://127.0.0.1:8000           " -ForegroundColor White
    Write-Host " - Emotion Backend:   http://127.0.0.1:8004           " -ForegroundColor White
    Write-Host "======================================================" -ForegroundColor Cyan
    Write-Host "Opening http://localhost:3000 in your browser..." -ForegroundColor Yellow
    Start-Process "http://localhost:3000"
} else {
    Write-Host ""
    Write-Host "======================================================" -ForegroundColor Red
    Write-Host " Warning: Services took longer than expected to bind. " -ForegroundColor Yellow
    Write-Host " Please check the minimized terminal windows for details." -ForegroundColor Yellow
    Write-Host "======================================================" -ForegroundColor Red
}
