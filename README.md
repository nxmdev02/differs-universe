# differs Universe

Vercel 프로젝트 하나를 행성 하나로 표시하는 Nuxt 4 · TypeScript · Three.js 대시보드입니다. 첨부 레퍼런스의 어두운 우주, 궤도, 행성 배치를 참고했습니다. 토큰 없이 샘플 프로젝트로 실행됩니다.

## 실행

Node **22.22.3 이상(22.x)** 또는 **24.15 이상(24.x)** 을 사용합니다. 기존 시스템 Node 22.14를 변경하지 않도록 개발 의존성에도 Node 22.22.3을 추가했습니다. `npm run` 명령은 프로젝트 내부 Node를 사용합니다.

```sh
npm install
npm run dev
```

기본 주소: http://localhost:3000

```sh
npm run typecheck
npm run lint
npm test
npx playwright install chromium
npm run test:e2e
npm run build
npm run test:production
npm start
```

`npm start`는 빌드한 서버를 실행합니다. 정적 생성 대신 Nuxt 서버 배포를 사용하세요. 서버 API가 필요합니다.

## 구현한 기능

- 소문자 `differs` 텍스트 브랜드, 자체 호스팅 Inter 폰트, 반응형 다크·라이트 UI. Settings → Appearance에서 전환하며 기본값은 다크입니다. 선택은 브라우저 쿠키에 1년간 저장되고 서버 렌더링부터 적용되어 새로고침·로그인 화면에서도 유지됩니다. 라이트 모드에서는 궤도·별·행성 이름과 상세 패널의 대비도 조정합니다.
- 가장 큰 중앙 지구: NASA Blue Marble 지표 텍스처, 별도 구름층, 대기광, 바다 반사. 작은 점은 배포 상태를 표시합니다.
- 인터스텔라에서 영감을 얻은 관측창 분위기: 먼 배경의 블랙홀·휘어진 강착원반, 따뜻한 황금빛 포인트, 관측 프레임과 로그인 화면의 원형 우주정거장. SVG/CSS로 그린 장식이며 실제 프로젝트나 관측 데이터가 아닙니다. 추가 WebGL 컨텍스트 없이 렌더링하고 블랙홀의 빛 흐름은 일시정지·모션 감소·백그라운드 탭에서 멈춥니다.
- 최근 확인된 배포·커밋 중 최신 날짜가 **90일 이상** 지난 프로젝트는 꼬리가 있는 혜성입니다. 날짜가 없으면 혜성으로 추정하지 않습니다. 커밋을 읽을 수 없으면 알려진 배포 날짜를 사용하며 미리보기에 판단 근거를 표시합니다.
- 행성 종류별 기본 크기는 고정하고, 활동 중인 프로젝트를 DAU 내림차순 → 최신 배포·커밋 순으로 목성·토성·천왕성·해왕성·금성·화성·수성·명왕성에 배정합니다. DAU가 0이거나 미조회인 프로젝트는 함께 최신 활동 순으로 배정하며, 날짜가 없으면 뒤로 보냅니다. 완전 동률은 이름·ID 순입니다. 9번째 이후도 명왕성 크기의 일반 행성이며 방문량이 없다는 이유로 달로 바꾸지 않습니다. 지표 탭과 검색 필터는 배정을 바꾸지 않고, 동기화로 DAU·활동 순위가 바뀌면 재배정합니다. 90일 휴면은 혜성으로 별도 표시하고, 활동 재개 시 현재 우선순위에 맞는 행성으로 돌아옵니다. 달은 지구의 장식 위성입니다.
- 방문량은 기존 대기광의 밝기·범위로 표현합니다. 절대 로그 척도(0~1,000명)라서 방문자 한 명만 있는 서비스가 최대 밝기가 되지 않습니다. 실제 0명은 조용한 행성, 미조회는 —로 표시하며 임의 방문량을 만들지 않습니다. DAU/30d 선택에 따라 빛이 바뀌고 Deployments 보기에서는 빛은 DAU를 유지합니다. 숫자 순위는 미리보기에 별도로 표시하며 동률은 공동 순위입니다. 사이드바와 List도 DAU 내림차순 → 최신 활동 순을 사용합니다. 0명과 미조회는 각각 0과 —로 구분하며, 미조회에 임의 방문량이나 지표 순위를 부여하지 않습니다.
- 최근 24시간 안에 성공한 배포는 짧은 파문을 한 번 표시합니다. 같은 방문 세션에서 동기화·목록 전환으로 반복하지 않으며 새로운 배포가 감지되면 다시 표시합니다. CSS transform/opacity만 사용하며 일시정지·설정창·백그라운드·화면 밖에서 멈추고 모션 감소에서는 생략합니다.
- 행성별 공전·자전과 천왕성의 기울어진 축, 토성의 고리, 목성의 대적점을 표현합니다. 지구 중심 배치와 크기·거리·속도는 대시보드용으로 조정한 모형입니다. 지구의 기준 달을 장식으로 표시하며 프로젝트 수에는 포함하지 않습니다.
- 행성 호버/포커스 시 사이트 스냅샷과 상세 버튼, 클릭 시 운영 도메인을 새 탭으로 엽니다. 모바일은 탭해서 미리보기 후 사이트 열기를 선택합니다. 키보드는 행성에서 ↓를 누르면 미리보기 버튼으로 이동합니다.
- 드래그 이동, 휠·두 손가락 확대, 지구 클릭으로 카메라 초기화. 일시정지와 reduced-motion은 공전·자전·구름 이동을 모두 멈춥니다. 호버/포커스 및 상세 선택 중에는 해당 프로젝트가 멈추며, 다시 움직일 때 궤도가 이어집니다.
- 이름·도메인·저장소 검색, 배포 상태 필터, 목록 보기, 키보드 탐색과 검색 단축키.
- 상세 패널: 도메인, 프레임워크, 배포 상태, GitHub 저장소·기본 브랜치·최근 커밋, 활동 목록.
- 모바일은 하단 내비게이션과 전체 폭 레이아웃을 사용합니다. 주요 터치 버튼은 44px 이상, 검색·필터 글자는 16px이며 화면 가장자리 safe area를 반영합니다. 상세 패널·사이트 미리보기는 화면 안에 고정되고 내부 스크롤을 지원합니다. 목록 보기는 페이지 전체를 스크롤하며, 우주 화면의 세로 스와이프는 페이지 이동, 두 손가락 제스처는 확대·축소입니다. reduced-motion 및 WebGL 실패 시 선택 가능한 목록도 지원합니다.
- 로딩, 빈 목록, 오류·재시도, API 부분 실패, 60초 주기 동기화.
- ID 기반 결정적 데모 데이터. 샘플 지표를 선택하면 `Show · sample`로 안내하며, 상세 패널과 페이지 하단에서도 데이터 출처를 확인할 수 있습니다.
- Vercel 프로젝트·배포·도메인 페이지네이션, 최대 4개 프로젝트 동시 조회, 서버 캐시.
- 서버 전용 토큰, 안전한 외부 링크, 실제 데이터의 프로덕션 접근 보호.

Activity / Deploys 전체 화면은 비활성입니다. 프로젝트별 활동·배포 내역은 상세 패널에서 확인합니다. P1의 날짜 슬라이더, 시계열 차트, 위치 영구 저장은 포함하지 않습니다. 장식용 프로젝트 관계선은 임의로 만들지 않았습니다.

## 실제 방문자 분석

`DATA_MODE=real`에서는 기존 Vercel 토큰으로 [Web Analytics API](https://vercel.com/docs/analytics/web-analytics-api)의 `visits/aggregate`를 조회합니다. 각 프로젝트의 Vercel → Analytics → Enable과 분석 스크립트 배포가 필요합니다. 추가 DB나 토큰은 필요하지 않습니다.

- DAU는 **UTC 오늘 00:00부터 조회 시각까지의 production 방문자**입니다. 날짜는 KST 09:00에 바뀝니다. 로그인 사용자 수가 아닙니다.
- `30d visitors`는 오늘을 포함한 30개 UTC 날짜의 일별 방문자 합계입니다. [Vercel 방문자 세션은 24시간 후 폐기](https://vercel.com/docs/analytics/privacy-policy)되므로 월간 중복 제거 사용자 수(MAU)로 부르지 않습니다. 기존 내부 `mau` 필드는 호환성을 위해 유지하며 실제 화면 라벨은 변경했습니다.
- 프로젝트 간 방문자도 중복 제거하지 않습니다. 상단은 조회 가능한 프로젝트 합계이며, 실패 프로젝트가 있으면 partial로 표시합니다.
- 조회 성공 후 방문 기록이 없으면 `0`, 비활성화·권한·요금제·속도 제한·네트워크 오류는 `null` 및 화면 `—`로 표시합니다. 실제 모드에서 샘플 값으로 대체하지 않습니다. 30일 조회 실패 시에도 오늘 조회는 유지합니다.
- 서버 캐시 및 화면 동기화는 60초입니다. 오늘/30일 범위를 별도 요청하며 production 환경만 집계합니다. 실제 월간 증감률은 계산하지 않고 숨깁니다.

## 실제 Vercel / GitHub 연결

`.env.example`을 `.env`로 복사하고 **서버 환경변수**를 설정하세요. 실제 비밀값을 Git에 커밋하지 마세요.

```dotenv
DATA_MODE=real
VERCEL_TOKEN=your_vercel_token
VERCEL_TEAM_ID=team_xxx
GITHUB_TOKEN=your_github_token
DASHBOARD_PASSWORD=your_private_dashboard_password
```

- 개인 계정이면 `VERCEL_TEAM_ID`는 비워둘 수 있습니다.
- GitHub 토큰이 없으면 공개 저장소 조회만 시도합니다. 저장소 읽기 권한만 부여하세요.
- Vercel 토큰이 없으면 샘플 모드로 전환합니다. 설정된 토큰이 잘못됐거나 API 호출에 실패하면 오류를 표시하며 샘플 데이터를 실제 데이터로 위장하지 않습니다.
- `DATA_MODE=mock`은 토큰이 있더라도 샘플 데이터만 사용합니다.
- `NUXT_DATA_MODE`, `NUXT_VERCEL_TOKEN`, `NUXT_VERCEL_TEAM_ID`, `NUXT_GITHUB_TOKEN`, `NUXT_DASHBOARD_PASSWORD`도 지원합니다. 일반 이름과 함께 설정하면 일반 이름이 우선합니다.
- Google 로그인을 설정하면 아래 계정 허용 목록으로 보호합니다. Google 로그인을 사용하지 않는 기존 구성은 `DASHBOARD_PASSWORD`로 보호하며 브라우저 로그인 사용자 이름은 `differs`입니다. Google 로그인 모드에서는 Basic 인증으로 우회할 수 없습니다. HTTPS 배포를 사용하세요.
- 배포 시 위 환경변수를 호스팅 서버에 설정합니다. 빌드한 Node 서버는 `.env`를 자동으로 읽지 않습니다.
- 수동 동기화도 60초 서버 캐시를 사용합니다. GitHub·도메인 캐시는 120초입니다.
- 배포 기록을 가져오지 못하면 횟수를 `—`로 표시합니다. GitHub 실패는 Vercel 프로젝트를 제거하지 않습니다.
- 배포·커밋 이력은 최근 항목 최대 20개, 브랜치는 첫 100개입니다. 표시 시각은 Asia/Seoul(KST)입니다.

## Google 로그인 설정

Google 로그인 화면은 `/login`입니다. 로컬 `.env`에는 요청한 허용 계정과 임의 세션 암호를 저장했습니다(둘 다 Git에 올리지 않습니다). **OAuth Client ID와 Secret은 Google Cloud에서 발급해야 실제 로그인할 수 있습니다.**

로그인 화면의 지구는 자전하고 두 위성은 궤도를 따라 움직입니다. 포인터에 반응하는 미세한 기울기와 지구 탭/Enter 시 신호 파문을 지원합니다. Pause로 움직임을 멈출 수 있으며, 시스템 모션 감소 설정에서는 정적인 화면과 클릭 강조만 사용합니다. 탭이 숨겨지거나 화면을 떠나면 애니메이션 실행을 중단합니다.

1. [Google Cloud Console](https://console.cloud.google.com/auth/clients)에서 프로젝트를 선택하고 Google Auth Platform의 Branding/Audience를 구성합니다. 개인 Gmail 계정이면 External을 선택하고 테스트 모드에서는 로그인할 계정을 테스트 사용자로 추가합니다.
2. Clients에서 **Web application** OAuth 클라이언트를 생성합니다. Authorized redirect URIs에 `http://localhost:3000/auth/google/callback`과 `https://실제-대시보드-도메인/auth/google/callback`을 각각 등록합니다. JavaScript에서 토큰을 받는 방식이 아니므로 이 구현에는 Authorized JavaScript origins 설정이 필요하지 않습니다.
3. 로컬 `.env` 및 Vercel 프로젝트의 서버 환경변수에 아래 값을 설정합니다. 로컬은 `APP_URL=http://localhost:3000`, 배포는 실제 HTTPS 주소로 설정하세요. Google에 등록한 redirect URI와 완전히 일치해야 합니다.

```dotenv
AUTH_MODE=google
APP_URL=https://your-dashboard.example.com
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
AUTH_ALLOWED_EMAILS=your-approved-google-account@gmail.com
SESSION_PASSWORD=your-random-secret-at-least-32-characters
```

4. `.env` 변경 후 개발 서버를 재시작하거나 Vercel에서 재배포합니다. Preview 배포에서 시험하려면 Preview의 고정 도메인과 별도 redirect URI도 등록하세요. 요청 Host 헤더에서 callback 주소를 추측하지 않습니다.
5. 허용 계정으로 로그인한 뒤 Settings에서 이메일과 **Sign out**을 확인합니다. 다른 계정은 거부됩니다. OAuth 설정이 불완전하면 로그인 버튼이 비활성화되고 프로젝트 API는 503으로 닫힙니다.

인증은 [Google OpenID Connect 서버 흐름](https://developers.google.com/identity/openid-connect/openid-connect)을 사용합니다. state, nonce, PKCE를 검증하고 Google 공개키로 ID 토큰의 서명·발급자·대상·만료를 확인합니다. 서버는 검증된 이메일이 허용 목록에 있을 때만 8시간짜리 암호화 세션 쿠키를 발급합니다. 쿠키는 HttpOnly/SameSite=Lax이며 HTTPS에서 Secure입니다. Google access/refresh/ID 토큰은 세션에 보관하지 않습니다. 로그아웃은 동일 출처 POST만 허용합니다.

`AUTH_ALLOWED_EMAILS`는 쉼표로 구분한 정확한 이메일 목록이며 빈 목록은 접근을 허용하지 않습니다. 매 요청마다 목록을 다시 확인합니다. `SESSION_PASSWORD`는 충분히 무작위인 32자 이상 값으로 만들고 배포 간 유지하세요. 암호를 변경하면 기존 세션이 모두 무효화됩니다. `AUTH_MODE=auto`는 Google 자격증명이 있으면 Google 로그인을 사용하고, 없으면 기존 보호 방식을 유지합니다. `.env`와 OAuth 다운로드 JSON을 Git에 커밋하지 마세요.

## 구조

```text
app/pages/index.vue              대시보드 상태와 화면 조합
app/components/UniverseScene.vue Three.js 렌더링, 카메라, 터치, DOM 라벨
app/components/ProjectPanel.vue  프로젝트 상세와 활동
app/assets/css/main.css          반응형 스타일
server/api/                     projects, project detail, activity, health
server/services/                Vercel / GitHub / Mock 어댑터
server/middleware/access.ts     실제 데이터 프로덕션 접근 보호
shared/types/                   UI와 서버 공통 데이터 모델
shared/utils/                   크기 계산, 포맷, 안전한 링크
tests/                          데이터·페이지네이션·브라우저 테스트
```

## 검증과 제한

`typecheck`, `lint`, 단위 테스트, Playwright 데스크톱·모바일 테스트, 프로덕션 빌드를 실행했습니다. 테스트는 지표의 경계값, 결정적 데이터, 동일 저장소 프로젝트의 독립성, API 페이지네이션, 화면 조작, WebGL 폴백, 실패 후 복구를 확인합니다. 브라우저 스크린샷은 `artifacts/`에 저장됩니다.

로컬에서 실제 Vercel 프로젝트 12개와 운영 도메인 미리보기를 확인했습니다. 자동 브라우저 테스트는 별도 포트 3100에서 샘플 모드로 실행하며 로컬 실제 계정 설정을 바꾸지 않습니다.

렌더링은 데스크톱 최대 30fps, 좁은 화면 최대 24fps로 제한하며 픽셀 비율은 각각 1.5 / 1.25 이하입니다. 일시정지·모션 감소에서는 입력이나 데이터 변경 시에만 다시 그립니다. 탭이 숨겨지거나 장면이 화면 밖에 있거나 Settings가 열리면 우주 렌더링을 멈춥니다. 확대·이동의 감속이 끝나면 프레임 예약도 중단하고, 장면을 떠날 때 geometry/material/texture와 WebGL context를 해제합니다. 로그인과 블랙홀 효과도 화면 밖·숨겨진 탭에서는 멈춥니다.

2026-10-21 로컬 Chromium 소프트웨어 WebGL / 개발 서버 / 샘플 프로젝트 8개 측정: 프레임당 삼각형 50,706 → 21,666(약 57% 감소), 이후 고정 행성 매핑·방문량 대기광·배포 파문을 적용한 같은 샘플의 재측정은 프레임당 21,154개이며, 행성 유형별 고리 수에 따라 달라집니다. DPR 3 모바일의 캔버스 픽셀 618×1088 → 455×800(약 46% 감소). 정지 후 2초 대기 구간의 WebGL 렌더 횟수는 일시정지·모션 감소·화면 밖·Settings에서 모두 0회였습니다. Universe/List 4회 전환 후 활성 GL 텍스처는 6개로 유지되고 장면 해제 시 추적한 GL 버퍼/텍스처는 0개입니다. 실제 기기의 FPS·CPU·배터리 수치는 이 테스트로 보장하지 않습니다. 회귀 검사는 `tests/e2e/resources.spec.ts`, 원시 측정 결과는 로컬 `artifacts/resources-*.json`에 저장됩니다. 변경 시에만 그리는 방식과 명시적 자원 해제는 [Three.js 렌더링 안내](https://threejs.org/manual/en/rendering-on-demand.html), [자원 정리 안내](https://threejs.org/manual/en/cleanup.html)를 따릅니다.

## 사이트 미리보기 갱신

실제 데이터 모드의 로컬 서버를 실행한 뒤 `npm run previews:capture`를 실행합니다. `PREVIEW_BASE_URL`로 대상 대시보드 주소를 지정할 수 있습니다(기본 `http://localhost:3000`). 로그인된 대시보드라면 실행 환경에 `DASHBOARD_PASSWORD`를 설정합니다. Playwright Chromium이 없으면 `npx playwright install chromium`으로 설치합니다.

공개 운영 페이지를 비로그인 브라우저로 촬영해 `server/assets/previews/`에 저장합니다. 이미지는 서버에 묶이고 `/api/projects/:id/preview`에서 대시보드와 같은 접근 보호를 받습니다. 미리보기는 촬영 시각을 표시하며, 실시간 임베드가 아닙니다. 새 프로젝트나 사이트 변경 후 다시 촬영하고 대시보드를 빌드·배포하면 갱신됩니다. 이미지가 없거나 실패한 경우 프로젝트 정보 카드로 대체됩니다. 대시보드 자격 증명은 촬영할 사이트에 전달하지 않습니다.

지구 윤곽은 [Natural Earth 1:110m land 데이터](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_land.geojson)를 좌표 두 자리로 단순화해 사용합니다. [Natural Earth 이용 조건](https://www.naturalearthdata.com/about/terms-of-use/)에 따라 public domain입니다.

지구 지표 텍스처: NASA Visible Earth, [Blue Marble — Land Surface, Ocean Color and Sea Ice](https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57730/land_ocean_ice_2048.jpg), 로컬 파일 `public/textures/earth-blue-marble.jpg`. [NASA 이미지 사용 지침](https://www.nasa.gov/nasa-brand-center/images-and-media/)에 따라 출처를 표시합니다. 네트워크 없이 로컬 텍스처를 사용하며 로딩 실패 시 Natural Earth 윤곽으로 대체합니다. 다른 행성 표면·구름·고리는 코드로 생성합니다.

2026-10-21 의존성 검사에서는 기존 Nuxt 4.6.2의 하위 의존성 `braces`와 `node-forge`에 연결된 high 경고 11개가 보고되었습니다. 당시 레지스트리 최신 버전도 경고 범위에 포함되어 자동 수정 가능한 패치가 없었습니다. `npm audit fix --force`가 제안하는 Nuxt 하향 변경은 적용하지 않았습니다. 배포 전 의존성 업데이트를 확인하세요.

공식 참고: [Vercel 프로젝트 API](https://vercel.com/docs/rest-api/reference/endpoints/projects/retrieve-a-list-of-projects), [Vercel 배포 API](https://vercel.com/docs/rest-api/reference/endpoints/deployments/list-deployments), [GitHub 커밋 API](https://docs.github.com/en/rest/commits/commits), [Nuxt runtimeConfig](https://nuxt.com/docs/4.x/guide/going-further/runtime-config), [Three.js](https://threejs.org/docs/).
