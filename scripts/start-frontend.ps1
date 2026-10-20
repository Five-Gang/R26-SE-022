$root = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath "$root\Frontend"
npm.cmd run dev
