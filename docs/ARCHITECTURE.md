# 아키텍처 — 지니로그 (jiny-log)

- 작성일: 2026-08-17
- 대상 독자: 이 저장소에서 작업하는 사람/에이전트

---

## 1. 프레임워크 선택: Astro 7

> **2026-08-17 결정 변경.** 이 문서는 원래 Next.js 16 App Router 채택을 기록했다.
> 구현 중 실측에서 §1-3의 전환 조건이 **즉시 발동**해 Astro로 옮겼다. 경위는 아래 참조.

### 실측이 뒤집은 것

Next.js 16 + React 19 App Router로 Phase 0~4를 구현한 뒤 번들 예산을 측정한 결과:

| 상태 | 글 본문 JS (gzip) |
|---|---|
| 초기 구현 | 190.6kB |
| 레거시 폴리필 제외(noModule) | 151.2kB |
| next-intl 클라이언트 런타임 제거 | 138.9kB |
| **클라이언트 컴포넌트 전부 제거** | **138.0kB** |
| Astro 재구현 | **2.2kB** |

**핵심은 마지막 두 줄이다.** 클라이언트 컴포넌트를 전부 들어내도 138kB가 남았다 —
애플리케이션 코드 기여분은 1kB 미만이고, 나머지는 전부 React + Next 런타임 바닥값이다.
문서에 적었던 80kB 예산은 최적화로 도달할 수 있는 값이 아니라 **프레임워크 선택으로만
결정되는 값**이었다.

Astro 재구현 후 2.2kB. 그 2.2kB도 전부 우리가 직접 쓴 코드다(테마 토글, 목차 관찰자,
코드 복사 버튼). 66배 차이.

### SEO/GEO 관점에서 손해가 없다는 판단

전환 기준은 "SEO/GEO에 불리하지 않을 것"이었다. 결론은 **중립 내지 유리**다.

- 두 프레임워크 모두 정적 HTML을 낸다. 크롤러와 LLM이 읽는 것은 HTML이지 JS 번들이 아니다.
- GEO 레버(콘텐츠 구조, raw markdown, `llms.txt`, JSON-LD, hreflang)는 전부 프레임워크 독립적이다.
- 138kB가 실제로 해치는 것은 모바일의 INP/TBT이지 크롤 가능성이 아니다. 다만 CWV는 약한 랭킹 신호이므로 Astro가 조금 유리하다.
- **부수 효과:** `content-collections` 의존이 사라졌다. Astro는 콘텐츠 레이어가 프레임워크 내장이라 §11의 "파이프라인 유지보수 중단" 리스크가 통째로 없어진다.

유일한 실질 손실은 `next/og` 였다. `astro-og-canvas`(canvaskit-wasm)로 대체했고 빌드 타임에만 동작한다.

### Next.js로 되돌릴 조건

- 글 안에 **상태를 가진 React 위젯**(플레이그라운드, 인터랙티브 데모)이 상시로 필요해질 때. Astro도 아일랜드로 가능하지만, 그게 상시 요구사항이면 Next 쪽이 자연스럽다.
- 블로그가 **인증·대시보드가 있는 앱**으로 확장될 때.

단순히 "React 생태계 라이브러리를 쓰고 싶다"는 이유로는 되돌리지 않는다 — 아일랜드로 국소 해결한다.

---

## 1-B. (기록) 원래의 Next.js 16 선택 근거

### 검토한 대안

| | Next.js 16 App Router | Astro 6 |
|---|---|---|
| 기본 클라이언트 JS | React 런타임/라우터 베이스 존재 | **0KB** (Islands) |
| 콘텐츠 파이프라인 | 서드파티 필요 (Contentlayer 사망 → content-collections / Velite) | **네이티브 Content Layer + Zod 내장** |
| i18n | `next-intl` (성숙, 기능 풍부) | 내장 라우팅 + 헬퍼 직접 작성 |
| 동적 OG 이미지 | **`next/og` 무의존성 내장** | satori 기반 서드파티 |
| 인터랙티브 데모 삽입 | 자연스러움 | React 아일랜드로 가능 |
| Vercel 통합 | 1급 | `@astrojs/vercel` 어댑터, 잘 지원됨 |

**순수 기술 점수는 Astro가 높다.** 콘텐츠 블로그는 Astro가 겨냥한 정확한 유스케이스다.

### 그럼에도 Next.js를 택한 이유

1. **블로그의 성패는 글을 계속 쓰느냐에 달려 있다.** 플랫폼 마찰은 곧 발행 빈도 하락이고, 발행 빈도가 SEO/GEO 성과의 최대 변수다 ([`PRD.md`](./PRD.md) §6에서 발행 빈도를 1순위 지표로 둔 이유). 이미 운영해 본 스택이 주는 속도가 벤치마크 수치보다 중요하다.
2. **이 프로젝트에서 가장 까다로운 비콘텐츠 파트가 ko/en i18n**이다. `next-intl` + `[locale]` 라우팅으로 한 번 풀어 본 문제를 다시 푸는 것이 새 프레임워크의 i18n을 처음부터 익히는 것보다 확실하다.
3. **`next/og` 로 글별 동적 OG 이미지가 추가 의존성 0**으로 나온다. 소셜 공유와 AI 표면 노출에 직접 기여한다.
4. **성능 격차는 닫을 수 있는 종류다.** 본문 페이지를 서버 컴포넌트로만 구성하고 CI에 번들 예산을 하드 게이트로 걸면 실사용 목표(LCP<2.5s, INP<200ms)는 달성 가능하다.

### ⚠️ Astro 전환 재검토 조건

아래 중 **하나라도** 발생하면 이 결정을 다시 연다. 그때 가서 판단하지 말고, 조건에 걸리는 순간 재검토를 시작한다.

- 번들 예산(본문 80KB gzip)을 지키기 위해 **콘텐츠 렌더링 기능을 포기하거나 우회하는 결정이 2회 이상** 필요해진 경우
- Vercel Speed Insights **필드 데이터** 기준 본문 라우트 LCP가 목표 초과 상태로 **2개 릴리스 연속 고착**된 경우
- `content-collections` 가 유지보수 중단되고 Velite 등 대안도 마땅치 않은 경우 (Astro는 콘텐츠 레이어가 프레임워크 내장이라 이 리스크가 없다)

전환 비용은 콘텐츠(`content/posts/**`)와 계약이 프레임워크 독립적이라 낮게 유지된다. **이것이 `src/lib/content/` 격리 레이어를 두는 진짜 이유다.**

---

## 2. 고정 스택

2026-08-17 기준 npm 실측값이다.

| 항목 | 값 | 비고 |
|---|---|---|
| Node | 24 | 로컬 확인: v24.11.0 |
| pnpm | 10 | 로컬 확인: 10.20.0 |
| Astro | **7.2.2** | `output: "static"` |
| 어댑터 | `@astrojs/vercel` **11.0.5** | |
| MDX | `@astrojs/mdx` **7.0.5** | |
| 사이트맵 | `@astrojs/sitemap` **3.7.3** | i18n 옵션 사용 |
| RSS | `@astrojs/rss` **4.0.19** | |
| Tailwind | **4.3.3** (`@tailwindcss/vite`) | CSS custom properties 토큰과 병용 |
| 스키마 | `zod` **4.4.3** | ★ Astro 7 이 zod ^4 를 번들한다 — v3 를 쓰면 JSON 스키마 생성이 경고를 낸다 |
| TypeScript | **6.0.3** | ★ 7.0.2 가 최신이지만 `typescript-eslint@8` 이 `<6.1.0` 만 지원한다 |
| OG 이미지 | `astro-og-canvas` **0.13.0** | 빌드 타임 전용 |
| 테스트 | `vitest` **4.1.10** | |

**콘텐츠 파이프라인:** Astro 내장 Content Layer (`glob` 로더 + zod 스키마).
서드파티 의존이 없어 Contentlayer/content-collections 계열의 유지보수 리스크가 해당 없다.

> **버전 주의:** 패치 버전은 주 단위로 움직인다. Phase 0에서 `pnpm view <pkg> version` 으로 재확인하고 lockfile에 고정한다.

---

## 3. 라우팅 구조

```
src/pages/
├── [locale]/
│   ├── index.astro                 # 홈: 최근 글 + 소개
│   ├── posts/
│   │   ├── index.astro             # 전체 목록
│   │   └── [slug].astro            # 본문
│   ├── tags/[tag].astro
│   └── feed.xml.ts                 # RSS (로케일별)
├── posts/[locale]/[slug].md.ts     # ★ raw markdown (AI 크롤러용)
├── og/[...slug].ts                 # 글별 OG 이미지 (빌드 타임 PNG)
├── llms.txt.ts
└── robots.txt.ts
```

`@astrojs/sitemap` 이 `sitemap-index.xml` + `sitemap-0.xml` 을 자동 생성한다.

**URL 형태**

| 화면 | URL |
|---|---|
| 홈 | `/ko`, `/en` |
| 글 목록 | `/ko/posts`, `/en/posts` |
| 글 본문 | `/ko/posts/<slug>`, `/en/posts/<slug>` |
| raw markdown | `/posts/ko/<slug>.md` |
| OG 이미지 | `/og/ko/<slug>.png` |
| 태그 | `/ko/tags/<tag>` |

- **기본 로케일 `ko` 도 프리픽스를 붙인다** (`prefixDefaultLocale: true`). 프리픽스 유무가 섞이면 canonical/hreflang이 지저분해지고 중복 URL이 생긴다.
- `/` → `/ko` 는 `redirects` 설정으로 **진짜 308**을 낸다. Astro 내장 `redirectToDefaultLocale` 은 meta refresh 페이지를 만들어 열등하다.
- **전 라우트 정적 생성.** `getStaticPaths` 로 (locale, slug) 조합을 전부 프리렌더한다.

---

## 4. 콘텐츠 파이프라인과 격리 레이어

```
content/posts/{ko,en}/<slug>.mdx
        │
        ▼
src/content.config.ts   (glob 로더 + zod 스키마 — 빌드 타임 검증)
        │
        ▼
src/lib/content/        ★ 격리 경계 — 여기서만 astro:content 를 import
  ├── schema.ts         # PostFrontmatterSchema (CONTENT-CONTRACT.md 구현체)
  ├── headings.ts       # 목차 추출 (코드 펜스 인식)
  ├── types.ts          # Post, PostSummary — 도메인 타입
  ├── queries.ts        # getPosts, getPostBySlug, renderPost, ...
  └── index.ts          # 공개 API (이것만 외부에 노출)
        │
        ▼
src/pages/, src/components/   # 도메인 타입만 사용
```

**규칙**

- `astro:content` 를 `src/lib/content/` 와 `src/content.config.ts` 밖에서 import 하면 안 된다. **eslint `no-restricted-imports` 로 강제**한다 (구현 중 실제로 위반을 한 건 잡아냈다 — 본문 렌더의 `render()` 가 페이지로 새어나갔고, `renderPost()` 로 감쌌다).
- **`draft` 필터링은 `queries.ts` 한 곳에서만** 수행한다. 호출부가 각자 필터링하면 언젠가 하나를 빠뜨리고, 그게 사이트맵이면 draft URL이 색인된다.
- 가시성 규칙은 순수 함수 `isPostVisible(draft, isDev)` 로 분리해 직접 테스트한다.
- 로케일·슬러그는 파일 경로(`<locale>/<slug>`)에서 유도한다. 로케일 디렉터리가 아니거나 frontmatter `slug` 가 파일명과 다르면 **빌드를 실패**시킨다.

---

## 5. i18n 전략

### 구조

- Astro 내장 i18n 라우팅 + `src/pages/[locale]/` 세그먼트
- UI 문자열: `messages/{ko,en}.json` → `src/lib/i18n/getMessages(locale)` 로 조회
- **클라이언트 i18n 런타임이 없다.** Astro 컴포넌트는 서버에서만 실행되므로 메시지 카탈로그가 브라우저 번들에 실리지 않는다
- 타입 안전: `ko` 카탈로그를 기준 타입으로 삼아 `en` 이 키를 빠뜨리면 타입 오류가 난다

### 글의 존재 단위

**(slug, locale) 쌍이 하나의 글이다.** ko만 있고 en이 없는 상태가 정상이다. ([`CONTENT-CONTRACT.md`](./CONTENT-CONTRACT.md) §5)

| 상황 | 동작 |
|---|---|
| `/en/posts/foo` 요청, en 파일 없음 | **404.** ko로 리다이렉트하지 않는다 — 다른 언어 페이지로 보내는 리다이렉트는 SEO 유해하고 사용자에게 혼란 |
| 언어 전환 버튼, 대상 번역 없음 | **비활성 + 설명 문구**("이 글은 한국어로만 있습니다"). 눌러서 404 나는 것보다 낫다 |
| 인덱스 페이지 | 해당 로케일에 실제 존재하는 글만 나열 |

### canonical / hreflang

- 각 페이지의 canonical은 **자기 자신**. ko를 en의 canonical로 지정하지 않는다 (번역은 중복 콘텐츠가 아니다).
- `hreflang` 은 **실제 존재하는 로케일만** 상호 링크. `getAvailableLocales()` 가 콘텐츠에서 직접 판정한다.
- `x-default` 는 `ko` 를 가리키되, **ko 번역이 없으면 넣지 않는다**.

---

## 6. 렌더링 & 클라이언트 경계

**원칙: 기본은 JS 0바이트다.** 프레임워크 아일랜드(React/Preact 등)를 쓰지 않는다 — 통합 자체를 설치하지 않았다.

| 요소 | 구현 |
|---|---|
| 본문 MDX, 목차, 콜아웃, figure, 헤더/푸터, 언어 전환 | 순수 서버 렌더 (JS 0) |
| 테마 초기화 | `<script is:inline>` — 첫 페인트 전 동기 실행 (FOUC 방지) |
| 테마 토글 | 인라인 DOM 이벤트 스크립트 |
| 목차 현재 위치 | `IntersectionObserver` 스크립트 |
| 코드 복사 버튼 | 로드 후 DOM 향상 스크립트 |

**코드 하이라이팅은 빌드 타임 Shiki.** 듀얼 테마를 함께 구워 `--shiki-light` / `--shiki-dark` CSS 변수로 전환하므로 런타임 하이라이터가 클라이언트에 가지 않는다.

### 번들 예산 (실측 반영)

| 라우트 | JS (gzip) | 실측 | CSS | 실측 |
|---|---|---|---|---|
| 글 본문 | < 15KB | **2.2KB** | < 20KB | 6.6KB |
| 홈·목록·태그 | < 10KB | **0.9KB** | < 20KB | 4.9KB |

CI에서 초과 시 빌드 실패 (`tools/ci/check-budget.mjs`). 빌드된 HTML이 실제 참조하는 자산을 gzip으로 합산하며, 인라인 스크립트도 포함하고 `noModule` 레거시 번들은 제외한다.

> Next.js 시절 예산은 80KB였고 실측 138KB로 **달성 불가능**했다. 지금 예산이 15KB인 것은 목표를 낮춰서가 아니라 프레임워크 바닥값이 사라졌기 때문이다.

---

## 7. SEO/GEO 표면

상세는 [`SEO-GEO.md`](./SEO-GEO.md). 아키텍처 관점의 요점만:

| 산출물 | 구현 위치 | 비고 |
|---|---|---|
| 메타데이터 | `src/layouts/BaseLayout.astro` | 로케일별 title 템플릿 |
| JSON-LD | `src/lib/seo/json-ld.ts` | `BlogPosting`, `Person`, `WebSite`+`SearchAction`, `BreadcrumbList` |
| hreflang | `src/lib/seo/hreflang.ts` | **존재하는 번역만** |
| OG 이미지 | `src/pages/og/[...slug].ts` | `astro-og-canvas`, 빌드 타임 PNG |
| sitemap | `@astrojs/sitemap` 통합 | `sitemap-index.xml` |
| robots | `src/pages/robots.txt.ts` | AI 크롤러 **전부 허용** |
| RSS | `src/pages/[locale]/feed.xml.ts` | `@astrojs/rss` |
| llms.txt | `src/pages/llms.txt.ts` | 링크가 `.md` 라우트를 가리킨다 |
| raw markdown | `src/pages/posts/[locale]/[slug].md.ts` | `text/markdown; charset=utf-8` |

**raw markdown 라우트**는 MDX 원문 앞에 제목·설명·날짜·canonical·TL;DR 헤더를 붙여 반환한다. Astro 는 `[slug].md.ts` 파일명을 그대로 URL로 쓰므로 별도 우회가 필요 없다. **draft 글은 라우트 자체가 생성되지 않는다.**

---

## 8. 빌드 & 배포

```
git push (main)
   → Vercel 빌드
       1. pnpm install --frozen-lockfile
       2. astro build
          - 콘텐츠 동기화 + zod 검증 (실패 시 빌드 중단)
          - 전 라우트 정적 생성
          - OG 이미지 PNG 굽기
       3. pnpm check:budget (초과 시 실패)
   → 배포
```

- `main` = 프로덕션. 그 외 브랜치/PR = Vercel Preview 배포 (`blog-publisher` 가 초안 확인용으로 사용).
- 환경변수: **`PUBLIC_SITE_URL`** (canonical/sitemap/OG 절대경로 생성에 필수). 프로덕션에서 미설정이면 빌드가 실패한다.

---

## 9. 디렉터리 구조

```
jiny-log/
├── astro.config.mjs
├── src/
│   ├── content.config.ts           # 콘텐츠 컬렉션 정의
│   ├── pages/                      # 라우팅 (§3)
│   ├── layouts/BaseLayout.astro
│   ├── components/{layout,post,mdx}/
│   ├── lib/{content,seo,i18n}/
│   └── styles/{tokens,typography,code,global}.css
├── content/posts/{ko,en}/*.mdx
├── messages/{ko,en}.json
├── public/images/<slug>/
├── tools/ci/check-budget.mjs
└── docs/
```

파일은 기능/도메인 기준으로 묶는다. 200–400줄 권장, 800줄 초과 금지.

---

## 10. 테스트 전략

| 층 | 도구 | 대상 |
|---|---|---|
| 유닛 | vitest | `src/lib/content/` 쿼리·필터, `src/lib/seo/` 빌더, 목차 추출 |
| 시각회귀 | Playwright 스크린샷 | 홈·목록·본문 × 320/768/1024/1440 × light/dark |
| 접근성 | Playwright + axe | 전 주요 라우트, 위반 0 |
| 성능 | Lighthouse CI | 본문 라우트 기준 CWV 예산 |
| 예산 | `check-budget.mjs` | 라우트별 JS/CSS gzip 크기 |

**우선순위:** 콘텐츠 파이프라인 유닛 테스트 > 접근성 > 시각회귀 > 나머지. `draft` 필터링과 hreflang 생성은 조용히 깨졌을 때 피해가 가장 크므로 반드시 유닛 테스트로 고정한다.

유닛 테스트는 `astro:content` 를 **모킹**한다 — 실제 콘텐츠 파일이나 빌드 산출물에 의존하면 글을 추가할 때마다 테스트가 깨지고, 빌드 없이는 돌지 않는다. 현재 60개 테스트가 통과한다.
