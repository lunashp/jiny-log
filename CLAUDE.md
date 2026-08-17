# CLAUDE.md — jiny-log (지니로그)

코딩 인사이트/트러블슈팅을 기록하는 개인 블로그. Vercel 배포, 한국어+영어 이중 언어.
**이 저장소의 존재 이유는 "검색엔진과 AI가 잘 읽고, 사람도 잘 읽는 글"을 안정적으로 내보내는 것이다.** 모든 기술 결정은 그 기준으로 판단한다.

관련 저장소: [`../blog-publisher`](../blog-publisher/) — 이 블로그에 글을 발행하는 MCP 서버.

---

## 문서 인덱스

| 문서 | 언제 읽나 |
|---|---|
| [`docs/PRD.md`](./docs/PRD.md) | 무엇을 왜 만드는지, 성공 기준 |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | 스택 선택 근거, 라우팅, i18n 구조 |
| [`docs/CONTENT-CONTRACT.md`](./docs/CONTENT-CONTRACT.md) | **frontmatter/경로 계약 — blog-publisher와 공유** |
| [`docs/SEO-GEO.md`](./docs/SEO-GEO.md) | SEO/GEO 기술 체크리스트 |
| [`docs/WRITING-GUIDE.md`](./docs/WRITING-GUIDE.md) | 글쓰기 규칙 — 문체·구조 (GEO의 실질) |
| [`docs/POST-TEMPLATE.md`](./docs/POST-TEMPLATE.md) | **글 작성 틀 — 무엇을 채우면 화면이 어떻게 되는가** |
| [`docs/DESIGN.md`](./docs/DESIGN.md) | 에디토리얼 디자인 방향, 토큰, 타이포 |
| [`docs/PLAN.md`](./docs/PLAN.md) | 단계별 구현 계획과 완료 기준 |

---

## 고정 스택 (임의 변경 금지)

| 항목 | 값 |
|---|---|
| 런타임 | Node 24 |
| 패키지 매니저 | **pnpm** (npm/yarn 사용 금지, lockfile 혼재 금지) |
| 프레임워크 | **Astro 7.2.x** (`output: "static"`) |
| 어댑터 | `@astrojs/vercel` |
| 언어 | TypeScript strict |
| 스타일 | Tailwind v4 (`@tailwindcss/vite`) + CSS custom properties 토큰 |
| 콘텐츠 | Astro 내장 Content Layer + MDX |
| 스키마 | `zod` **v4** — Astro 7 이 zod ^4 를 번들한다. v3 를 쓰면 경고가 난다 |
| TypeScript | **6.0.x** — 7.x 가 최신이지만 `typescript-eslint@8` 이 `<6.1.0` 만 지원한다 |
| i18n | Astro 내장 i18n 라우팅 (클라이언트 런타임 없음) |
| 배포 | Vercel |

> **프레임워크 이력:** 처음에 Next.js 16 App Router로 구현했으나, 클라이언트 컴포넌트를
> 전부 제거해도 JS 138KB가 남는 것을 실측하고 Astro로 옮겼다(현재 2.2KB).
> 경위와 되돌릴 조건은 [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) §1 참조.

**의존성 추가는 기본적으로 거부한다.** 특히 **프레임워크 통합(React/Vue/Svelte)을 설치하지 않는다** — 설치하는 순간 아일랜드 런타임이 번들에 들어오고 이 저장소의 성능 전제가 무너진다. 인터랙션이 필요하면 먼저 순수 DOM 스크립트로 해결한다.

## 디렉터리 구조

```
src/
├── content.config.ts               # 콘텐츠 컬렉션 정의 (astro:content 허용 지점)
├── pages/
│   ├── [locale]/
│   │   ├── index.astro             # 홈
│   │   ├── posts/index.astro       # 목록
│   │   ├── posts/[slug].astro      # 본문
│   │   ├── tags/[tag].astro
│   │   └── feed.xml.ts             # RSS
│   ├── posts/[locale]/[slug].md.ts # raw markdown (AI 크롤러용)
│   ├── og/[...slug].ts             # OG 이미지 (빌드 타임 PNG)
│   ├── llms.txt.ts
│   └── robots.txt.ts
├── layouts/BaseLayout.astro
├── components/
│   ├── layout/                     # SiteHeader, SiteFooter, ThemeToggle, ThemeScript
│   ├── post/                       # PostList, TraceRail, TableOfContents, LocaleSwitch, RelatedPosts
│   └── mdx/                        # Callout, Figure, Aside, Details, CodeEnhancer
├── lib/
│   ├── content/                    # ★ 콘텐츠 파이프라인 격리 레이어
│   ├── seo/                        # site, hreflang, json-ld
│   └── i18n/                       # 메시지 조회 + localeHref
└── styles/{tokens,typography,code,global}.css

content/posts/{ko,en}/<slug>.mdx
public/images/<slug>/
messages/{ko,en}.json
```

파일은 **기능/도메인 기준**으로 묶는다. 타입 기준(`hooks/`, `utils/` 뭉텅이) 금지.
파일 200–400줄 권장, **800줄 초과 금지**.

## 반드시 지킬 규칙

### 1. 콘텐츠 접근은 `src/lib/content/` 를 통해서만

`astro:content` 를 **페이지·컴포넌트에서 직접 import 하지 않는다.** 전부 `@/lib/content` 가 재수출하는 도메인 타입(`Post`, `PostSummary`)과 쿼리를 쓴다. 본문 렌더링도 `renderPost()` 를 거친다.

**eslint `no-restricted-imports` 로 강제한다.** 예외는 `src/lib/content/**` 와 `src/content.config.ts` 뿐이다.

```ts
// ❌ 금지
import { getCollection, render } from "astro:content";

// ✅
import { getPosts, getPostBySlug, renderPost } from "@/lib/content";
```

이유: 콘텐츠 레이어를 갈아끼울 때 이 한 곳만 고치면 되도록 격리한다. 실제로 구현 중 `render()` 가 페이지로 새어나간 것을 이 규칙이 잡아냈다.

### 2. draft는 프로덕션에서 완전히 사라진다

`draft: true` 인 글은 목록·본문·사이트맵·RSS·`llms.txt`·raw markdown 어디에도 나오면 안 된다. 필터링은 `src/lib/content/` 진입점 **한 곳**에서 수행한다. 각 페이지가 개별적으로 필터링하면 언젠가 하나를 빠뜨린다.

### 3. 기본은 JS 0바이트다

**프레임워크 아일랜드(React/Vue/Svelte)를 쓰지 않는다.** 통합 자체가 설치되어 있지 않다.

인터랙션이 필요하면 순서대로 시도한다:
1. CSS만으로 되는가 (`:hover`, `:focus-visible`, `<details>`)
2. `<script>` 안의 순수 DOM 이벤트로 되는가
3. 그래도 안 되면 그때 논의한다

현재 클라이언트 JS는 테마 토글·목차 관찰자·코드 복사 버튼 셋뿐이고 전부 순수 DOM이다.

### 4. 번들 예산은 하드 게이트

| 라우트 | JS (gzip) | 현재 | CSS |
|---|---|---|---|
| 글 본문 | **< 15KB** | 2.2KB | < 20KB |
| 목록/홈/태그 | **< 10KB** | 0.9KB | < 20KB |

CI에서 초과 시 **빌드 실패** (`pnpm check:budget`). **예산을 올려서 통과시키지 않는다.**
여유가 크다는 것은 규칙 3이 지켜지고 있다는 뜻이다. 갑자기 예산에 근접하면 아일랜드나 무거운 라이브러리가 들어온 것이므로 원인을 찾아 되돌린다.

### 5. 애니메이션은 `transform` / `opacity` / `clip-path` 만

`width`, `height`, `top`, `left`, `margin`, `padding`, `font-size` 애니메이션 금지. `will-change` 는 좁게 쓰고 끝나면 제거.
`prefers-reduced-motion: reduce` 를 반드시 존중한다.

### 6. 색·간격·타이포는 토큰으로만

`styles/tokens.css` 의 CSS custom property를 쓴다. 컴포넌트에 팔레트 값이나 매직 넘버를 직접 박지 않는다. 새 값이 필요하면 토큰을 추가한다.

**색 토큰의 명도를 바꾸면 반드시 `pnpm test:e2e` 를 다시 돌린다.** 토큰 명도는 눈대중이 아니라
WCAG 4.5:1 계산으로 정해져 있고, 초기 값 중 4개가 실제로 AA 미달이었다 ([`DESIGN.md`](./docs/DESIGN.md) §3).

### 6-1. measure(max-width)는 텍스트 요소 자신에게 건다

`ch` 단위는 **그 요소의 font-size** 기준으로 계산된다. 컨테이너에 걸면 본문 크기(17px)로
계산되어 제목 컬럼이 1/4 로 쪼그라든다. 실제로 이 실수로 대제목이 단어 중간에서 잘렸다.

```css
/* ❌ 컨테이너에 걸면 17px 기준 */
.header { max-width: 20ch; }

/* ✅ 제목 자신에게 걸면 64px 기준 */
.post-title { font-size: var(--text-title); max-width: 20ch; }
```

### 7. 시맨틱 HTML 우선

`<article>`, `<time datetime>`, `<nav aria-label>`, `<figure>/<figcaption>` 을 쓴다. div 래퍼 스택으로 대체하지 않는다. 헤딩 레벨을 건너뛰지 않는다.

### 8. 스키마 검증 실패 = 빌드 실패

frontmatter가 계약에 맞지 않으면 경고가 아니라 에러다. 깨진 메타데이터로 배포되면 SEO 손해가 조용히 쌓인다.

---

## 하지 말 것

| 금지 | 이유 |
|---|---|
| `HowTo` JSON-LD 추가 | 구글이 2023년 리치결과 폐지. 순수 비용 |
| `FAQPage` JSON-LD를 SEO 목적으로 추가 | 2026-05-07 리치결과 폐지. FAQ **본문 구조**는 유지하되 마크업에 시간 쓰지 말 것 |
| 한글 슬러그 | URL 인코딩으로 공유·인용 시 깨짐. 슬러그는 항상 ASCII |
| 슬러그에 날짜 프리픽스 | 날짜는 frontmatter에만 |
| 번역 없는 로케일 → 다른 로케일 리다이렉트 | SEO 유해. 404가 정답 |
| 외부 이미지 핫링크 | 자산은 `public/images/<slug>/` 에 둔다 |
| 웹폰트 3패밀리 초과 | 한글 폰트는 용량이 크다. [`DESIGN.md`](./docs/DESIGN.md) 참조 |
| React/Vue/Svelte 통합 설치 | 아일랜드 런타임이 번들에 들어온다. 규칙 3 참조 |
| `astro:content` 직접 import | 격리 레이어 우회. 규칙 1 참조 (lint 로 차단됨) |
| 카드 그리드 인덱스 | 템플릿 티. 에디토리얼 데이트라인 리스트를 쓴다 |
| `content/posts/**` 를 사람이 손으로 편집 | 원칙적으로 `blog-publisher` 가 쓴다. 손편집 시 계약 검증을 반드시 통과시킬 것 |

---

## 커맨드

```bash
pnpm dev            # 개발 서버 (draft 글 노출됨)
pnpm build          # 프로덕션 빌드 (draft 제외, 스키마 검증)
pnpm preview
pnpm lint           # eslint (격리 규칙 포함)
pnpm typecheck      # astro check
pnpm test           # vitest 유닛 (60개)
pnpm test:e2e       # Playwright (시각회귀 + a11y) — Phase 5
pnpm check:budget   # 번들 예산 검사 (build 후 실행)

pnpm fonts:check    # 폰트 서브셋 커버리지·예산 (CI. 순수 Node)
pnpm fonts:build    # 폰트 서브셋 재생성 (로컬 전용. Python + fontTools 필요)
```

**글을 추가한 뒤 `pnpm fonts:check` 가 실패하면** 새 글자가 서브셋에 없다는 뜻이다.
`pnpm fonts:build` 를 돌리고 `public/fonts/` 와 `tools/fonts/charset.json` 을 함께 커밋한다.

환경변수 `PUBLIC_SITE_URL` 이 필요하다. 프로덕션 빌드에서 미설정이면 실패한다.

---

## 커밋 컨벤션

```
<type>: <description>
```
`feat` / `fix` / `refactor` / `docs` / `test` / `chore` / `perf` / `ci` / `content`

- 글 추가·수정은 `content:` 타입을 쓴다 (`blog-publisher` 도 이 규약을 따른다).
- 코드 변경과 글 변경을 한 커밋에 섞지 않는다.

---

## 작업 시 참고

- 성능·접근성·SEO는 사후 점검 항목이 아니라 **완료 조건**이다. 기능을 먼저 만들고 나중에 붙이는 순서로 진행하지 않는다.
- 새 페이지/라우트를 추가하면 사이트맵·hreflang·JSON-LD 반영 여부를 같은 작업 안에서 확인한다.
- 디자인 작업 시 [`DESIGN.md`](./docs/DESIGN.md) 의 체크리스트를 통과했는지 스스로 검토한다. "기본 Tailwind 템플릿처럼 보이는가?"가 실패 신호다.
