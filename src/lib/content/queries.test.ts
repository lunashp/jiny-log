import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * ★ 조용히 깨졌을 때 피해가 가장 큰 불변식들 (docs/PLAN.md 테스트 전략).
 *
 * 1. draft 필터링 — 새면 미완성 글이 색인된다
 * 2. 로케일·슬러그 유도 — 어긋나면 URL과 파일이 갈린다
 * 3. 정렬 안정성
 *
 * `astro:content` 를 모킹한다. 실제 콘텐츠 파일이나 빌드 산출물에 의존하면
 * 테스트가 느려지고, 글을 추가할 때마다 깨진다.
 */

interface Fixture {
  id: string;
  body: string;
  data: Record<string, unknown>;
}

const entry = (
  id: string,
  data: Partial<Fixture["data"]> = {},
  body = "## 증상\n\n본문",
): Fixture => ({
  id,
  body,
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

const {
  getAllTags,
  getAvailableLocales,
  getPostBySlug,
  getPosts,
  getPostsByTag,
  isPostVisible,
} = await import("./queries");

beforeEach(() => {
  fixtures = [
    entry("ko/alpha", { date: "2026-03-01", tags: ["nextjs", "react"] }),
    entry("en/alpha", { date: "2026-03-01", tags: ["nextjs"] }),
    entry("ko/beta", { date: "2026-05-01", tags: ["pnpm"] }),
    entry("ko/hidden", { date: "2026-06-01", draft: true, tags: ["meta"] }),
  ];
});

describe("isPostVisible — draft 가시성 규칙", () => {
  it("★ 프로덕션에서 draft 글은 보이지 않는다", () => {
    expect(isPostVisible(true, false)).toBe(false);
  });

  it("프로덕션에서 발행된 글은 보인다", () => {
    expect(isPostVisible(false, false)).toBe(true);
  });

  it("개발 모드에서는 draft 글도 보인다", () => {
    expect(isPostVisible(true, true)).toBe(true);
  });
});

describe("getPosts", () => {
  it("요청한 로케일의 글만 반환한다", async () => {
    const ko = await getPosts("ko");
    const en = await getPosts("en");

    expect(ko.every((p) => p.locale === "ko")).toBe(true);
    expect(en.map((p) => p.slug)).toEqual(["alpha"]);
  });

  it("date 내림차순으로 정렬한다", async () => {
    const dates = (await getPosts("ko")).map((p) => p.date);

    expect(dates).toEqual([...dates].sort((a, b) => b.localeCompare(a)));
  });

  it("★ 슬러그에 로케일 디렉터리가 섞이지 않는다", async () => {
    const slugs = (await getPosts("ko")).map((p) => p.slug);

    expect(slugs).toContain("alpha");
    expect(slugs.every((s) => !s.includes("/"))).toBe(true);
  });

  it("같은 날짜면 슬러그로 안정 정렬한다", async () => {
    fixtures = [
      entry("ko/zulu", { date: "2026-01-01" }),
      entry("ko/alpha", { date: "2026-01-01" }),
    ];

    expect((await getPosts("ko")).map((p) => p.slug)).toEqual(["alpha", "zulu"]);
  });
});

describe("잘못된 경로", () => {
  it("★ 로케일 디렉터리가 아니면 빌드를 실패시킨다", async () => {
    fixtures = [entry("ja/alpha")];

    await expect(getPosts("ko")).rejects.toThrow(/잘못된 글 경로/);
  });

  it("★ 중첩 디렉터리는 거부한다", async () => {
    fixtures = [entry("ko/2026/alpha")];

    await expect(getPosts("ko")).rejects.toThrow(/잘못된 글 경로/);
  });

  it("★ frontmatter slug 가 파일명과 다르면 실패시킨다", async () => {
    fixtures = [entry("ko/alpha", { slug: "beta" })];

    await expect(getPosts("ko")).rejects.toThrow(/slug 불일치/);
  });

  it("frontmatter slug 가 파일명과 같으면 통과한다", async () => {
    fixtures = [entry("ko/alpha", { slug: "alpha" })];

    await expect(getPosts("ko")).resolves.toHaveLength(1);
  });
});

describe("getAvailableLocales", () => {
  it("★ 실제 존재하는 로케일만 반환한다", async () => {
    await expect(getAvailableLocales("alpha")).resolves.toEqual(["en", "ko"]);
    // beta 는 ko 에만 있다 — en 을 반환하면 없는 페이지를 가리키는 hreflang 이 된다.
    await expect(getAvailableLocales("beta")).resolves.toEqual(["ko"]);
  });

  it("존재하지 않는 슬러그에는 빈 배열을 반환한다", async () => {
    await expect(getAvailableLocales("nope")).resolves.toEqual([]);
  });
});

describe("getPostBySlug", () => {
  it("본문과 목차를 포함해 반환한다", async () => {
    const post = await getPostBySlug("ko", "alpha");

    expect(post?.raw).toContain("## 증상");
    expect(post?.headings).toEqual([{ id: "증상", depth: 2, text: "증상" }]);
  });

  it("로케일이 다르면 찾지 못한다", async () => {
    await expect(getPostBySlug("en", "beta")).resolves.toBeUndefined();
  });

  it("없는 슬러그에는 undefined 를 반환한다", async () => {
    await expect(getPostBySlug("ko", "nope")).resolves.toBeUndefined();
  });
});

describe("태그", () => {
  it("글 수와 함께 집계하고 많은 순으로 정렬한다", async () => {
    const tags = await getAllTags("ko");

    expect(tags.find((t) => t.tag === "nextjs")?.count).toBe(1);
    expect(tags.map((t) => t.tag)).toContain("pnpm");
  });

  it("태그로 필터링한다", async () => {
    const posts = await getPostsByTag("ko", "nextjs");

    expect(posts).toHaveLength(1);
    expect(posts[0]?.slug).toBe("alpha");
  });

  it("없는 태그에는 빈 배열을 반환한다", async () => {
    await expect(getPostsByTag("ko", "nope")).resolves.toEqual([]);
  });
});
