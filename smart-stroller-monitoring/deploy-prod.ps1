# 스마트 유모차 웹앱 — Vercel 프로덕션 배포
# 방법1: 탐색기에서 "배포.bat" 더블클릭
# 방법2: PowerShell 에서 이 파일이 있는 폴더로 이동 후 실행

$ErrorActionPreference = "Stop"

$ProjectRoot = $PSScriptRoot
if (-not $ProjectRoot) {
    $ProjectRoot = (Get-Location).Path
}

$packageJson = Join-Path $ProjectRoot "package.json"
if (-not (Test-Path $packageJson)) {
    Write-Host ""
    Write-Host "[오류] package.json 을 찾을 수 없습니다." -ForegroundColor Red
    Write-Host "현재 스크립트 위치: $ProjectRoot" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "탐색기에서 아래 폴더를 열어야 합니다:" -ForegroundColor Cyan
    Write-Host "  바탕화면\smart-stroller-monitoring" -ForegroundColor White
    Write-Host ""
    Write-Host "PowerShell 예시 (경로가 맞을 때만):" -ForegroundColor Cyan
    Write-Host '  cd "$env:USERPROFILE\Desktop\smart-stroller-monitoring"' -ForegroundColor Gray
    Write-Host "  .\deploy-prod.ps1" -ForegroundColor Gray
    exit 1
}

Set-Location $ProjectRoot
Write-Host "작업 폴더: $ProjectRoot" -ForegroundColor DarkGray

$npmCandidates = @(
    (Join-Path $env:ProgramFiles "nodejs\npm.cmd"),
    (Join-Path ${env:ProgramFiles(x86)} "nodejs\npm.cmd"),
    "npm.cmd"
)
$npxCandidates = @(
    (Join-Path $env:ProgramFiles "nodejs\npx.cmd"),
    (Join-Path ${env:ProgramFiles(x86)} "nodejs\npx.cmd"),
    "npx.cmd"
)

$npm = $npmCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
$npx = $npxCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $npm) {
    Write-Host "오류: Node.js/npm 을 찾을 수 없습니다. https://nodejs.org 설치 후 터미널을 다시 여세요." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[1/2] Next.js build..." -ForegroundColor Cyan
& $npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "BUILD FAILED (exit $LASTEXITCODE)" -ForegroundColor Red
    exit $LASTEXITCODE
}

if (-not $npx) {
    Write-Host "오류: npx 를 찾을 수 없습니다." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[2/2] Vercel production deploy..." -ForegroundColor Cyan
& $npx vercel --prod --yes
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "DEPLOY FAILED" -ForegroundColor Red
    Write-Host "처음이면 로그인:" -ForegroundColor Yellow
    Write-Host "  & `"$npx`" vercel login" -ForegroundColor Yellow
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "배포 완료" -ForegroundColor Green
Write-Host "https://smart-stroller-monitoring.vercel.app" -ForegroundColor Green
Write-Host ""
