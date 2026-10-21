# =============================================================================
# AuraLearn - Stop All Services
# =============================================================================

$root = $PSScriptRoot

Write-Host "Stopping all AuraLearn services..." -ForegroundColor Yellow

$ports = @(3000, 8000, 8001, 8002, 8004)

foreach ($port in $ports) {
    $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($conns) {
        $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($p in $pids) {
            if ($p -gt 0) {
                Write-Host "Stopping process $p on port $port..." -ForegroundColor Red
                Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
            }
        }
    } else {
        Write-Host "Port ${port}: Clear" -ForegroundColor Gray
    }
}

# Also ensure any lingering Next.js node processes or backend python processes are stopped
$lingering = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
    ($_.Name -eq 'node.exe' -and ($_.CommandLine -like '*Frontend*' -or $_.CommandLine -like '*next*')) -or
    ($_.Name -eq 'python.exe' -and ($_.CommandLine -like '*llm-tutor-backend*' -or $_.CommandLine -like '*adaptive-reminder*' -or $_.CommandLine -like '*summarizer-backend*' -or $_.CommandLine -like '*Backend\main.py*'))
}

if ($lingering) {
    foreach ($proc in $lingering) {
        Write-Host "Stopping background process $($proc.ProcessId) ($($proc.Name))..." -ForegroundColor Yellow
        Stop-Process -Id $proc.ProcessId -Force -ErrorAction SilentlyContinue
    }
}

# Clean any locked dev cache from .next to prevent EPERM errors on restart
$nextDev = Join-Path $root "Frontend\.next\dev"
if (Test-Path -LiteralPath $nextDev) {
    Remove-Item -LiteralPath $nextDev -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "All AuraLearn services stopped successfully." -ForegroundColor Green
