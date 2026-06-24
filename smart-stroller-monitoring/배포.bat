@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo 프로젝트 폴더: %CD%
echo.

if not exist "package.json" (
    echo [오류] 이 폴더에 package.json 이 없습니다.
    echo 탐색기에서 smart-stroller-monitoring 폴더를 연 뒤
    echo 이 배포.bat 파일을 다시 실행하세요.
    pause
    exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy-prod.ps1"
set ERR=%ERRORLEVEL%
echo.
if %ERR% neq 0 (
    echo 배포 실패 (코드 %ERR%^)
) else (
    echo 배포 성공
)
pause
exit /b %ERR%
