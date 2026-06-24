@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Smart Stroller Deploy
echo.
echo [배포] PowerShell로 실행합니다...
echo 폴더: %CD%
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy-prod.ps1"
echo.
pause
