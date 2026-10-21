$root = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath "$root\adaptive-reminder-system\backend"
python -m uvicorn app.main:app --host 127.0.0.1 --port 8001
