@echo off
setlocal

rem Launch a single minimized PowerShell window that runs both servers
set "ROOT=%~dp0"
start "Cosmetic License" /min powershell -NoLogo -NoExit -Command "& { cd '%ROOT%'; $npm = 'npm.cmd'; if (-not (Get-Command $npm -ErrorAction SilentlyContinue)) { Write-Error 'npm.cmd not found. Ensure Node.js is installed and PATH is set.'; exit 1 }; Write-Host 'Starting Cosmetic License System...'; Write-Host 'Backend -> http://localhost:5000'; Write-Host 'Frontend -> http://localhost:3000'; Write-Host ''; $backend = Start-Process $npm -ArgumentList 'run','dev' -WorkingDirectory (Join-Path $PWD 'backend') -NoNewWindow -PassThru; Start-Sleep -Seconds 3; $frontend = Start-Process $npm -ArgumentList 'start' -WorkingDirectory (Join-Path $PWD 'frontend') -NoNewWindow -PassThru; Write-Host 'Both servers running. Close this window to stop them.'; $ids = @(); if ($backend) { $ids += $backend.Id }; if ($frontend) { $ids += $frontend.Id }; if ($ids.Count -gt 0) { Wait-Process -Id $ids } }

endlocal
