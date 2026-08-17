import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * ★ hreflang 이 없는 번역을 가리키면 SEO 손해가 조용히 누적된다.
 *   그래서 "존재하는 것만" 을 테스트로 고정한다.
 */

interface Fixture {
  id: string;
  body: string;
  data: Record<string, unknown>;
}

const entry = (id: string, data: Partial<Fixture["data"]> = {}): Fixture => ({
  id,
  body: "본문",
  data: {
    title: `제목 ${id}`,
    description: "a".repeat(60),
    date: "2026-01-01",
    draft: false,
    tags: [],
    related: [],
    ...data,
  },
});

let fixtures: Fixture[] = [];

vi.mock("astro:content", () => ({
  getCollection: async (_name: string, filter?: (e: Fixture) => boolean) =>
    filter ? fixtures.filter(filter) : fixtures,
}));

const { buildPostHreflang, buildStaticHreflang } = await import("./hreflang");

beforeEach(() => {
  fixtures = [entry("ko/alpha"), entry("en/alpha"), entry("ko/beta")];
});

describe("buildPostHreflang", () => {
  it("양쪽 번역이 있으면 ko/en/x-default 를 모두 낸다", async () => {
    const languages = await buildPostHreflang("alpha");

    expect(Object.keys(languages).sort()).toEqual(["en", "ko", "x-default"]);
    expect(languages["x-default"]).toBe(languages.ko);
  });

  it("★ 번역이 없는 로케일은 포함하지 않는다", async () => {
    const languages = await buildPostHreflang("beta");

    expect(languages).toHaveProperty("ko");
    expect(languages).not.toHaveProperty("en");
  });

  it("★ ko 번역이 없으면 x-default 를 넣지 않는다", async () => {
    fixtures = [entry("en/only-english")];

    const languages = await buildPostHreflang("only-english");

    expect(languages).toHaveProperty("en");
    expect(languages).not.toHaveProperty("x-default");
  });

  it("존재하지 않는 글에는 빈 맵을 낸다", async () => {
    await expect(buildPostHreflang("nope")).resolves.toEqual({});
  });

  it("절대 URL 을 낸다", async () => {
    const languages = await buildPostHreflang("alpha");

    for (const url of Object.values(languages)) {
      expect(url).toMatch(/^https?:\/\//);
    }
  });
});

describe("buildStaticHreflang", () => {
  it("전 로케일 + x-default 를 낸다", () => {
    const languages = buildStaticHreflang("/posts", ["ko", "en"]);

    expect(Object.keys(languages).sort()).toEqual(["en", "ko", "x-default"]);
    expect(languages.ko).toContain("/ko/posts");
    expect(languages.en).toContain("/en/posts");
  });

  it("x-default 는 기본 로케일을 가리킨다", () => {
    const languages = buildStaticHreflang("", ["ko", "en"]);

    expect(languages["x-default"]).toBe(languages.ko);
  });
});
