# 🛡️ 안심 귀가 내비게이션 (Safe Return Navigation)

> 어두운 골목길과 CCTV 사각지대를 피해 안전한 길을 안내하는 모바일 안심 귀가 내비게이션 프로젝트입니다.

---

## 🚀 전체 연동 파이프라인 (작업 순서)

```
[1. Antigravity에서 코드 생성] 
       ↓
[2. Supabase DB 세팅 (schema.sql 실행)] 
       ↓
[3. GitHub 저장소 생성 및 푸시] 
       ↓
[4. Vercel 원클릭 자동 배포 & 모바일 브라우저 실시간 테스트] 
       ↓
[5. Capacitor로 스토어용 앱(APK/AAB) 빌드]
```

---

## 1. Supabase 데이터베이스 설정 (3분 컷)

1. [Supabase](https://supabase.com)에 로그인하고 새 프로젝트(New Project)를 생성합니다.
2. 좌측 메뉴에서 **SQL Editor**로 이동합니다.
3. 이 프로젝트의 `supabase/schema.sql` 파일 내용을 그대로 복사하여 SQL Editor에 붙여넣고 **Run**을 실행합니다.
   - `safety_facilities` (CCTV, 가로등, 비상벨) 테이블 자동 생성
   - 반경 검색 RPC 함수 `get_facilities_within_radius` 등록
   - 샘플 방범 데이터 즉시 삽입 완료
4. 좌측 메뉴 **Project Settings -> API**로 이동하여 아래 두 값을 복사합니다:
   - `Project URL`
   - `Project API keys (anon / public)`

---

## 2. 브이월드(V-WORLD) 지도 인증키 발급

1. [브이월드 오픈API 포털](https://www.vworld.kr)에 접속 후 회원가입/로그인합니다.
2. **인증키 신청** -> **2D 배경지도(WMTS)** 선택 후 발급받습니다.
   - 개발 단계에서는 도메인에 `localhost` 또는 배포 예정인 Vercel 도메인을 입력합니다.

---

## 3. GitHub 리포지토리 생성 및 코드 푸시

터미널에서 아래 명령어로 GitHub에 코드를 올립니다:

```bash
cd C:\Users\user\.gemini\antigravity\scratch\safe-return-app

git init
git add .
git commit -m "feat: 안심 귀가 내비게이션 1단계 MVP 구축 (V-World, Geolocation, TTS, Vibration, Supabase 연동)"
git branch -M main
git remote add origin https://github.com/당신의_깃허브_아이디/safe-return-app.git
git push -u origin main
```

---

## 4. Vercel 원클릭 배포

1. [Vercel](https://vercel.com)에 로그인 후 **Add New... -> Project**를 클릭합니다.
2. 방금 올린 `safe-return-app` GitHub 저장소를 **Import**합니다.
3. **Environment Variables (환경 변수)** 섹션에 아래 3개 변수를 추가합니다:
   - `VITE_VWORLD_API_KEY`: 브이월드 인증키
   - `VITE_SUPABASE_URL`: Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY`: Supabase anon key
4. **Deploy** 버튼을 누르면 1~2분 안에 모바일 웹 배포가 완료됩니다!
5. 스마트폰으로 배포된 Vercel 링크(`https://safe-return-app-xxx.vercel.app`)에 접속하여:
   - 위치(GPS) 권한 허용
   - 위험 골목 경보 버튼 클릭 시 **실제 스마트폰 진동 및 TTS 한국어 음성 경보**를 확인하세요.

---

## 5. 최종 단계: 스토어용 모바일 앱(Android / iOS) 패키징

Vercel에서 웹 동작을 확인한 후 앱 스토어에 출시할 때는 프로젝트에 **Capacitor**를 추가합니다:

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
npx cap init "안심귀가" "com.safereturn.app" --web-dir dist
npm run build
npx cap add android
npx cap open android
```
안드로이드 스튜디오가 실행되면 바로 스마트폰에 APK로 설치하거나 구글 플레이 콘솔에 AAB를 제출할 수 있습니다.
