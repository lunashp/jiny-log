# 지니로그 (jiny-log)

코드를 쓰면서 얻은 인사이트와 트러블슈팅 기록을 쌓는 개인 기술 블로그.
검색엔진과 AI 어시스턴트가 **인용하기 좋은 형태**로 발행되며, 사람이 길게 읽어도 피로하지 않은 에디토리얼 디자인을 지향한다.

- 한국어 + 영어 이중 언어
- Astro 7 / MDX / Vercel
- 글은 [`blog-publisher`](../blog-publisher/) MCP 서버를 통해 발행된다

> **상태: Phase 0–5 구현 완료.** 콘텐츠 파이프라인·i18n·디자인 시스템·SEO/GEO 표면·
> 폰트 self-host·접근성/시각회귀 테스트가 모두 동작한다. 남은 것은 Phase 6(배포·분석·발행 연동).

---

## 문서

| 문서 | 내용 |
|---|---|
| [`CLAUDE.md`](./CLAUDE.md) | **에이전트 작업 규칙 — 코드 작성 전 필독** |
| [`docs/PRD.md`](./docs/PRD.md) | 목적, 대상 독자, 성공 지표, 범위 |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | 스택 선택 근거, 라우팅, i18n, 격리 레이어 |
| [`docs/CONTENT-CONTRACT.md`](./docs/CONTENT-CONTRACT.md) | **frontmatter·경로 계약 (blog-publisher와 공유)** |
| [`docs/SEO-GEO.md`](./docs/SEO-GEO.md) | SEO/GEO 기술 체크리스트 |
| [`docs/WRITING-GUIDE.md`](./docs/WRITING-GUIDE.md) | 글쓰기 규칙 — 문체·구조 (**GEO의 실질**) |
| [`docs/POST-TEMPLATE.md`](./docs/POST-TEMPLATE.md) | **글 작성 틀 — 복붙 템플릿 + 필드↔화면 매핑** |
| [`docs/DESIGN.md`](./docs/DESIGN.md) | 에디토리얼 디자인 방향, 토큰, 타이포 |
| [`docs/PLAN.md`](./docs/PLAN.md) | Phase별 구현 계획과 완료 조건 |

**처음 읽는 순서:** `PRD` → `ARCHITECTURE` → `CONTENT-CONTRACT` → `PLAN`

---

## 커맨드

```bash
pnpm install

pnpm dev            # 개발 서버 (draft 글 노출)
pnpm build          # 프로덕션 빌드 (draft 제외 + frontmatter 검증)
pnpm preview

pnpm lint
pnpm typecheck      # astro check
pnpm test           # vitest 유닛 (60개)
pnpm test:e2e       # Playwright 전체 — 폰트·a11y·반응형·시각회귀 (31개)
pnpm test:e2e:ci    # 시각회귀 제외 (25개) — CI 가 쓰는 명령
pnpm check:budget   # 번들 예산 (build 후)
pnpm fonts:check    # 폰트 서브셋 커버리지·예산 (CI)
pnpm fonts:build    # 폰트 서브셋 재생성 (로컬 전용, Python 필요)
```

**글을 추가한 뒤 `pnpm fonts:check` 가 실패하면** 새 글자가 서브셋에 없다는 뜻이다.
`pnpm fonts:build` 를 돌리고 `public/fonts/` 와 `tools/fonts/charset.json` 을 함께 커밋한다.

## 환경변수

| 이름 | 필수 | 설명 |
|---|:---:|---|
| `PUBLIC_SITE_URL` | ✅ | canonical·sitemap·OG 절대 URL 생성. 예: `https://example.com` |

---

## 콘텐츠 구조

```
content/posts/
├── ko/<slug>.mdx
└── en/<slug>.mdx        # 같은 slug = 같은 글의 번역

public/images/<slug>/    # 글별 자산
```

- 슬러그는 **로케일 무관하게 동일**하며 항상 ASCII kebab-case
- 모든 글을 양쪽 언어로 쓸 의무는 없다. ko만 있는 상태가 정상
- frontmatter 규격은 [`docs/CONTENT-CONTRACT.md`](./docs/CONTENT-CONTRACT.md)

---

## 배포

```
main 브랜치 push → Vercel 빌드 → 프로덕션
그 외 브랜치/PR   → Vercel Preview 배포 (초안 확인용)
```

빌드는 frontmatter 검증과 번들 예산 검사를 통과해야 성공한다. 둘 중 하나라도 실패하면 배포되지 않는다.

**현재 실측 (gzip):**

| | JS | CSS | 폰트 |
|---|---|---|---|
| 글 본문 | 2.2kB | 6.6kB | 178kB |
| 목록·홈 | 0.9kB | 4.9kB | 110kB |

클라이언트 JS는 테마 토글·목차 관찰자·코드 복사 버튼뿐이고 전부 순수 DOM 스크립트다.
폰트는 콘텐츠 기반 서브셋이라 한 번 받으면 사이트 전체에서 재사용된다.

---

## 발행 흐름

```
Claude Code/Desktop 에서 "이 글 블로그에 올려줘"
        │
        ▼
blog-publisher (MCP) — 검증 → 브랜치 커밋 → PR
        │
        ▼
Vercel Preview URL 로 초안 확인
        │
        ▼
publish_post → draft: false → main 머지 → 라이브
```

초안은 **항상 `draft: true`** 로 들어온다. 라이브 전환은 명시적인 발행 호출로만 일어난다.
