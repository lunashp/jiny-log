import { expect, test, type Page } from "@playwright/test";

/**
 * 시각회귀 + 반응형 (docs/PLAN.md Phase 5).
 *
 * 스냅샷은 `pnpm test:e2e --update-snapshots` 로 갱신한다.
 * 디자인을 의도적으로 바꿨을 때만 갱신하고, 예상치 못한 diff 는 버그로 본다.
 */

/** 폰트 로드와 진입 애니메이션이 끝난 뒤에 찍어야 스냅샷이 안정적이다. */
async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() =>
    document.getAnimations().every((a) => a.playState === "finished"),
  );
}

const PAGES = [
  { name: "home", path: "/ko" },
  { name: "list", path: "/ko/posts" },
  { name: "post", path: "/ko/posts/nextjs-hydration-mismatch" },
];

const WIDTHS = [320, 768, 1024, 1440];

for (const scheme of ["light", "dark"] as const) {
  for (const target of PAGES) {
    test(`시각회귀 — ${target.name} / ${scheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(target.path);
      await settle(page);

      await expect(page).toHaveScreenshot(`${target.name}-${scheme}.png`, {
        fullPage: true,
        // 폰트 힌팅 차이로 인한 미세한 픽셀 흔들림은 무시한다.
        maxDiffPixelRatio: 0.01,
      });
    });
  }
}

for (const width of WIDTHS) {
  test(`가로 오버플로 없음 — ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/ko/posts/nextjs-hydration-mismatch");
    await settle(page);

    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      const offenders = [...document.querySelectorAll<HTMLElement>("body *")]
        .filter((el) => el.getBoundingClientRect().right > doc.clientWidth + 1)
        .slice(0, 5)
        .map((el) => `${el.tagName.toLowerCase()}.${el.className || "(no class)"}`);
      return { amount: doc.scrollWidth - doc.clientWidth, offenders };
    });

    expect(
      overflow.amount,
      `넘치는 요소: ${overflow.offenders.join(", ")}`,
    ).toBeLessThanOrEqual(0);
  });
}

test("표와 코드블록은 자기 컨테이너 안에서만 스크롤한다", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/ko/posts/nextjs-hydration-mismatch");
  await settle(page);

  // 본문은 넘치지 않는다.
  const docOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(docOverflow).toBeLessThanOrEqual(0);

  // 코드블록 자신은 가로 스크롤이 가능해야 한다.
  const scrollable = await page.evaluate(() =>
    [...document.querySelectorAll("pre.astro-code")].some(
      (el) => el.scrollWidth > el.clientWidth,
    ),
  );
  expect(scrollable).toBe(true);
});

test("1024px 미만에서 트레이스 레일이 가로 스트립으로 접힌다", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 900 });
  await page.goto("/ko/posts/nextjs-hydration-mismatch");
  await settle(page);

  // 정보가 사라지면 안 된다 — 접히되 보여야 한다.
  const rail = page.locator("aside.rail").first();
  await expect(rail).toBeVisible();
  await expect(rail.locator("time").first()).toBeVisible();

  const isRow = await rail.evaluate((el) => getComputedStyle(el).display === "flex");
  expect(isRow).toBe(true);
});

test("본문 measure 가 넓은 화면에서 무한정 늘어나지 않는다", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1000 });
  await page.goto("/ko/posts/nextjs-hydration-mismatch");
  await settle(page);

  const proseWidth = await page.locator(".prose").evaluate((el) => el.clientWidth);
  // 33rem ≈ 528px. 여백이 늘어나는 것이지 본문이 늘어나는 게 아니다.
  expect(proseWidth).toBeLessThan(700);
});

test("★ cover 이미지가 명시적 치수로 렌더되어 CLS 를 만들지 않는다", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/ko/posts/nextjs-hydration-mismatch", { waitUntil: "domcontentloaded" });

  const cls = await page.evaluate(async () => {
    let total = 0;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const e = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
        if (!e.hadRecentInput) total += e.value;
      }
    });
    observer.observe({ type: "layout-shift", buffered: true });
    await document.fonts.ready;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    observer.disconnect();
    return total;
  });

  const img = page.locator(".cover img");
  await expect(img).toBeVisible();

  // width/height 속성이 있어야 브라우저가 자리를 미리 예약한다.
  await expect(img).toHaveAttribute("width", /\d+/);
  await expect(img).toHaveAttribute("height", /\d+/);
  // 히어로는 LCP 후보라 즉시 로드한다.
  await expect(img).toHaveAttribute("loading", "eager");
  await expect(img).toHaveAttribute("fetchpriority", "high");

  expect(cls).toBeLessThan(0.1);
});

test("★ cover 에 의미 있는 alt 가 있다", async ({ page }) => {
  await page.goto("/ko/posts/nextjs-hydration-mismatch");
  await settle(page);

  const alt = await page.locator(".cover img").getAttribute("alt");

  expect(alt).toBeTruthy();
  // "이미지", "cover" 같은 무의미한 alt 를 거른다.
  expect(alt!.length).toBeGreaterThan(10);
});

test("cover 가 없는 글은 히어로 영역 자체가 없다", async ({ page }) => {
  await page.goto("/ko/posts/pnpm-strict-isolation");
  await settle(page);

  await expect(page.locator(".cover")).toHaveCount(0);
});
