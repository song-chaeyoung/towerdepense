# Tower Rush 🏰

설치·로그인 없이 브라우저에서 바로 즐기는 가벼운 **타워디펜스 웹 게임**.

- 정해진 경로로 몰려오는 적을, 길목에 타워를 세워 막아낸다.
- 골드로 타워를 짓고·강화하며 모든 웨이브를 버티면 승리.
- 에셋은 기본 도형(Canvas), 서버·DB 없이 프론트만으로 동작.

## 실행

빌드 도구가 필요 없습니다. 정적 파일이라 아래 아무 방법이나 됩니다.

```bash
# 방법 1) 그냥 열기
open web/index.html

# 방법 2) 로컬 서버로 열기 (권장)
cd web && python3 -m http.server 5173
# → http://localhost:5173
```

## 배포 (GitHub Pages)

`master`에 반영되면 [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)가 `web/`를
GitHub Pages로 자동 배포합니다. 빌드 단계는 없습니다(정적 파일).

**최초 1회 설정** — 저장소 **Settings → Pages → Build and deployment → Source**를
**"GitHub Actions"** 로 지정하세요. 이후 `master` push마다 자동 배포됩니다.

- 배포 주소: `https://song-chaeyoung.github.io/towerdepense/`
- 경로가 상대 경로라 하위 경로(`/towerdepense/`)에서도 그대로 동작합니다.

> 참고: private 저장소의 GitHub Pages 공개 게시는 유료 플랜이 필요할 수 있습니다.
> 그 경우 저장소를 public으로 전환하거나 Netlify/Vercel/Cloudflare Pages에 `web/`를 올리면 됩니다.

## 개발 방식 (vibe-sprint)

이 프로젝트는 [vibe-sprint](https://github.com/) 방식으로 기획되었습니다.
기획 산출물은 `docs/01`~`docs/15`, 실제 구현은 `web/`에 있습니다.

- 기능 목록: [`docs/10_feature_list.md`](docs/10_feature_list.md)
- 화면 구성: [`docs/11_page_routing_split.md`](docs/11_page_routing_split.md)
- 우선순위: [`docs/14_priority_matrix.md`](docs/14_priority_matrix.md)
- 진행/구현 현황: **GitHub Issues** (라벨 `1순위`~`4순위`)
