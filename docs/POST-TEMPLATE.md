# 글 작성 틀 — 화면이 완성되게 쓰는 법

- 작성일: 2026-08-17
- 대상: 글을 쓰는 사람, 그리고 `blog-publisher` 로 초안을 만드는 AI

> **이 문서는 "무엇을 채우면 화면이 어떻게 되는가"를 다룬다.**
> 문체·구조 규칙(answer-first, 질문형 헤딩 등 GEO의 실질)은
> [`WRITING-GUIDE.md`](./WRITING-GUIDE.md) 가 따로 다룬다. 둘 다 읽는다.

---

## 0. 먼저 알아야 할 것: 마크다운만으로는 완성되지 않는다

**필수 필드만 채우면 화면의 절반이 사라진다.** 시그니처 요소가 전부 조건부 렌더이기 때문이다.

| 채운 것 | 결과 |
|---|---|
| `title` + `description` + 본문 | 제목 · 본문 · 발행일. **그게 전부** |
| ＋ `summary` | **Answer Block**(세리프 블록) 등장 |
| ＋ `category` | 카테고리 라벨 + **색 바** 등장 |
| ＋ `tags` | 트레이스 레일이 채워짐 |
| ＋ 본문에 H2 2개 이상 | **목차** 등장 |

코드상 조건은 이렇다:

```
{post.summary && <p class="answer-block">…}      ← summary 없으면 통째로 없음
{post.category && <p class="eyebrow">…}          ← category 없으면 라벨·색 없음
headings.length >= 2 && (…)                      ← 헤딩 부족하면 목차 없음
post.tags.length > 0 && (…)                      ← 태그 없으면 레일이 날짜만
```

**결론: 목업처럼 나오게 하려면 `summary`·`category`·`tags`를 반드시 채우고 본문에 H2를 둔다.**

---

## 1. 필드 → 화면 매핑 (실측 확인)

| 필드 | 필수 | 어디에 나타나는가 |
|---|:---:|---|
| `title` | ✅ | 대제목, 목록, OG 이미지, `<title>` |
| `description` | ✅ | 목록 요약, meta description, OG 이미지, RSS |
| `date` | ✅ | 트레이스 레일, 목록 좌측 날짜, 정렬 기준 |
| `draft` | ✅ | `true` 면 프로덕션에서 **완전히 사라짐** |
| `summary` | ➖ | **★ Answer Block**(세리프), RSS, raw markdown 의 TL;DR |
| `category` | ➖ | **★ 카테고리 라벨 + 색 바**, 목록 eyebrow, OG 이미지 테두리 색 |
| `tags` | ➖ | 트레이스 레일, 목록, 태그 페이지, RSS |
| `updated` | ➖ | 트레이스 레일 (서버가 자동 각인 — 직접 쓰지 않는다) |
| `related` | ➖ | 본문 하단 "함께 읽기" |
| `cover` | ➖ | **본문 리드 이미지**(제목 아래, Answer Block 위) + **OG 이미지 배경** |
| `canonical` | ➖ | `<link rel="canonical">` (교차 게시 시에만) |
| `slug` | ➖ | URL (파일명과 일치해야 함) |

### `cover` 쓰는 법

```yaml
cover:
  src: "/images/<slug>/cover.png"   # public 기준 절대경로
  alt: "이미지 내용을 서술 — 장식이 아니면 필수"
```

| 규칙 | 이유 |
|---|---|
| 파일은 `public/images/<slug>/` 에 둔다 | 계약이 못박은 경로. `upload_asset` 이 여기 쓴다 |
| **`alt` 없으면 빌드 실패** | 접근성 + SEO. 스키마가 강제한다 |
| **파일이 없으면 빌드 실패** | 치수를 못 읽으면 CLS 를 막을 수 없어 세운다 |
| 가로로 넓은 비율(16:9 등) 권장 | OG 이미지 배경으로도 쓰인다 |
| webp/avif 권장 | png/jpg 도 되지만 용량이 크다 |

치수는 **빌드 타임에 실제 파일에서 읽어** `width`/`height` 로 박는다. 직접 적을 필요 없고,
덕분에 이미지가 늦게 도착해도 레이아웃이 밀리지 않는다.

### ⚠️ 받기만 하고 아직 안 쓰는 필드

| 필드 | 상태 |
|---|---|
| `series` | **렌더되지 않는다.** 시리즈 인덱스 페이지가 v2 범위라서 값만 보관 중이다 ([`PRD.md`](./PRD.md) §7) |

---

## 2. 복붙 템플릿 — `troubleshooting` (주력)

```mdx
---
title: "<에러 메시지나 증상이 그대로 들어간 제목>"
description: "<50~300자. 무슨 증상이 왜 생기고 어떻게 고치는지 한 문장. 낚시 금지>"
summary: "<2~4문장. 이것만 읽어도 문제가 해결되게. Answer Block 으로 렌더된다>"
date: "2026-08-17"
draft: true
tags: ["nextjs", "react"]
category: "troubleshooting"
---

## 증상

무엇이 어떻게 잘못되는가. **에러 메시지 전문을 코드블록으로.**

```text
Error: ...
```

## 재현 환경

| 항목 | 버전 |
| --- | --- |
| Next.js | 16.3.1 |
| Node | 24.11.0 |
| 확인일 | 2026-08-17 |

## 왜 이 에러가 나는가

**첫 문장에 원인을 바로 쓴다.** 그다음 근거와 1차 출처 링크.

## 해결

동작하는 코드. 방법이 여럿이면 표로 트레이드오프 비교.

## 왜 이 해결이 맞는가

증상만 덮는 게 아님을 설명. **이 섹션이 스택오버플로 복붙과 갈리는 지점이고
인용 가치가 가장 높다. 빠뜨리지 않는다.**

## 이것도 확인해볼 것

이 글로 해결 안 된 독자를 위한 다음 단서.
```

## 3. 템플릿 — `insight`

```mdx
---
title: "<무엇을 알게 됐는지가 드러나는 제목>"
description: "<50자+ 요약>"
summary: "<핵심 주장 2~4문장>"
date: "2026-08-17"
draft: true
tags: ["pnpm", "nodejs"]
category: "insight"
---

## 무엇을 알게 됐나

결론부터. 첫 문장이 핵심 주장.

## 어떤 상황이었나

맥락은 짧게.

## 왜 그런가

근거·메커니즘.

## 언제 적용되고 언제 안 되나

**경계 조건. 여기가 진짜 가치다.** 조건 없는 주장은 신뢰도가 낮다.

## 정리

표로 요약하면 스캔과 추출 양쪽에 유리하다.
```

## 4. 템플릿 — `note`

짧아도 된다. 다만 **버전·날짜는 예외 없이** 적는다.

```mdx
---
title: "<짧고 구체적인 제목>"
description: "<50자+ — 짧은 글이어도 이건 채워야 빌드가 통과한다>"
summary: "<한두 문장>"
date: "2026-08-17"
draft: true
tags: ["astro"]
category: "note"
---

## 무엇

## 언제 쓰나

## 확인 환경

Astro 7.2.2 / Node 24.11.0 · 2026-08-17 확인
```

---

## 5. `summary` 쓰는 법 — 가장 중요한 필드

**화면에서 가장 눈에 띄고(유일한 세리프), AI가 가장 먼저 집어가는 덩어리다.**

`description` 과 **다르게** 쓴다:

| 필드 | 답하는 질문 | 어디에 쓰이나 |
|---|---|---|
| `description` | **무엇을 다루는 글인가** | 검색 결과, 목록 |
| `summary` | **답이 무엇인가** | Answer Block, AI 인용 |

```
❌ (description 을 복붙) "hydration mismatch 원인과 해결을 정리한다."
   → 답이 없다. 인용해도 쓸모없다.

✅ "hydration mismatch의 대부분은 Date, Math.random, 로케일 포맷,
    브라우저 전용 API 중 하나에서 나온다. React 19는 실패한 DOM 노드를
    에러에 직접 찍어주므로, 먼저 콘솔의 diff를 읽어 원인을 특정한 뒤
    useEffect 지연으로 좁혀 해결한다."
   → 이것만 읽고 나가도 문제가 풀린다.
```

**아까워하지 말고 답을 여기에 쓴다.** 본문을 읽게 만들려고 아끼면 인용도 안 되고 독자도 떠난다.

---

## 6. 본문 규칙 (요약)

전문은 [`WRITING-GUIDE.md`](./WRITING-GUIDE.md). 화면에 직결되는 것만:

| 규칙 | 이유 |
|---|---|
| **H1(`#`) 금지, `##` 부터** | 페이지 제목은 `title` 이 렌더한다. H1 이 둘이면 접근성 테스트가 실패한다 |
| **헤딩 레벨 건너뛰지 않기** (`##` → `####` ❌) | a11y 테스트가 잡는다 |
| **H2 를 2개 이상** | 목차가 렌더되는 조건 |
| **코드블록에 언어 태그 필수** | 하이라이팅 + 라벨 표시 |
| 표는 그대로 써도 됨 | 자기 안에서만 가로 스크롤한다 |
| 이미지는 `/images/<slug>/…` | 외부 핫링크 금지 |

### 허용 컴포넌트 4종

```mdx
<Callout type="info|warn|danger">주의사항</Callout>
<Figure src="/images/foo/a.png" alt="설명" caption="캡션" />
<Aside>곁가지 설명</Aside>
<Details summary="긴 로그">…</Details>
```

- `Callout` 에 **핵심 정보를 넣지 않는다** — 인용 시 잘려나갈 수 있다
- `Details` 의 **접힌 내용은 인용되기 어렵다** — 중요한 건 펼쳐 둔다

---

## 7. 발행 전 체크리스트

**화면 완성도**
- [ ] `summary` 를 채웠는가 (없으면 Answer Block 이 통째로 사라진다)
- [ ] `category` 를 골랐는가 (없으면 색 바가 없다)
- [ ] `tags` 를 1개 이상 달았는가
- [ ] 본문에 H2 가 2개 이상인가 (목차 조건)

**계약**
- [ ] `description` 이 50자 이상인가 (미만이면 **빌드 실패**)
- [ ] 슬러그가 영문 ASCII 인가
- [ ] `cover` 를 넣었다면 `alt` 도 넣었고 파일이 실제로 있는가 (둘 중 하나라도 없으면 빌드 실패)

**내용** ([`WRITING-GUIDE.md`](./WRITING-GUIDE.md) §6)
- [ ] 각 섹션 첫 문장이 그 섹션의 답인가
- [ ] 버전·날짜·환경이 구체적인가
- [ ] 에러 메시지 전문이 코드블록에 있는가
- [ ] "~일 것 같다" 같은 헤지가 남아있지 않은가

**발행 후**
- [ ] `pnpm fonts:check` — 새 글자가 폰트 서브셋에 없으면 실패한다.
      실패하면 `pnpm fonts:build` 후 `public/fonts/` 와 매니페스트를 함께 커밋

---

## 8. 서버가 자동으로 해주는 것 / 안 해주는 것

`blog-publisher` 의 `create_draft` 기준.

| 자동 | 수동 |
|---|---|
| `date` (미지정 시 오늘) | `summary` |
| `draft` (**항상 `true` 강제**) | `category` |
| `slug` (영문 제목에서 유도) | `tags` |
| `updated` (수정 시 서버 시각 각인) | 본문 구조 |
| frontmatter 조립·검증 | `description` |

> **★ 서버는 본문에서 요약을 뽑아내지 않는다.** `summary`·`category`·`tags` 는
> 도구 파라미터로 받는다. 실제로는 **대화 중 Claude 가 그 값을 채워 도구를 호출한다** —
> 서버가 자동화하는 게 아니다.
>
> 이건 의도한 설계다. 서버가 요약을 지어내면 검증할 방법이 없다.
> [`TOOLS.md`](../../blog-publisher/docs/TOOLS.md) §4 는 `generate_post`(내용 생성)를
> **만들지 않을 도구**로 못박아 뒀다. 서버는 운반 도구고, 글은 대화로 쓴다.

### 실무 흐름

```
"방금 고친 hydration 문제 글로 올려줘"
   → Claude 가 대화 맥락에서 본문·summary·category·tags 를 구성
   → create_draft (항상 draft) → PR + 프리뷰 URL
"확인했다, 발행해줘"
   → publish_post → 1~3분 뒤 라이브
```

**"마크다운만 던진다" ≠ "글로 써줘".** 앞은 §0의 최소 화면이 나오고,
뒤는 목업 수준이 나온다.

---

## 9. 참고: 실제 예시

| 파일 | 무엇을 보여주나 |
|---|---|
| `content/posts/ko/nextjs-hydration-mismatch.mdx` | 전 필드를 채운 troubleshooting — **목업 화면** |
| `content/posts/ko/pnpm-strict-isolation.mdx` | insight 템플릿 |
| `content/posts/ko/minimal-example.mdx` | **필수 필드만** — 화면 절반이 비는 대조군 |
| `content/posts/en/nextjs-hydration-mismatch.mdx` | 번역은 직역이 아니라 재작성 |

로컬에서 `pnpm dev` 후 `/ko/posts/minimal-example` 과
`/ko/posts/nextjs-hydration-mismatch` 를 나란히 열어보면 차이가 바로 보인다.
