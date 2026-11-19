# GitHub 및 Vercel 배포

프로젝트 루트는 `safe-bike-seoul`이다. 이 폴더를 GitHub 저장소의 루트로 업로드하는 구성을 기준으로 한다. 실제 GitHub 저장소 생성·push 및 Vercel 배포는 아직 수행하지 않았다.

## 1. GitHub 업로드

현재 `main` 브랜치의 로컬 Git 저장소와 업로드할 파일을 준비했다. `.env*`는 `.env.example`만 제외하고 무시하며, `.next`, `node_modules`, `.vercel`, 인증서와 압축 파일도 제외한다. `.env.example`에는 실제 키가 없다. 로컬 `.env`를 웹에서 파일 선택해 업로드하지 않는다.

GitHub에서 빈 저장소를 만든 뒤 프로젝트 폴더에서 다음 명령을 실행한다. `YOUR_ACCOUNT`는 본인의 계정으로 바꾼다.

```powershell
git status --short
npm.cmd run check:release
git commit -m "Prepare Safe Bike Seoul for deployment"
git remote add origin https://github.com/YOUR_ACCOUNT/safe-bike-seoul.git
git push -u origin main
```

Git 작성자 설정이 없다는 오류가 발생하면 본인의 이름·이메일을 이 저장소에 설정하고 다시 commit한다. 이후 파일을 수정했으면 `git add .` 후 `check:release`를 다시 실행한다. 이 검사는 현재 로컬에 설정된 키가 업로드 파일에 들어 있는지도 값 출력 없이 확인한다. CI는 로컬 키를 전달받지 않으므로 임의의 다른 유출 키까지 검출하는 범용 비밀정보 검사는 아니다. GitHub Secret scanning 기능도 사용할 수 있다.

## 2. Vercel 설정

Vercel에서 Add New → Project → 해당 GitHub 저장소 Import를 선택한다.

| 항목 | 설정 |
| --- | --- |
| Framework Preset | Next.js |
| Root Directory | 저장소에 프로젝트 내용만 올렸으면 기본값. 상위 폴더 전체를 올렸으면 `safe-bike-seoul` |
| Node.js | 24.x (`package.json` engines와 일치) |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | 기본값 유지 |

API Route가 있으므로 정적 Export 모드로 배포하지 않는다. `vercel.json`에 API 실행 상한 60초를 설정했다. 외부 제공처 페이지 수집과 네트워크 상태에 따라 시간 초과가 발생할 수 있으며, 로컬 성공이 Vercel 네트워크에서의 성공을 보장하지 않는다. 서버 메모리 캐시는 인스턴스 간 공유되지 않는다.

## 3. 환경변수

Vercel 프로젝트 Settings → Environment Variables에서 값을 직접 입력한다. 실제 `.env` 파일을 GitHub에 올리지 않는다. 아래 변수는 Production에 설정하고, Preview에서도 실제 기능을 쓸 경우 Preview 범위에도 별도로 설정한다. 비밀 키는 Vercel의 Sensitive 옵션을 사용한다.

| 이름 | 값 / 용도 | 브라우저 공개 |
| --- | --- | --- |
| `SEOUL_API_KEY` | 서울 열린데이터광장 인증키 | 아니오 |
| `DATA_GO_KR_API_KEY` | 사고다발지역 및 기상청 단기예보 활용 승인을 받은 공공데이터포털 키 | 아니오 |
| `KAKAO_REST_API_KEY` | 카카오 REST API 키, 장소·자전거 경로 조회 | 아니오 |
| `SEOUL_ALLOW_HTTP` | 실제 따릉이 조회는 `true` | 비밀 키 아님 |
| `NEXT_PUBLIC_KAKAO_JS_KEY` | 카카오 지도 JavaScript 키 | 예, 지도 SDK에 필요 |

서버 키 이름에는 `NEXT_PUBLIC_`를 붙이지 않는다. `DATA_MODE`는 사용하지 않는다. 키에 따옴표나 줄바꿈을 포함하지 않는다. 서울시 bikeList는 인증키를 HTTP로 전송한다. 사용자가 이 전송을 승인한 상태이며, 운영 배포에서도 이 방식을 사용하려면 `SEOUL_ALLOW_HTTP=true`를 지정한다. 이 설정은 전송 암호화를 제공하지 않는다.

환경변수를 바꾼 후에는 Redeploy한다. 특히 `NEXT_PUBLIC_KAKAO_JS_KEY`는 빌드 시 브라우저 번들에 포함되므로 다시 빌드해야 바뀐다. 서버 키는 API Route에서만 읽으며 클라이언트에 반환하지 않는다.

## 4. 카카오 허용 도메인

Kakao Developers의 앱 관리 → 앱 → 플랫폼 키 → JavaScript 키 → JavaScript SDK 도메인에서 실제 접속 origin을 등록한다. 카카오맵 사용 설정도 활성화되어 있어야 한다.

```text
http://localhost:3000
https://YOUR_PROJECT.vercel.app
https://YOUR_CUSTOM_DOMAIN
```

위 예시 주소를 그대로 등록하지 말고 실제 주소로 바꾼다. 프로토콜과 포트가 일치해야 하며 페이지 경로는 넣지 않는다. `127.0.0.1`은 `localhost`와 다르다. www와 루트 도메인을 모두 사용하면 각각 등록한다. Preview 배포는 Production과 주소가 다를 수 있으므로 실제 사용할 Preview origin도 등록한다. 임의의 모든 Preview 주소가 자동 허용된다고 가정하지 않는다. 이 앱은 카카오 로그인을 사용하지 않으므로 OAuth Redirect URI 설정은 필요 없다.

첫 배포로 주소를 확인한 뒤 도메인을 등록하고 새로고침한다. 지도 SDK의 401/domain mismatched는 JavaScript 키·도메인 등록을 확인하고, `/api/routes`의 401/403은 서버 REST 키·서비스 권한·호출 한도를 확인한다. 두 키는 서로 교체할 수 없다. REST 키에 IP 제한을 설정했다면 Vercel 출구 IP 정책과도 맞아야 한다.

## 5. 배포 후 확인

- 실제 지도, 출발/도착 검색, 따릉이 대여 가능 수량 및 거리순 목록을 확인한다.
- 실제 대여소 선택 후 두 자전거 경로 및 비교표를 확인한다.
- 사고 기준연도, 과거 통계 안내, 날씨 발표/예보 시각과 출처를 확인한다.
- 모바일 화면에서 검색·선택·지도 조작을 확인한다.
- `.env` 요청이 404이고 서버 키가 HTML/API 응답에 없는지 확인한다.
- 401/403은 키·승인·도메인 설정을, 429는 제공처 호출 한도를, 502/시간 초과는 Vercel에서 외부 API 접근을 확인한다. 서울시 HTTP 8088 접근은 배포 환경에서 별도 확인해야 한다. 실패해도 가상 데이터를 반환하지 않는다.

## 공식 문서

- [Vercel Git 배포](https://vercel.com/docs/git)
- [Vercel 환경변수와 적용 범위](https://vercel.com/docs/environment-variables)
- [Vercel Node.js 버전](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)
- [Vercel 함수 실행 시간](https://vercel.com/docs/functions/configuring-functions/duration)
- [카카오 JavaScript SDK 도메인 등록](https://developers.kakao.com/docs/ko/javascript/getting-started)
