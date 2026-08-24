import { z } from "zod";

/**
 * docs/CONTENT-CONTRACT.md 의 실행 가능한 구현체.
 *
 * ★ 이 파일은 blog-publisher 저장소의 스키마와 반드시 일치해야 한다.
 *   한쪽만 바꾸면 발행이 조용히 깨진다. 변경 시 계약 버전을 올리고 양쪽을 함께 수정할 것.
 */
export const CONTRACT_VERSION = "1.0.0";

export const LOCALES = ["ko", "en"] as const;
export const DEFAULT_LOCALE = "ko" satisfies (typeof LOCALES)[number];

export const CATEGORIES = [
  "troubleshooting",
  "insight",
  "note",
  "retrospective",
] as const;

export const LocaleSchema = z.enum(LOCALES);

/** 슬러그 — 로케일 무관 공통. 길이 제한이 산문에만 있으면 검증을 통과해 버린다. */
export const SlugSchema = z
  .string()
  .min(3)
  .max(80)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "슬러그는 소문자 영숫자와 하이픈만 사용합니다 (예: nextjs-hydration-mismatch)",
  );

const IsoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "날짜는 YYYY-MM-DD 형식이어야 합니다");

const TagSchema = z
  .string()
  .regex(/^[a-z0-9-]+$/, "태그는 소문자 영숫자와 하이픈만 사용합니다");

export const CoverSchema = z.object({
  src: z.string().startsWith("/images/", "자산 경로는 /images/ 로 시작해야 합니다"),
  // 접근성 + SEO. cover가 있으면 alt는 선택이 아니다.
  alt: z.string().min(1, "cover에는 alt 텍스트가 필요합니다"),
});

export const PostFrontmatterSchema = z.object({
  // ---- 필수 ----
  title: z.string().min(1).max(120),
  description: z
    .string()
    .min(50, "description은 최소 50자입니다. 짧으면 검색 결과에서 의미가 없습니다")
    .max(300),
  date: IsoDateSchema,
  draft: z.boolean(),

  // ---- 선택 ----
  slug: SlugSchema.optional(),
  updated: IsoDateSchema.optional(),
  summary: z.string().max(500).optional(),
  tags: z.array(TagSchema).max(8).default([]),
  category: z.enum(CATEGORIES).optional(),
  canonical: z.url().optional(),
  series: z.string().optional(),
  related: z.array(SlugSchema).max(5).default([]),
  cover: CoverSchema.optional(),
});

/** 케이스 스터디가 링크하는 외부 자료 — 공개 저장소·배포된 사이트. */
export const WorkLinkSchema = z.object({
  label: z.string().min(1).max(40),
  url: z.url(),
});

/**
 * 케이스 스터디(work) 프론트매터 — docs/PORTFOLIO.md §6-1 의 구현체.
 *
 * 글(posts)과 공유하는 필드는 같은 규칙을 쓴다. 두 스키마가 갈리면
 * 같은 개념을 다르게 검증하게 되고 렌더러를 재사용할 수 없다.
 *
 * `category` 와 `series` 는 의도적으로 없다 — 케이스는 편집 분류 대상이 아니다.
 */
export const WorkFrontmatterSchema = z.object({
  // ---- 글과 공통 ----
  title: z.string().min(1).max(120),
  description: z
    .string()
    .min(50, "description은 최소 50자입니다. 짧으면 검색 결과에서 의미가 없습니다")
    .max(300),
  date: IsoDateSchema,
  draft: z.boolean(),
  slug: SlugSchema.optional(),
  updated: IsoDateSchema.optional(),
  summary: z.string().max(500).optional(),
  tags: z.array(TagSchema).max(8).default([]),
  canonical: z.url().optional(),
  cover: CoverSchema.optional(),

  // ---- 케이스 전용 ----
  /** 기여 범위는 역할 언어로 쓴다. "개발자 N명" 같은 인원수는 쓰지 않는다. */
  role: z.string().min(1).max(60),
  period: z.string().min(1).max(40),
  /** 최소 1개 — 스택 없는 케이스 스터디는 읽는 사람에게 쓸모가 없다. */
  stack: z.array(z.string().min(1)).min(1).max(20),
  links: z.array(WorkLinkSchema).max(5).default([]),
});

export type PostFrontmatter = z.infer<typeof PostFrontmatterSchema>;
export type WorkFrontmatter = z.infer<typeof WorkFrontmatterSchema>;
export type WorkLink = z.infer<typeof WorkLinkSchema>;
export type Locale = (typeof LOCALES)[number];
export type Category = (typeof CATEGORIES)[number];

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}
