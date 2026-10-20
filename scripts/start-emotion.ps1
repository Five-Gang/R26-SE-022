$root = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath "$root\Backend"
python main.py
