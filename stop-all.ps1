# =============================================================================
# AuraLearn - Stop All Services
# =============================================================================

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

Write-Host "All AuraLearn services stopped successfully." -ForegroundColor Green
