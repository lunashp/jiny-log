import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * 케이스 스터디(work) 컬렉션 쿼리의 불변식.
 *
 * 글(posts)과 같은 위험을 공유한다 — draft 가 새면 미완성 케이스가 색인되고,
 * 로케일·슬러그 유도가 어긋나면 URL 과 파일이 갈린다.
 *
 * 모킹은 **컬렉션 이름을 존중한다.** posts 픽스처가 work 쿼리에 섞여 들어오면
 * 테스트가 통과해도 실제로는 격리가 깨진 것을 못 잡는다.
 */

interface Fixture {
  id: string;
  body: string;
  data: Record<string, unknown>;
}

const entry = (
  id: string,
  data: Partial<Fixture["data"]> = {},
  body = "## 무엇을 만들었나\n\n본문",
): Fixture => ({
  id,
  body,
  data: {
    title: `케이스 ${id}`,
    description: "a".repeat(60),
    date: "2026-01-01",
    draft: false,
    role: "단독 개발",
    period: "2026.01 – 2026.02",
    stack: ["TypeScript"],
    tags: [],
    links: [],
    ...data,
  },
});

let workFixtures: Fixture[] = [];
let postFixtures: Fixture[] = [];

vi.mock("astro:content", () => ({
  getCollection: async (name: string, filter?: (e: Fixture) => boolean) => {
    const pool = name === "work" ? workFixtures : postFixtures;
    return filter ? pool.filter(filter) : pool;
  },
}));

const {
  getAllWorks,
  getAvailableWorkLocales,
  getWorkBySlug,
  getWorks,
  isWorkVisible,
} = await import("./work");

beforeEach(() => {
  // 검증하려는 계약은 **프로덕션 동작**이다. vitest 는 기본적으로 DEV=true 라
  // 명시적으로 끄지 않으면 draft 가 보이는 상태를 테스트하게 된다.
  vi.stubEnv("DEV", false);

  workFixtures = [
    entry("ko/alpha", { date: "2026-03-01" }),
    entry("en/alpha", { date: "2026-03-01" }),
    entry("ko/beta", { date: "2026-05-01" }),
    entry("ko/hidden", { date: "2026-06-01", draft: true }),
  ];
  // work 쿼리가 posts 를 집어가면 이 픽스처 때문에 실패한다.
  postFixtures = [entry("ko/not-a-case", { date: "2026-09-09" })];
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isWorkVisible", () => {
  it("프로덕션에서 draft 를 숨긴다", () => {
    expect(isWorkVisible(true, false)).toBe(false);
  });

  it("프로덕션에서 공개 케이스를 보여준다", () => {
    expect(isWorkVisible(false, false)).toBe(true);
  });

  it("개발 서버에서는 draft 도 보여준다", () => {
    expect(isWorkVisible(true, true)).toBe(true);
  });
});

describe("getWorks", () => {
  it("해당 로케일의 공개 케이스만 최신순으로 반환한다", async () => {
    const works = await getWorks("ko");
    expect(works.map((w) => w.slug)).toEqual(["beta", "alpha"]);
  });

  it("다른 로케일을 섞지 않는다", async () => {
    const works = await getWorks("en");
    expect(works.map((w) => w.slug)).toEqual(["alpha"]);
  });

  it("posts 컬렉션을 집어오지 않는다", async () => {
    const works = await getWorks("ko");
    expect(works.map((w) => w.slug)).not.toContain("not-a-case");
  });

  it("work 전용 필드를 그대로 실어 보낸다", async () => {
    const [first] = await getWorks("ko");
    expect(first?.role).toBe("단독 개발");
    expect(first?.stack).toEqual(["TypeScript"]);
  });
});

describe("getAllWorks", () => {
  it("전 로케일의 공개 케이스를 반환한다", async () => {
    const works = await getAllWorks();
    expect(works).toHaveLength(3);
    expect(works.some((w) => w.draft)).toBe(false);
  });
});

describe("getWorkBySlug", () => {
  it("로케일과 슬러그로 케이스를 찾는다", async () => {
    const work = await getWorkBySlug("ko", "beta");
    expect(work?.title).toBe("케이스 ko/beta");
  });

  it("없는 슬러그면 undefined 를 반환한다", async () => {
    expect(await getWorkBySlug("ko", "nope")).toBeUndefined();
  });

  it("draft 는 프로덕션에서 찾히지 않는다", async () => {
    expect(await getWorkBySlug("ko", "hidden")).toBeUndefined();
  });

  it("본문에서 헤딩을 추출한다", async () => {
    const work = await getWorkBySlug("ko", "beta");
    expect(work?.headings.map((h) => h.text)).toContain("무엇을 만들었나");
  });
});

describe("getAvailableWorkLocales", () => {
  it("실제 번역이 있는 로케일만 반환한다", async () => {
    await expect(getAvailableWorkLocales("alpha")).resolves.toEqual(["en", "ko"]);
  });

  it("한 로케일만 있으면 그것만 반환한다", async () => {
    await expect(getAvailableWorkLocales("beta")).resolves.toEqual(["ko"]);
  });

  it("draft 만 있는 슬러그는 빈 배열을 반환한다", async () => {
    await expect(getAvailableWorkLocales("hidden")).resolves.toEqual([]);
  });
});

describe("경로 계약", () => {
  it("로케일 디렉터리가 아니면 빌드를 실패시킨다", async () => {
    workFixtures = [entry("alpha")];
    await expect(getAllWorks()).rejects.toThrow(/잘못된 케이스 경로/);
  });

  it("frontmatter slug 가 파일명과 다르면 빌드를 실패시킨다", async () => {
    workFixtures = [entry("ko/alpha", { slug: "different" })];
    await expect(getAllWorks()).rejects.toThrow(/slug 불일치/);
  });
});
