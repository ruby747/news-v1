# News Cards — GitHub Pages (Fixed)

- jsDelivr CDN 사용(차단 이슈 완화), `.nojekyll` 추가, Actions 권한 포함.
- **Pages 설정**: Settings → Pages → Branch: `main` / Folder: `/docs`
- **Actions 권한**: Settings → Actions → General → Workflow permissions: **Read and write**

## 처음 JSON이 비어 보이면
Actions에서 `Fetch Latest News`를 한 번 수동 실행하거나 30분 후 자동 갱신을 기다리면 됩니다.

## RSS 커스터마이즈(선택)
Settings → Secrets and variables → Actions → New repository secret  
`FEEDS="https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko,https://feeds.bbci.co.uk/news/world/rss.xml"`
