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

## 개발 방식 (vibe-sprint)

이 프로젝트는 [vibe-sprint](https://github.com/) 방식으로 기획되었습니다.
기획 산출물은 `docs/01`~`docs/15`, 실제 구현은 `web/`에 있습니다.

- 기능 목록: [`docs/10_feature_list.md`](docs/10_feature_list.md)
- 화면 구성: [`docs/11_page_routing_split.md`](docs/11_page_routing_split.md)
- 우선순위: [`docs/14_priority_matrix.md`](docs/14_priority_matrix.md)
- 진행/구현 현황: **GitHub Issues** (라벨 `1순위`~`4순위`)
