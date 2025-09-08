# News Cards — GitHub Pages (Ultra-hardened)

- jsDelivr CDN + 디버그 토스트 + 플러그인 없는 경우에도 **절대 블랭크 화면이 안 뜨도록** 방어.
- `docs/.nojekyll` 포함.
- Actions 워크플로우에 `permissions: contents: write` 포함.

## 배포
- Settings → Pages → Branch: `main` / Folder: `/docs`
- Actions → Fetch Latest News → Run workflow

## 커스터마이즈
- `FEEDS` 시크릿으로 RSS 추가 가능(콤마 구분).
