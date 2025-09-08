# News Cards — GitHub Pages 배포판

> GitHub Pages(정적 호스팅)에서 동작하도록 만든 버전입니다.  
> **GitHub Actions**가 주기적으로 RSS를 모아 `docs/data/latest.json`을 갱신하고, 프론트는 그 JSON만 불러옵니다.

## 빠른 시작

1. 이 레포를 GitHub에 푸시합니다.
2. **Settings → Pages** 에서 Source를 `main` / `docs` 로 설정합니다.
3. **Actions** 탭에서 워크플로우를 **Enable** 하고, `Fetch Latest News` 워크플로우를 *Run workflow* 로 한 번 수동 실행합니다. (또는 30분 간격으로 자동 실행)
4. 배포 URL: `https://<USERNAME>.github.io/<REPO>/`

## 환경변수(선택)

- `FEEDS` (repository secrets): 콤마 구분 RSS 목록.
  - 기본값: Google News KR, Reuters Top
  - 설정: **Settings → Secrets and variables → Actions → New repository secret** 에 `FEEDS` 추가

예) `https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko,https://feeds.bbci.co.uk/news/world/rss.xml`

## 구조

```
docs/                # GitHub Pages가 서빙
  index.html
  app.js
  data/
    latest.json      # Actions가 주기적으로 업데이트
scripts/
  fetch-news.mjs     # RSS 모아서 latest.json 생성
.github/workflows/
  fetch-news.yml     # 스케줄/수동 실행 워크플로우
package.json         # rss-parser 의존성
```

## 메모

- Pages는 **정적**이라 런타임 서버가 없습니다. “앱 켤 때마다 실시간 호출”이 꼭 필요하면
  - (권장) 이 저장소는 그대로 두고, 별도 서버리스(Cloudflare Workers/Netlify Functions 등)로 `/api/topics`를 만들고 프론트 `fetch` URL만 바꾸세요.
  - (간편) 외부 뉴스 API를 브라우저에서 직접 호출하면 키 노출/정책 위반 위험이 있습니다.
