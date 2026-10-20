# =============================================================================
# AuraLearn - Start All Services (Background / Headless - No Extra Windows)
# =============================================================================

$root = $PSScriptRoot
$scriptsDir = Join-Path $root "scripts"

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  Starting AuraLearn Research Services (In Background) " -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

# 1. AI Tutor Backend (Port 8002) - Your Component
Write-Host "[1/5] Starting AI Tutor Backend on port 8002..." -ForegroundColor Green
Start-Process powershell -WindowStyle Hidden -ArgumentList "-ExecutionPolicy", "Bypass", "-File", "$scriptsDir\start-tutor.ps1"

# 2. Adaptive Reminder System Backend (Port 8001)
Write-Host "[2/5] Starting Adaptive Reminder Backend on port 8001..." -ForegroundColor Green
Start-Process powershell -WindowStyle Hidden -ArgumentList "-ExecutionPolicy", "Bypass", "-File", "$scriptsDir\start-reminder.ps1"

# 3. Summarizer Backend (Port 8000)
Write-Host "[3/5] Starting Summarizer Backend on port 8000..." -ForegroundColor Green
Start-Process powershell -WindowStyle Hidden -ArgumentList "-ExecutionPolicy", "Bypass", "-File", "$scriptsDir\start-summarizer.ps1"

# 4. Emotion Detection Backend (Port 8004)
Write-Host "[4/5] Starting Emotion Backend on port 8004..." -ForegroundColor Green
Start-Process powershell -WindowStyle Hidden -ArgumentList "-ExecutionPolicy", "Bypass", "-File", "$scriptsDir\start-emotion.ps1"

# 5. Frontend (Port 3000)
Write-Host "[5/5] Starting Next.js Frontend on port 3000..." -ForegroundColor Green
Start-Process powershell -WindowStyle Hidden -ArgumentList "-ExecutionPolicy", "Bypass", "-File", "$scriptsDir\start-frontend.ps1"

Write-Host "Waiting for services to initialize..." -ForegroundColor Gray
Start-Sleep -Seconds 6

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host " All services started in background (no extra windows)!" -ForegroundColor Green
Write-Host " - Frontend:          http://localhost:3000           " -ForegroundColor White
Write-Host " - AI Tutor Backend:  http://127.0.0.1:8002           " -ForegroundColor White
Write-Host " - Reminder Backend:  http://127.0.0.1:8001           " -ForegroundColor White
Write-Host " - Summarizer Backend:http://127.0.0.1:8000           " -ForegroundColor White
Write-Host " - Emotion Backend:   http://127.0.0.1:8004           " -ForegroundColor White
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "Opening http://localhost:3000 in your browser..." -ForegroundColor Yellow

Start-Process "http://localhost:3000"
