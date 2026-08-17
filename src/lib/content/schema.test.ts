import { describe, expect, it } from "vitest";

import { PostFrontmatterSchema, SlugSchema, isLocale } from "./schema";

const valid = {
  title: "테스트 글",
  description:
    "이 설명은 50자 이상이어야 검증을 통과합니다. 충분히 길게 적어서 최소 길이 제약을 만족시킵니다.",
  date: "2026-08-17",
  draft: false,
};

describe("PostFrontmatterSchema", () => {
  it("최소 필수 필드로 통과한다", () => {
    expect(PostFrontmatterSchema.safeParse(valid).success).toBe(true);
  });

  it("tags 와 related 는 기본값으로 빈 배열이 된다", () => {
    const parsed = PostFrontmatterSchema.parse(valid);

    expect(parsed.tags).toEqual([]);
    expect(parsed.related).toEqual([]);
  });

  describe("description", () => {
    it("49자는 거부한다", () => {
      const result = PostFrontmatterSchema.safeParse({
        ...valid,
        description: "a".repeat(49),
      });

      expect(result.success).toBe(false);
    });

    it("50자는 통과한다", () => {
      const result = PostFrontmatterSchema.safeParse({
        ...valid,
        description: "a".repeat(50),
      });

      expect(result.success).toBe(true);
    });
  });

  describe("cover", () => {
    it("★ alt 없는 cover 는 거부한다", () => {
      const result = PostFrontmatterSchema.safeParse({
        ...valid,
        cover: { src: "/images/x/cover.webp" },
      });

      expect(result.success).toBe(false);
    });

    it("빈 문자열 alt 도 거부한다", () => {
      const result = PostFrontmatterSchema.safeParse({
        ...valid,
        cover: { src: "/images/x/cover.webp", alt: "" },
      });

      expect(result.success).toBe(false);
    });

    it("/images/ 로 시작하지 않는 src 는 거부한다", () => {
      const result = PostFrontmatterSchema.safeParse({
        ...valid,
        cover: { src: "https://example.com/x.png", alt: "설명" },
      });

      expect(result.success).toBe(false);
    });

    it("올바른 cover 는 통과한다", () => {
      const result = PostFrontmatterSchema.safeParse({
        ...valid,
        cover: { src: "/images/x/cover.webp", alt: "설명" },
      });

      expect(result.success).toBe(true);
    });
  });

  it("열거형 밖의 category 는 거부한다", () => {
    const result = PostFrontmatterSchema.safeParse({ ...valid, category: "essay" });

    expect(result.success).toBe(false);
  });

  it("태그가 9개면 거부한다", () => {
    const result = PostFrontmatterSchema.safeParse({
      ...valid,
      tags: Array.from({ length: 9 }, (_, i) => `tag-${i}`),
    });

    expect(result.success).toBe(false);
  });

  it("대문자 태그는 거부한다", () => {
    const result = PostFrontmatterSchema.safeParse({ ...valid, tags: ["NextJS"] });

    expect(result.success).toBe(false);
  });

  it("잘못된 날짜 형식은 거부한다", () => {
    expect(
      PostFrontmatterSchema.safeParse({ ...valid, date: "2026/08/17" }).success,
    ).toBe(false);
  });
});

describe("SlugSchema", () => {
  it.each([
    ["nextjs-hydration-mismatch", true],
    ["abc", true],
    ["ab", false], // 3자 미만
    ["a".repeat(81), false], // 80자 초과
    ["Next-JS", false], // 대문자
    ["next_js", false], // 언더스코어
    ["하이드레이션", false], // 한글
    ["-leading", false],
    ["trailing-", false],
    ["double--hyphen", false],
  ])("%s → %s", (slug, expected) => {
    expect(SlugSchema.safeParse(slug).success).toBe(expected);
  });
});

describe("isLocale", () => {
  it("ko 와 en 만 통과한다", () => {
    expect(isLocale("ko")).toBe(true);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("ja")).toBe(false);
    expect(isLocale("")).toBe(false);
  });
});
