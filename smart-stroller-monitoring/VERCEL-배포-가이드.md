# Vercel 무료 배포 가이드 (졸업 시연용)

배포가 끝나면 **고정 주소** (예: `https://smart-stroller-xxxx.vercel.app`) 로 폰에서 접속할 수 있습니다.  
PC를 켜 두거나 Wi‑Fi IP를 매번 바꿀 필요가 없습니다.

---

## 1단계: Vercel 계정 만들기 (무료)

1. 브라우저에서 https://vercel.com 접속
2. **Sign Up** → **Continue with Email** 또는 Google 계정
3. 가입 완료

---

## 2단계: PowerShell에서 로그인

PowerShell을 열고 아래를 **한 줄씩** 실행하세요.

```powershell
cd "C:\Users\a\Desktop\smart-stroller-monitoring"
```

```powershell
& "C:\Program Files\nodejs\npx.cmd" vercel login
```

- 터미널에 **주소**가 나오면 그 링크를 브라우저에서 열기
- Vercel 로그인 후 **Authorize** (승인) 클릭
- PowerShell에 `Success!` 또는 로그인 완료 메시지가 나오면 OK

---

## 3단계: 첫 배포 (미리보기)

```powershell
& "C:\Program Files\nodejs\npx.cmd" vercel
```

처음이면 질문이 나옵니다. 대부분 **Enter**만 눌러도 됩니다.

| 질문 | 추천 답 |
|------|---------|
| Set up and deploy? | **Y** |
| Which scope? | 본인 계정 선택 |
| Link to existing project? | **N** |
| Project name? | `smart-stroller` (또는 원하는 이름) |
| Directory? | **Enter** (현재 폴더) |
| Override settings? | **N** |

끝나면 `https://xxxxx.vercel.app` 주소가 나옵니다.

---

## 4단계: 정식 주소로 배포 (시연용)

```powershell
cd "C:\Users\a\Desktop\smart-stroller-monitoring"
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\deploy-prod.ps1
```

또는:

```powershell
& "C:\Program Files\nodejs\npx.cmd" vercel --prod --yes
```

나온 **`https://....vercel.app`** 주소가 **시연할 때 쓸 고정 주소**입니다.

---

## 5단계: 폰에서 사용

1. **Android + Chrome** 으로 위 주소 접속
2. 메뉴(⋮) → **홈 화면에 추가** (앱처럼 사용)
3. **장치 연결하기** 로 블루투스 연결

> 블루투스는 폰 ↔ 유모차 보드 직접 연결입니다. Vercel은 화면만 제공합니다.

---

## 코드 수정 후 다시 올리기

### 가장 쉬운 방법 (경로 입력 불필요)

1. 탐색기에서 **`바탕화면` → `smart-stroller-monitoring`** 폴더 열기  
2. **`배포.bat`** 파일을 **더블클릭**

`cd` 나 경로를 직접 칠 필요가 없습니다.

---

### PowerShell로 할 때

먼저 폴더가 있는지 확인:

```powershell
Test-Path "$env:USERPROFILE\Desktop\smart-stroller-monitoring\package.json"
```

`True` 가 나오면:

```powershell
cd "$env:USERPROFILE\Desktop\smart-stroller-monitoring"
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\deploy-prod.ps1
```

`False` 면 프로젝트가 다른 위치에 있습니다. 탐색기에서 `package.json` 이 있는 폴더를 찾은 뒤:

```powershell
cd "찾은폴더전체경로"
.\deploy-prod.ps1
```

또는 스크립트를 **전체 경로**로 실행:

```powershell
& "$env:USERPROFILE\Desktop\smart-stroller-monitoring\deploy-prod.ps1"
```

> `C:\Users\a\Desktop\...` 에서 **사용자 이름 `a`가 다르면** 경로가 틀립니다.  
> `$env:USERPROFILE\Desktop` 은 **내 PC 사용자 이름**에 맞게 자동으로 바뀝니다.

---

### "경로를 찾을 수 없습니다" 가 나올 때

| 원인 | 해결 |
|------|------|
| 폴더 이름 오타 | `smart-stroller-monitoring` (하이픈 `-`) |
| 다른 드라이브/문서에 있음 | 탐색기 검색: `package.json` + `smart-stroller` |
| `cd` 없이 스크립트만 실행 | 반드시 **프로젝트 폴더**에서 실행하거나 `배포.bat` 사용 |
| PowerShell `&&` 사용 | 한 줄씩 실행하거나 `배포.bat` 사용 |

배포 주소: **https://smart-stroller-monitoring.vercel.app**

---

## 자주 묻는 것

**비용?**  
Vercel 개인 무료 플랜으로 졸업 시연 수준은 보통 0원입니다.

**학교 Wi‑Fi?**  
웹 주소는 집/학교 동일합니다. (인터넷만 되면 됨)

**iPhone?**  
Safari는 Web Bluetooth 제한이 있어 **Android Chrome** 을 권장합니다.

**배포 실패 시**  
먼저 로컬 빌드 확인:

```powershell
& "C:\Program Files\nodejs\npm.cmd" run build
```

성공하면 다시 `vercel --prod` 실행하세요.
