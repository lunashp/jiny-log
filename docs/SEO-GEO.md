# SEO / GEO 기술 체크리스트

- 작성일: 2026-08-17
- 범위: **기술 표면**만 다룬다. 글 자체의 구조·문체 규칙은 [`WRITING-GUIDE.md`](./WRITING-GUIDE.md).

> **먼저 알아둘 것:** GEO 성과의 최대 변수는 이 문서가 아니라 `WRITING-GUIDE.md` 다. 아래 기술 항목을 100% 구현해도 글이 결론을 앞에 두지 않고 버전을 명시하지 않으면 인용되지 않는다. 이 문서는 **필요조건이지 충분조건이 아니다.**

---

## 0. 근거 강도 등급

이 문서의 각 권고에 등급을 붙인다. 리서치 과정에서 확인된 근거의 질이 항목마다 크게 달랐기 때문이다.

| 등급 | 의미 |
|:---:|---|
| **A** | 공식 문서/스펙으로 확인됨. 논쟁 없음 |
| **B** | 업계 합의는 있으나 정량 근거는 약함. 비용이 낮아 채택 |
| **C** | 근거가 엇갈림. 비용이 낮아서만 채택. 전략의 축으로 삼지 않음 |

---

## 1. 메타데이터 (등급 A)

`src/layouts/BaseLayout.astro` 가 전 페이지의 `<head>` 를 담당한다. 페이지는 props 로 넘긴다.

```astro
<BaseLayout
  locale={locale}
  title={post.title}
  description={post.description}
  canonical={post.canonical ?? postUrl(locale, post.slug)}
  languages={await buildPostHreflang(post.slug)}   {/* 존재하는 번역만 */}
  ogType="article"
  ogImage={ogImageUrl(locale, post.slug)}
  publishedTime={post.date}
  modifiedTime={post.updated ?? post.date}
  markdownUrl={postMarkdownUrl(locale, post.slug)}
  jsonLd={jsonLd}
/>
```

**체크리스트**

- [x] title 템플릿: `%s — 지니로그` / `%s — jiny log`
- [x] `description` 미설정 라우트 없음 (스키마가 필수화)
- [x] canonical 은 **자기 자신**. 번역끼리 canonical 을 몰아주지 않음
- [x] `hreflang` 은 존재하는 번역만 + `x-default` → `ko` (ko 있을 때만)
- [x] 태그 페이지에 `robots: noindex, follow` (목록의 파생이라 색인 가치가 낮다)
- [x] OG/Twitter 카드

## 2. 구조화 데이터 (JSON-LD)

### 채택 (등급 A)

| 타입 | 위치 | 목적 |
|---|---|---|
| `BlogPosting` | 글 본문 | 글의 제목·날짜·저자·언어를 명시. **AI가 엔티티를 파악하는 주 경로** |
| `Person` | 글 본문(author) + 소개 | 저자 엔티티 확립 |
| `WebSite` + `SearchAction` | 루트 | 사이트 엔티티 |
| `BreadcrumbList` | 글 본문 | 계층 표현. 리치결과 현역 |

```jsonc
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "<title>",
  "description": "<description>",
  "datePublished": "<date>",
  "dateModified": "<updated ?? date>",
  "inLanguage": "ko-KR",
  "author": { "@type": "Person", "name": "...", "url": "..." },
  "mainEntityOfPage": { "@type": "WebPage", "@id": "<canonical>" },
  "keywords": ["nextjs", "hydration"],
  "image": "<og image absolute url>"
}
```

### 비채택

| 타입 | 이유 |
|---|---|
| `HowTo` | 구글이 **2023-09** 데스크톱 리치결과 폐지. 순수 비용. 단계형 내용은 그냥 `<ol>` 로 쓴다 |
| `FAQPage` | 구글이 **2026-05-07** 리치결과 폐지 (Search Console 리포트 2026-06, API 데이터 2026-08 제거). 마크업 자체가 무효는 아니고 LLM 추출에는 여전히 도움될 수 있으나 **투자 우선순위 최하**. **단, FAQ 형태의 본문 구조는 계속 쓴다** — 마크업이 아니라 구조가 일한다 |

**체크리스트**

- [x] JSON-LD는 `<script is:inline type="application/ld+json">` 로 서버 렌더
- [x] `dateModified` 는 `updated` 없으면 `date` 로 폴백
- [x] `image` 는 절대 URL
- [x] `undefined` 필드는 직렬화에서 제거 (검증기 경고 방지)
- [ ] [Rich Results Test](https://search.google.com/test/rich-results) — **배포 후 확인**

---

## 3. OG 이미지 (등급 A)

`src/pages/og/[...slug].ts` — `astro-og-canvas` 가 **빌드 타임에 PNG를 굽는다**. 런타임 비용 0.

- 카테고리 색이 좌측 보더로 들어가 본문 색 체계와 일관
- 제목 길이에 따라 폰트 크기 조정 (45자 초과 시 축소)
- 한글 렌더를 위해 Pretendard OTF 를 빌드 중에만 로드 — 페이지 로드 시 외부 요청 없음
- 경로에 동적 파라미터가 하나만 허용되므로 `<locale>/<slug>` 를 catch-all 로 받는다

> **Next.js 시절의 `next/og` 제약(500KB·Edge 전용·flexbox만·woff2 불가)은 더 이상 해당 없다.**
> canvaskit 기반이라 제약이 다르고, 전부 빌드 타임에 끝난다.

**체크리스트**

- [x] ko/en 모두 한글 깨짐 없이 렌더
- [x] 긴 제목에서 오버플로 없음
- [ ] 소셜 플랫폼 실제 미리보기 확인 (배포 후)

## 4. 크롤 가능성 (등급 A)

### 사이트맵 — `@astrojs/sitemap`

- `sitemap-index.xml` + `sitemap-0.xml` 자동 생성
- i18n 옵션으로 다국어 대체 링크 포함
- 태그 페이지는 `filter` 로 제외 (noindex 라 색인 대상이 아니다)
- **draft 제외** — 라우트 자체가 생성되지 않으므로 자동 보장

### `src/pages/robots.txt.ts` — AI 크롤러 전부 허용

결정: **학습 크롤러까지 포함해 전부 허용.** 이 블로그의 목적이 노출과 인용이므로, 학습 데이터 포함을 거부할 이유가 없다.

```
User-agent: *
Allow: /

Sitemap: https://<domain>/sitemap-index.xml
```

참고로 분리 제어가 필요해질 경우를 대비한 UA 분류 (지금은 쓰지 않음):

| 분류 | User-Agent |
|---|---|
| 학습 | `GPTBot`, `ClaudeBot`, `Google-Extended`, `Applebot-Extended` |
| 검색/인용(RAG) | `OAI-SearchBot`, `ChatGPT-User`, `Claude-User`, `Claude-SearchBot`, `PerplexityBot` |
| 전통 검색 | `Googlebot`, `Bingbot` |

> `robots.txt` 는 예의상 신호이지 접근 제어가 아니다. 무시하는 크롤러가 실재한다. 차단이 목표라면 서버/WAF 레벨이 필요하다 — 이 블로그는 차단이 목표가 아니므로 해당 없음.

### RSS — `src/pages/[locale]/feed.xml.ts` (`@astrojs/rss`)

- 로케일별 피드
- 전문이 아니라 `summary` (또는 `description`) + 원문 링크
- `Content-Type: application/rss+xml; charset=utf-8`

---

## 5. GEO 전용 표면

### 5-1. 글별 raw markdown (등급 B — 저비용, 논리적으로 타당)

`src/pages/posts/[locale]/[slug].md.ts`

MDX 소스에서 frontmatter를 벗기고 헤더를 붙여 순수 텍스트로 제공한다. AI 크롤러가 내비게이션·CSS·JS 없이 본문만 가져갈 수 있다.

```
# <title>

> <description>

- 원문: https://<domain>/ko/posts/<slug>
- 발행: 2026-08-17 / 수정: 2026-08-20
- 태그: nextjs, react

---

<본문 마크다운>
```

- `Content-Type: text/markdown; charset=utf-8`
- **draft는 404**
- HTML 페이지의 `<head>` 에 `<link rel="alternate" type="text/markdown" href="/posts/ko/<slug>.md">` 를 넣어 발견 가능하게 한다

> HTTP `Accept: text/markdown` 콘텐츠 협상 방식도 존재하나, **캐시 오염 위험(`Vary: Accept` 처리 필요)** 때문에 채택하지 않는다.
> Astro 는 `[slug].md.ts` 파일명을 그대로 URL로 쓰므로 별도 라우트 방식의 구현 비용이 사실상 0이다.

### 5-2. `llms.txt` (등급 C — 근거 엇갈림, 비용 30분)

`src/pages/llms.txt.ts` 에서 빌드 타임 생성.

```
# 지니로그 (jiny log)

> 코딩하며 얻은 인사이트와 트러블슈팅 기록. 한국어/영어.

## Posts (ko)
- [Next.js 16에서 hydration mismatch가 나는 진짜 이유](https://.../posts/ko/nextjs-hydration-mismatch.md): 서버·클라이언트 렌더 결과가 갈리는 원인 4가지와 특정 방법

## Posts (en)
- [...](...): ...
```

- 링크는 **`.md` 라우트를 가리킨다** (HTML이 아니라). llms.txt를 읽는 주체가 바로 본문 텍스트에 도달하게 하는 게 핵심.
- 설명은 각 글의 `description` 을 그대로 사용
- **draft 제외**

> **정직한 평가:** 효능 근거가 갈린다. 한 연구는 잘 구조화된 `llms.txt` 가 AI 인용을 +23% 올렸다고 보고하지만 **1차 출처로 확인하지 못했다**(2차 SEO 블로그 경유). 다른 2026년 조사들은 인용 빈도와 무상관이라고 보고한다. 채택 이유는 "효과가 증명돼서"가 아니라 **"비용이 30분이고 downside가 0이라서"** 다. 전략의 축으로 취급하지 않는다.
>
> `llms-full.txt`(전문 연결)는 **채택하지 않는다.** 글별 `.md` 라우트가 있으면 대부분 중복이고, 글 수가 늘수록 관리 부담만 커진다.

### 5-3. 콘텐츠 구조 (등급 A — 가장 확실하고 싼 레버)

**이것이 GEO의 본체다.** 규칙 전문은 [`WRITING-GUIDE.md`](./WRITING-GUIDE.md). 렌더링 측이 보장할 것만:

- [x] 헤딩에 안정적인 `id` 부여 (`rehype-slug`) — 앵커 인용 가능
- [x] `summary`(TL;DR)를 본문 최상단에 **실제 텍스트로** 렌더 (Answer Block)
- [x] 발행일/수정일을 `<time datetime>` 으로 노출 (트레이스 레일)
- [x] 목차를 서버 렌더 (JS 없이도 구조가 보임)
- [x] 본문이 JS 없이 완전히 읽힘

---

## 6. 성능 (등급 A)

**게이팅 지표 (이 셋만 성공 기준이다)**

| 지표 | 목표 |
|---|---|
| LCP | < 2.5s |
| INP | < 200ms |
| CLS | < 0.1 |

[`PRD.md`](./PRD.md) §6의 성공 지표와 동일하다. **필드 데이터** 기준으로 판정한다.

**보조 지표 (참고용, 게이팅 아님)**: FCP < 1.5s, TBT < 200ms. 랩 데이터에서 회귀를 조기에 잡는 용도로만 본다. 이 둘이 목표를 넘겨도 게이팅 삼종이 통과하면 실패로 치지 않는다.

> 검색 중 "Core Web Vitals 2.0 / Engagement Reliability"라는 신규 지표 주장을 발견했으나 **구글 1차 출처에서 확인되지 않았다.** 마케팅 콘텐츠로 판단하고 무시한다. 표준 LCP/INP/CLS 삼종을 계속 목표로 한다.

**체크리스트**

- [x] 전 라우트 정적 생성
- [ ] **폰트 self-host — 미완. 남은 최대 리스크** ([`DESIGN.md`](./DESIGN.md) §5). 현재 시스템 폰트 폴백
- [ ] 모든 이미지에 명시적 `width`/`height` (CLS 방지)
- [ ] AVIF/WebP, 아래쪽 이미지 lazy
- [x] Shiki 빌드 타임. 런타임 하이라이터 없음
- [x] 번들 예산 CI 게이트 (본문 15KB gzip, 실측 2.2KB)
- [x] 서드파티 런타임 스크립트 0

---

## 7. 계측

### AI 크롤러 히트 (1차 신호)

Vercel 로그에서 UA 기준 집계. **신규 글이 2주 내 크롤됐는지**가 핵심 질문.

```bash
# 예시: 로그 드레인/CLI 출력에서
grep -oiE 'GPTBot|ClaudeBot|PerplexityBot|OAI-SearchBot|Claude-User|Bingbot|Googlebot' | sort | uniq -c
```

### AI 리퍼러 세션 (2차 신호)

`chatgpt.com`, `perplexity.ai`, `claude.ai`, `copilot.microsoft.com`, `gemini.google.com` 리퍼러를 별도 세그먼트로 분리.

> **알려진 한계:** AI 경유 방문의 상당 비율이 리퍼러 헤더 없이 도착해 "Direct"로 오분류된다. 업계 공통 문제이고 깔끔한 해법이 없다. **이 숫자는 하한선으로만 읽는다.** 그래서 크롤러 히트를 1차 신호로 둔다.

### 도구

- `@vercel/analytics` (페이지뷰) + `@vercel/speed-insights` (필드 CWV)
- Google Search Console (색인·쿼리)

---

## 8. 발행 후 체크리스트

새 글마다 확인:

- [ ] `description` 50자 이상, 글 내용을 정확히 요약
- [ ] `summary`(TL;DR)가 **그 자체로 완결된 답**인가
- [ ] H2/H3가 질문형이거나 검색어와 일치하는가
- [ ] 버전 번호·날짜·에러 메시지 전문이 명시됐는가
- [ ] 1차 출처(공식 문서·이슈·체인지로그)를 링크했는가
- [ ] `/posts/<locale>/<slug>.md` 가 정상 응답하는가
- [ ] OG 이미지가 제대로 렌더되는가
- [ ] sitemap·RSS·llms.txt에 반영됐는가
- [ ] Rich Results Test 통과
- [ ] Search Console 색인 요청

---

## 9. 미검증 항목 (문서 전체 요약)

향후 이 문서를 갱신할 때 재확인 대상.

| 주장 | 상태 |
|---|---|
| llms.txt "+23% 인용 증가" | **미검증.** 2차 출처 경유. 다른 연구는 무상관 보고 |
| GEO 논문의 전술별 % 수치(인용 추가 +40% 등) | **미검증.** 방향성(구체적으로 쓰고, 출처 인용하고, 헤지 제거)은 신뢰. **정확한 수치는 인용하지 말 것** |
| "Core Web Vitals 2.0 / Engagement Reliability" | **1차 출처 없음. 무시.** |
| Vercel의 Markdown-for-Agents 대응 기능 유무 | 미확인. Cloudflare는 유사 엣지 기능 보유. Vercel 체인지로그 직접 확인 필요 |

### 재검증 완료 (2026-08-17)

| 주장 | 결과 |
|---|---|
| FAQPage 리치결과 폐지 2026-05-07 (SC 리포트 2026-06, API 2026-08) | ✅ **확인.** 날짜 정확 |
| HowTo 데스크톱 리치결과 폐지 2023-09 | ✅ **확인** (정확히는 2023-09-13) |
| 두 스키마의 마크업 자체는 무효가 아님 | ✅ **확인** |
| `next/og` 500KB 제한 | ✅ **확인.** 추가로 Edge 전용·flexbox 한정·**woff2 미지원** 확인 (§3 반영) |
| Contentlayer 유지보수 중단 | ✅ **확인.** 최종 배포 2023-06-29 |
| Pretendard dynamic subset 실존 | ✅ **확인** |
| Next 16.3.1 / React 19.2.8 / Tailwind 4.3.3 | ✅ **확인.** [`ARCHITECTURE.md`](./ARCHITECTURE.md) §2 반영 |
