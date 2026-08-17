# 콘텐츠 계약 (Content Contract)

> **이 문서는 `jiny-log` 와 `blog-publisher` 두 프로젝트의 단일 진실 공급원(single source of truth)이다.**
> 여기 정의된 frontmatter 스키마·파일 경로·슬러그 규칙을 양쪽이 동일하게 구현한다.
> 한쪽만 바꾸면 발행이 조용히 깨진다. **변경 시 반드시 양쪽 저장소를 함께 수정**한다.

- 계약 버전: `1.0.0`
- 최종 수정: 2026-08-17
- 소비자: `blog-publisher` (쓰기), `jiny-log` (읽기·렌더링)

---

## 1. 파일 경로 규약

```
jiny-log/
├── content/
│   └── posts/
│       ├── ko/
│       │   └── <slug>.mdx
│       └── en/
│           └── <slug>.mdx
└── public/
    └── images/
        └── <slug>/
            ├── cover.webp
            └── <asset-name>.<ext>
```

**규칙**

| 항목 | 규칙 |
|---|---|
| 포스트 파일 | `content/posts/<locale>/<slug>.mdx` |
| `<locale>` | `ko` \| `en` 둘 중 하나. 이 외의 값은 거부 |
| 확장자 | `.mdx` 고정. `.md` 는 받지 않는다 |
| 자산 디렉터리 | `public/images/<slug>/` — 포스트 슬러그와 1:1 |
| 자산 참조 경로 | 본문·frontmatter에서는 `/images/<slug>/<name>.<ext>` (public 기준 절대경로) |
| 쓰기 허용 경로 | **`content/posts/` 와 `public/images/` 뿐.** `blog-publisher` 는 이 두 프리픽스 밖의 어떤 경로에도 쓰지 않는다 (§6) |

---

## 2. 슬러그 규칙

**슬러그는 로케일에 무관하게 동일하다.** 같은 글의 ko/en 버전은 같은 슬러그를 공유하며, 이것이 두 언어를 잇는 유일한 키다. 별도의 `translationKey` 필드를 두지 않는다.

```
content/posts/ko/nextjs-hydration-mismatch.mdx   ← 같은 글
content/posts/en/nextjs-hydration-mismatch.mdx   ← 같은 글

→ /ko/posts/nextjs-hydration-mismatch
→ /en/posts/nextjs-hydration-mismatch
```

**형식 제약**

- 정규식: `^[a-z0-9]+(?:-[a-z0-9]+)*$`
- **항상 ASCII.** 한국어 제목이라도 슬러그는 영문으로 짓는다. 한글 슬러그는 URL 인코딩되어 공유·인용 시 깨지고, AI 크롤러가 참조하기에도 불리하다.
- 길이 3–80자
- 날짜 프리픽스를 붙이지 않는다 (`2026-08-17-foo` ❌). 날짜는 frontmatter에만 둔다.

**자동 생성 규칙** (`blog-publisher` 의 `generate_slug`)

1. 영문 제목이 있으면 그것을 소문자화 → 영숫자 외 문자를 `-` 로 치환 → 연속 `-` 축약 → 앞뒤 `-` 제거
2. 한국어 제목뿐이면 자동 음차하지 않는다. **호출자에게 영문 슬러그를 요구**한다 (음차 슬러그는 검색·인용 가치가 낮다)
3. 생성 후 기존 슬러그와 충돌하면 도구가 충돌 사실을 반환한다. **말없이 `-2` 를 붙이지 않는다**

---

## 3. Frontmatter 스키마

`content/posts/<locale>/<slug>.mdx` 상단의 YAML 블록.

```ts
import { z } from "zod";

/** 슬러그 — 로케일 무관 공통. §2의 형식 제약을 그대로 실행 가능한 형태로 옮긴 것 */
export const Slug = z
  .string()
  .min(3)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const PostFrontmatterSchema = z.object({
  // ---- 필수 ----
  title:       z.string().min(1).max(120),
  description: z.string().min(50).max(300),
  date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  draft:       z.boolean(),

  // ---- 선택 ----
  slug:        Slug.optional(),
  updated:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  summary:     z.string().max(500).optional(),
  tags:        z.array(z.string().regex(/^[a-z0-9-]+$/)).max(8).default([]),
  category:    z.enum(["troubleshooting", "insight", "note", "retrospective"]).optional(),
  canonical:   z.string().url().optional(),
  series:      z.string().optional(),
  related:     z.array(Slug).max(5).default([]),   // 관련 글 슬러그 — 임의 문자열 아님
  cover: z
    .object({
      src: z.string().startsWith("/images/"),
      alt: z.string().min(1),
    })
    .optional(),
});
```

> `Slug` 는 `blog-publisher` 도 동일하게 정의한다. 길이 제한(3–80)이 §2 산문에만 있고 스키마에 없으면 검증을 통과해 버린다 — 규칙은 실행 가능한 형태로 존재해야 한다.

### 필드별 규약

| 필드 | 필수 | 누가 채우는가 | 비고 |
|---|:---:|---|---|
| `title` | ✅ | 작성자 | 해당 로케일 언어로. ko 파일은 한국어 제목 |
| `description` | ✅ | 작성자 | meta description. **50자 미만이면 검증 실패** — SEO상 너무 짧으면 무의미하고, 짧게 쓸 바엔 안 쓰느니만 못하다 |
| `date` | ✅ | 서버 자동 (미지정 시 오늘) | 최초 발행일. **이후 절대 변경 금지** |
| `draft` | ✅ | 서버 강제 | 생성 시 **항상 `true`**. `false` 로의 전환은 `publish_post` 만 가능 (§6) |
| `slug` | ➖ | 서버 유도 | 생략 시 파일명에서 취한다. 명시되면 파일명과 일치해야 하며 불일치는 검증 실패 |
| `updated` | ➖ | **서버 자동** | `update_post` 호출 시 서버가 오늘 날짜로 각인. **호출자가 보낸 값은 무시**한다 |
| `summary` | ➖ | 작성자 | 본문 상단에 렌더링되는 TL;DR. GEO 핵심 자산 — 2~4문장, 그 자체로 완결된 답이어야 한다. `description` 과 별개 |
| `tags` | ➖ | 작성자 | 소문자 kebab-case. 최대 8개 |
| `category` | ➖ | 작성자 | 열거형 4종 고정. 자유 문자열 금지 |
| `canonical` | ➖ | 작성자 | 타 플랫폼 교차 게시 시에만 |
| `series` | ➖ | 작성자 | 시리즈 식별자 (kebab-case 권장). **v1 에서는 렌더되지 않는다** — 값만 보관 |
| `related` | ➖ | 작성자 | 관련 글 **슬러그** 배열. 존재하지 않는 슬러그는 검증 경고 |
| `cover.alt` | 조건부 ✅ | 작성자 | **`cover` 가 있으면 `alt` 필수.** 빈 문자열 불가. 접근성 + SEO |

> **`cover`** 는 본문 리드 이미지(제목 아래)와 OG 이미지 배경으로 렌더된다.
> 치수는 빌드 타임에 실제 파일에서 읽으므로 frontmatter 에 적지 않는다.
> **파일이 없거나 `alt` 가 없으면 빌드가 실패한다.**
>
> **⚠️ `series` 는 v1 에서 렌더되지 않는다** — 시리즈 인덱스가 v2 범위라 값만 보관한다.
> 상세는 [`POST-TEMPLATE.md`](./POST-TEMPLATE.md) §1.

### 예시

```yaml
---
title: "Next.js 16에서 hydration mismatch가 나는 진짜 이유"
description: "서버와 클라이언트의 렌더 결과가 갈리는 대표 원인 4가지와, 각각을 어떻게 특정하고 고치는지 실제 스택트레이스로 정리한다."
date: "2026-08-17"
updated: "2026-08-20"
draft: false
summary: "hydration mismatch의 90%는 Date/random/locale/브라우저 전용 API 중 하나다. React 19는 실패한 DOM 노드를 에러에 직접 찍어주므로, 먼저 콘솔의 diff를 읽고 원인을 특정한 뒤 useEffect 지연 또는 suppressHydrationWarning으로 좁혀 해결한다."
tags: ["nextjs", "react", "hydration", "ssr"]
category: "troubleshooting"
series: "nextjs-debugging"
related: ["react-19-server-components-basics"]
cover:
  src: "/images/nextjs-hydration-mismatch/cover.webp"
  alt: "브라우저 콘솔에 출력된 React hydration mismatch 에러 메시지"
---
```

---

## 4. 본문(body) 규약

- frontmatter 아래는 **MDX**. 표준 마크다운 + 아래 허용 컴포넌트.
- **H1(`#`) 금지.** 페이지 제목은 `title` 에서 렌더링된다. 본문 최상위 헤딩은 `##` 부터.
- 헤딩은 건너뛰지 않는다 (`##` → `####` ❌).
- 코드 블록에는 **반드시 언어 태그**를 붙인다. 파일명이 있으면 `\`\`\`ts title="src/lib/foo.ts"`.
- 이미지는 `/images/<slug>/...` 절대경로. 외부 핫링크 금지.

**허용 MDX 컴포넌트** (이 목록 밖의 컴포넌트를 쓰면 빌드 실패)

| 컴포넌트 | 용도 |
|---|---|
| `<Callout type="info\|warn\|danger">` | 주의/경고 박스 |
| `<Figure src alt caption>` | 캡션 있는 이미지 |
| `<Aside>` | 측주(margin note) |
| `<Details summary>` | 접히는 보조 설명 |

작성 스타일 규칙(answer-first, 질문형 헤딩 등)은 [`WRITING-GUIDE.md`](./WRITING-GUIDE.md) 참조.

---

## 5. 번역·폴백 정책

- **글의 존재 단위는 (slug, locale) 쌍이다.** ko만 있고 en이 없는 글이 정상 상태다.
- 인덱스 페이지는 **해당 로케일에 실제 존재하는 글만** 나열한다. 번역 없는 글을 원문으로 끼워 넣지 않는다.
- `/en/posts/<slug>` 가 없는데 요청되면 **404**를 반환한다. `/ko/` 로 리다이렉트하지 않는다 — 언어가 다른 페이지로 보내는 리다이렉트는 SEO상 유해하고 사용자에게도 혼란이다.
- `hreflang` 은 **실제 존재하는 로케일만** 상호 링크한다. 없는 번역을 가리키는 hreflang은 넣지 않는다.
- 두 로케일이 모두 있으면 각자 자기 자신을 `canonical` 로 한다. 한쪽을 다른 쪽의 canonical로 지정하지 않는다.

---

## 6. 상태 전이 (blog-publisher가 지켜야 할 불변식)

```
         create_draft
   (없음) ──────────────▶ draft: true   ── publish_post ──▶ draft: false
                              ▲                                  │
                              └────────── unpublish_post ─────────┘

   update_post: draft 상태를 바꾸지 않는다. 본문/메타만 수정하고 updated 를 각인.
   delete_post: 파일 삭제. draft/published 무관하게 최종 수단.
```

**불변식**

1. `create_draft` 는 **항상** `draft: true` 로 쓴다. 입력에 `draft: false` 가 와도 무시한다.
2. `draft: true → false` 전이는 **오직 `publish_post`** 를 통해서만 일어난다. 다른 도구가 이 전이를 수행하면 계약 위반이다.
3. `update_post` 는 `date` 를 절대 바꾸지 않고, `updated` 를 서버 시각으로 덮어쓴다.
4. 쓰기 계열 도구는 커밋 전에 **반드시** `PostFrontmatterSchema` 검증을 통과시킨다. 검증 없이 커밋에 도달하는 경로가 있으면 안 된다.
5. 쓰기 경로는 `content/posts/` 또는 `public/images/` 프리픽스여야 한다. **경로 검사는 도구 입력을 믿지 않고 핸들러 내부에서 정규화 후 수행**한다 (`../` 이탈 차단).

---

## 7. 렌더링 측(jiny-log)이 보장할 것

- frontmatter 파싱·검증은 **`src/lib/content/` 레이어 안에서만** 수행한다. 페이지 컴포넌트가 raw frontmatter를 직접 만지지 않는다.
- `draft: true` 인 글은 **프로덕션 빌드에서 완전히 제외**된다. 목록·사이트맵·RSS·`llms.txt`·raw markdown 라우트 어디에도 나타나지 않는다. 개발 서버(`NODE_ENV !== "production"`)에서만 보인다.
- 스키마 검증 실패는 **빌드 실패**로 처리한다. 경고 후 통과시키지 않는다 — 깨진 메타데이터로 배포되면 SEO 손해가 조용히 누적된다.

---

## 8. 계약 변경 절차

1. 이 문서의 계약 버전을 올린다 (semver: 필드 추가=minor, 필수화/삭제/의미변경=major).
2. `jiny-log` 의 Zod 스키마와 `blog-publisher` 의 스키마를 **같은 커밋 흐름 안에서** 갱신한다.
3. **필드를 필수로 승격하거나 삭제할 때**는 기존 글 전체 마이그레이션이 선행되어야 한다. 기존 글이 깨진 채로 필수 필드를 추가하지 않는다.
4. `blog-publisher` 는 시작 시 자신이 구현한 계약 버전을 로그로 남긴다. 향후 불일치 진단에 쓴다.
