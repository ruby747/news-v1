# News Cards — Vanilla (Full Bundle)

이 번들은 **모든 파일**이 다 들어 있습니다. 압축 풀고 **내용물만** 새 레포의 루트에 올리면 바로 동작합니다.

## 파일 구조
```
docs/
  index.html        # 단일 프론트 (외부 라이브러리 없음)
  README.md
  data/
    latest.json     # 초기 시드 포함 (Actions 이후 자동 갱신)
  .nojekyll
scripts/
  fetch-news.mjs    # RSS -> JSON 생성 (OG 이미지 일부 추출)
.github/workflows/
  fetch-news.yml    # 30분마다 갱신 + 수동 실행
package.json        # rss-parser 의존성 (Actions용)
```

## 배포
1) 새 레포 생성 → 이 폴더 **내용물만** 업로드 (상위 폴더째 X)
2) **Settings → Pages**: Branch=`main`, Folder=`/docs`
3) **Actions → Fetch Latest News → Run workflow** (최초 1회)
4) 페이지 열고 강력 새로고침(Cmd+Shift+R)

## 커스터마이즈
- **RSS 소스 추가**: Settings → Secrets → Actions → `FEEDS`
  ```
  https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko,https://feeds.bbci.co.uk/news/world/rss.xml
  ```
- **OG 이미지 수집 튜닝**: 워크플로우 env
  - `MAX_OG_FETCH` (기본 40), `OG_CONCURRENCY` (기본 5), `OG_TIMEOUT_MS` (기본 7000)

## 메모
- 데이터 로드 실패해도 UI가 **플레이스홀더 카드**를 보여주므로 화면이 새까맣게 비지 않습니다.
- Actions가 한 번 실행되면 `docs/data/latest.json`이 실제 최신 데이터로 덮어씌워집니다.
