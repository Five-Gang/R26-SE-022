$root = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath "$root\llm-tutor-backend"
python main.py
