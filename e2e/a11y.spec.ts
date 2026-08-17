import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * 진입 애니메이션이 끝날 때까지 기다린다.
 * 페이드업 중간에 axe 를 돌리면 opacity 0 상태의 텍스트를
 * "대비 1.1" 로 잡아 가짜 위반이 나온다.
 */
async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() =>
    document.getAnimations().every((a) => a.playState === "finished"),
  );
}

/**
 * 접근성 게이트 (docs/PLAN.md Phase 5).
 *
 * 자동 검사 위반 0 이 완료 조건이다. axe 가 잡지 못하는 것(키보드 순회,
 * 포커스 가시성, reduced-motion)은 아래에서 따로 검증한다.
 */

const ROUTES = [
  { name: "홈 (ko)", path: "/ko" },
  { name: "홈 (en)", path: "/en" },
  { name: "글 목록", path: "/ko/posts" },
  { name: "글 본문", path: "/ko/posts/nextjs-hydration-mismatch" },
  { name: "태그", path: "/ko/tags/nextjs" },
];

for (const route of ROUTES) {
  test(`axe 위반 0 — ${route.name}`, async ({ page }) => {
    await page.goto(route.path);
    await settle(page);

    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const summary = violations
      .map(
        (v) =>
          `${v.id} (${v.impact}) ${v.nodes.length}건\n` +
          v.nodes
            .slice(0, 4)
            .map(
              (n) =>
                `    ${n.target.join(" ")} :: ${n.failureSummary?.split("\n")[1]?.trim() ?? ""}`,
            )
            .join("\n"),
      )
      .join("\n");

    expect(violations, summary).toHaveLength(0);
  });
}

test("다크 모드에서도 대비가 기준을 만족한다", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/ko/posts/nextjs-hydration-mismatch");
  await settle(page);

  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2aa"]).analyze();

  expect(
    violations,
    violations
      .map(
        (v) =>
          `${v.id} ${v.nodes.length}건\n` +
          v.nodes
            .slice(0, 6)
            .map(
              (n) =>
                `    ${n.target.join(" ")} :: ${n.failureSummary?.split("\n")[1]?.trim() ?? ""}`,
            )
            .join("\n"),
      )
      .join("\n"),
  ).toHaveLength(0);
});

test("키보드만으로 주요 링크에 도달하고 포커스가 보인다", async ({ page }) => {
  await page.goto("/ko/posts/nextjs-hydration-mismatch");

  // 첫 Tab 은 본문 건너뛰기 링크여야 한다.
  await page.keyboard.press("Tab");
  const skip = page.locator(".skip-link");
  await expect(skip).toBeFocused();

  // 포커스 링이 실제로 그려지는지 — outline: none 이 새어들면 여기서 걸린다.
  const outline = await skip.evaluate((el) => {
    const s = getComputedStyle(el);
    return { width: s.outlineWidth, style: s.outlineStyle };
  });
  expect(outline.style).not.toBe("none");
  expect(parseFloat(outline.width)).toBeGreaterThan(0);

  // 이어지는 Tab 으로 헤더 링크들에 도달한다.
  const reached: string[] = [];
  for (let i = 0; i < 6; i += 1) {
    await page.keyboard.press("Tab");
    reached.push(
      await page.evaluate(() => {
        const el = document.activeElement;
        return el
          ? `${el.tagName.toLowerCase()}:${el.textContent?.trim().slice(0, 12) ?? ""}`
          : "";
      }),
    );
  }

  expect(
    reached.some((r) => r.startsWith("a:")),
    reached.join(" → "),
  ).toBe(true);
  expect(
    reached.some((r) => r.startsWith("button:")),
    reached.join(" → "),
  ).toBe(true);
});

test("prefers-reduced-motion 에서 진입 애니메이션이 멈춘다", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/ko/posts/nextjs-hydration-mismatch");

  const duration = await page.evaluate(() => {
    const el = document.querySelector(".reveal");
    return el ? getComputedStyle(el).animationDuration : "";
  });

  // 0.01ms 로 사실상 즉시 끝나야 한다.
  expect(parseFloat(duration)).toBeLessThan(0.05);
});

test("본문 이미지가 아니어도 문서 구조가 올바르다", async ({ page }) => {
  await page.goto("/ko/posts/nextjs-hydration-mismatch");

  // h1 은 정확히 하나. 본문은 h2 부터 시작한다 (CONTENT-CONTRACT §4).
  await expect(page.locator("h1")).toHaveCount(1);

  const levels = await page.evaluate(() =>
    [...document.querySelectorAll(".prose h1, .prose h2, .prose h3")].map((el) =>
      Number(el.tagName[1]),
    ),
  );

  expect(levels).not.toContain(1);
  // 헤딩 레벨을 건너뛰지 않는다 (h2 → h4 금지).
  for (let i = 1; i < levels.length; i += 1) {
    expect(levels[i]! - levels[i - 1]!).toBeLessThanOrEqual(1);
  }
});
