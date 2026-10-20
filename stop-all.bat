@echo off
setlocal
set "ROOT=%~dp0"
echo Stopping all AuraLearn services...
powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%stop-all.ps1"
endlocal
