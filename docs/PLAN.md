# 구현 계획 — 지니로그

- 작성일: 2026-08-17 (2026-08-17 Astro 전환 반영)
- **진행 상태: Phase 0–5 완료. Phase 6(배포·분석·발행 연동) 남음.**
- 전제: 이 문서를 읽는 에이전트는 [`CLAUDE.md`](../CLAUDE.md), [`ARCHITECTURE.md`](./ARCHITECTURE.md), [`CONTENT-CONTRACT.md`](./CONTENT-CONTRACT.md) 를 먼저 읽는다.

**각 Phase의 DoD(완료 조건)를 전부 충족하기 전에 다음 Phase로 넘어가지 않는다.** 성능·접근성은 마지막에 붙이는 항목이 아니라 각 Phase의 완료 조건이다.

---

## Phase 0–4 — 완료 (2026-08-17)

Next.js 16 으로 Phase 0–4 를 구현한 뒤 번들 실측에서 전환 조건이 발동해 **Astro 7 로 재구현**했다.
경위는 [`ARCHITECTURE.md`](./ARCHITECTURE.md) §1.

### Phase 0 — 부트스트랩 ✅

- Astro 7.2.2 + `@astrojs/vercel` / `mdx` / `sitemap` / `rss`, Tailwind v4 (`@tailwindcss/vite`)
- TypeScript strict, `@/*` → `src/*` 별칭
- ESLint (flat config) + Prettier, **`no-restricted-imports` 로 `astro:content` 격리 강제**
- `.env.example`: `PUBLIC_SITE_URL`

> **버전 함정 2건 (실측으로 확인):**
> - `typescript-eslint@8` 이 `typescript <6.1.0` 만 지원 → TS 7.0.2 대신 **6.0.3** 고정
> - Astro 7 이 zod ^4 를 번들 → zod v3 를 쓰면 JSON 스키마 생성 경고. **zod 4.4.3** 사용

### Phase 1 — 콘텐츠 파이프라인 + 격리 레이어 ✅

- `src/content.config.ts` — `glob` 로더 + `PostFrontmatterSchema` (`retainBody: true` 로 원문 보존)
- `src/lib/content/` — `schema` / `headings` / `types` / `queries` / `index`
- 로케일·슬러그를 파일 경로에서 유도. 로케일 디렉터리가 아니거나 frontmatter `slug` 불일치 시 **빌드 실패**
- 가시성 규칙을 순수 함수 `isPostVisible(draft, isDev)` 로 분리
- 샘플 글 4편 (ko 3 + en 1, 그중 draft 1)

**DoD 결과**
- [x] draft 규칙 유닛 테스트
- [x] `getAvailableLocales()` 가 존재하는 로케일만 반환
- [x] date 내림차순 + 슬러그 안정 정렬
- [x] 잘못된 경로/슬러그 불일치 시 빌드 실패
- [x] `astro:content` import 가 격리 레이어 밖에 0건 (**lint 가 실제 위반 1건 검출**)

### Phase 2 — i18n + 라우팅 ✅

- Astro 내장 i18n, `prefixDefaultLocale: true`
- `/` → `/ko` 는 `redirects` 로 **진짜 308** (meta refresh 아님)
- `messages/{ko,en}.json` + `getMessages()` — **클라이언트 i18n 런타임 없음**
- 번역 없는 로케일은 라우트 자체가 생성되지 않아 자연히 404

**DoD 결과**
- [x] `/` → `/ko` 308
- [x] ko 전용 글의 `/en/...` 은 404
- [x] 빌드 산출물에 draft 라우트 없음
- [x] 언어 전환이 번역 유무에 따라 링크/비활성으로 갈림

### Phase 3 — 디자인 시스템 ✅ (폰트 제외)

- `tokens.css` — 의미론적 시그널 색, 라이트/다크 각각 설계
- `typography.css` — 로케일별 행간·자간, `word-break: keep-all`
- **Answer Block** (시그니처), 트레이스 레일, 데이트라인 목록(카드 그리드 아님)
- MDX 컴포넌트 4종, 코드블록 향상(복사 버튼), 목차
- 테마 토글 — 인라인 스크립트, FOUC 없음

> **⚠️ 폰트 self-host 는 Phase 5 로 이월.** 현재 시스템 폰트 폴백으로 동작한다.
> 이것이 남은 최대 리스크다 ([`DESIGN.md`](./DESIGN.md) §5).

### Phase 4 — SEO / GEO 표면 ✅

- canonical + hreflang (**존재하는 번역만**, x-default 는 ko 있을 때만)
- JSON-LD: `BlogPosting` / `Person` / `WebSite`+`SearchAction` / `BreadcrumbList` — `HowTo`·`FAQPage` 없음
- OG 이미지: `astro-og-canvas` 빌드 타임 PNG (Pretendard 로 한글 렌더)
- sitemap / robots(전부 허용) / RSS / `llms.txt` / raw markdown
- `<link rel="alternate" type="text/markdown">` 로 원문 발견 가능

**DoD 결과**
- [x] hreflang 유닛 테스트 (존재하는 로케일만)
- [x] sitemap·RSS·llms.txt·raw markdown 어디에도 draft 없음
- [x] OG 이미지 3장 생성, 한글 정상
- [x] JS 없이 본문 완독 가능
- [x] canonical 이 자기 자신
- [ ] Rich Results Test — **배포 후 확인 필요**

---

## Phase 5 — 성능 · 접근성 게이트 ✅ (2026-08-17)

### 완료

1. **폰트 self-host** — 콘텐츠 기반 서브셋으로 178kB (예산 250kB).
   상세와 측정 근거는 [`DESIGN.md`](./DESIGN.md) §5
   - `pnpm fonts:build` (로컬, Python) / `pnpm fonts:check` (CI, 순수 Node)
   - 폴백 메트릭 정합으로 스왑 CLS 0
2. **번들 예산 게이트** — 빌드 HTML 기준 gzip 합산, `noModule` 제외, 인라인 스크립트 포함
3. **Playwright** — `astro preview` 가 Astro 7 부터 데몬화되어 webServer 로 못 쓴다.
   `tools/ci/serve-dist.mjs` 로 포그라운드 정적 서버를 두고, 어댑터 설정에서
   리다이렉트를 읽어 프로덕션과 같게 동작시킨다
4. **접근성** — axe (wcag2a/2aa/21a/21aa) 전 라우트 + 다크모드, 키보드 순회, 포커스 가시성,
   reduced-motion, 헤딩 레벨
5. **시각회귀** — 3페이지 × 라이트/다크 스냅샷, 4개 폭 오버플로 검사
   - ⚠️ 스냅샷은 `@snapshot` 태그로 **CI 에서 제외**한다. Playwright 가 플랫폼별로
     저장하는데 폰트 래스터라이징이 macOS/Linux 에서 달라 베이스라인을 공유할 수 없다.
     Linux 베이스라인이 필요하면 공식 Playwright 도커 이미지로 생성한다.
6. **CI** — `.github/workflows/ci.yml`

### 이 Phase 가 실제로 잡아낸 것

게이트를 형식적으로 통과시킨 게 아니라 **진짜 버그를 4종 찾아냈다.**

| 발견 | 내용 |
|---|---|
| **색 대비 미달 4건** | 눈으로 고른 토큰 명도가 AA 미달 (`ink-faint` 2.77:1 등). WCAG 계산으로 재산정 |
| **Shiki 기본 테마 미달** | `github-light` 주황 토큰이 흰 배경에서도 3.49:1 → high-contrast 변형으로 교체 |
| **`ch` 단위 오용** | 컨테이너에 `max-width: 20ch` 를 걸어 대제목이 단어 중간에서 잘림 |
| **opacity 로 상태 표현** | 번역 없음을 `opacity: 0.3` 으로 표시 → 대비 1.46. 취소선으로 교체 |

### DoD 결과

- [x] `pnpm check:budget` 통과 (예산 상향 없이 — 본문 2.2KB / 예산 15KB)
- [x] 폰트 총 다운로드 178KB < 250KB, 스왑 CLS 0, 폰트 차단해도 레이아웃 유지
- [x] axe 위반 **0** (라이트·다크 양쪽)
- [x] 키보드만으로 순회 가능, 포커스 링 보임
- [x] `prefers-reduced-motion` 에서 모션 정지
- [x] 320/768/1024/1440 가로 오버플로 0
- [x] 시각회귀 스냅샷 6종 생성
- [x] CI 가 PR 에서 자동 실행됨
- [ ] Lighthouse CI — **Phase 6 으로 이월** (배포 URL 필요)

---

## Phase 6 — 배포 · 분석 · 발행 연동

### 작업

1. 커스텀 도메인 연결, HTTPS 확인
2. `@vercel/analytics` + `@vercel/speed-insights`
3. Google Search Console 등록, 사이트맵 제출
4. AI 리퍼러 세그먼트 설정 (`chatgpt.com`, `perplexity.ai`, `claude.ai`, `copilot.microsoft.com`, `gemini.google.com`)
5. Vercel 로그에서 AI 크롤러 UA 확인 절차 문서화
6. **`blog-publisher` 연동 검증** — MCP로 초안 생성 → PR → Preview URL → 발행까지 왕복 1회 성공
7. 보안 헤더 (`vercel.json` 또는 어댑터 설정): HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`
8. Rich Results Test 통과 확인 (Phase 4 이월)

### DoD

- [ ] 프로덕션 도메인에서 전 라우트 정상
- [ ] Search Console 색인 요청 완료
- [ ] Speed Insights에 필드 데이터 수집 시작
- [ ] **`blog-publisher` 로 초안 1건을 실제로 발행 완료**
- [ ] 보안 헤더가 응답에 실림 (`curl -I` 확인)

---

## 테스트 전략

| 층 | 도구 | 우선순위 | 대상 |
|---|---|:---:|---|
| 유닛 | vitest | **최상** | `lib/content/` 쿼리·draft 필터·목차 추출, `lib/seo/` hreflang. **`astro:content` 는 모킹** — 실제 글에 의존하면 글 추가마다 깨진다 |
| 접근성 | Playwright + axe | 상 | 전 주요 라우트 |
| 시각회귀 | Playwright 스크린샷 | 중 | 8종 조합 |
| 성능 | Lighthouse CI + `check:budget` | 중 | 본문 라우트 |

**커버리지 80% 목표는 `src/lib/` 에 적용한다.** 페이지 컴포넌트는 시각회귀·a11y 테스트로 커버한다 — 마크업 단정문은 깨지기 쉽고 신호가 약하다.

**반드시 유닛 테스트로 고정할 것 (조용히 깨졌을 때 피해가 큼):**
1. draft 필터링 — 새면 미완성 글이 색인된다
2. hreflang 생성 — 없는 번역을 가리키면 SEO 손해
3. sitemap/RSS/llms.txt의 draft 제외

---

## 진행 순서 요약

```
[완료] 0 부트스트랩 → 1 콘텐츠 → 2 i18n·라우팅 → 3 디자인 → 4 SEO/GEO → 5 폰트·접근성·시각회귀
[남음] 6 배포 · 분석 · 발행 연동
```

**다음에 할 일은 Phase 6 이다.** 도메인·Vercel 연결, Search Console, 분석,
그리고 `blog-publisher` 와의 실제 발행 왕복 검증. Lighthouse CI 는 배포 URL 이 필요해
Phase 6 으로 이월했다.

남은 리스크는 성능이 아니라 **운영**이다 — 글이 실제로 계속 나가는가.
