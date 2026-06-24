@echo off
setlocal
cd /d "%~dp0"

echo [1/2] Next.js build...
call "%ProgramFiles%\nodejs\npm.cmd" run build
if errorlevel 1 (
  echo BUILD FAILED
  exit /b 1
)

echo.
echo [2/2] Vercel production deploy...
call "%ProgramFiles%\nodejs\npx.cmd" vercel --prod --yes
if errorlevel 1 (
  echo DEPLOY FAILED - Vercel login: npx vercel login
  exit /b 1
)

echo.
echo Done. Open https://smart-stroller-monitoring.vercel.app
exit /b 0
