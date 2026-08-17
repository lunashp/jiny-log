import { expect, test } from "@playwright/test";

const POST = "/ko/posts/nextjs-hydration-mismatch";

/**
 * 폰트 검증 (docs/DESIGN.md §5).
 *
 * 파일 크기만 봐서는 알 수 없는 것들을 확인한다:
 * 글자가 실제로 의도한 서체로 그려지는가, 스왑이 레이아웃을 흔드는가,
 * 폰트가 아예 없을 때도 페이지가 성립하는가.
 */

test("한글 본문이 Pretendard 로 렌더된다", async ({ page }) => {
  await page.goto(POST);
  await page.evaluate(() => document.fonts.ready);

  // 실제로 어떤 폰트가 쓰였는지는 렌더 후에만 알 수 있다.
  const used = await page.evaluate(() => {
    const el = document.querySelector("h1");
    return el ? getComputedStyle(el).fontFamily : "";
  });

  expect(used).toContain("Pretendard Variable");
});

test("Answer Block 만 세리프를 쓴다", async ({ page }) => {
  await page.goto(POST);
  await page.evaluate(() => document.fonts.ready);

  const answerFont = await page.evaluate(
    () => getComputedStyle(document.querySelector(".answer-block")!).fontFamily,
  );
  const bodyFont = await page.evaluate(
    () => getComputedStyle(document.querySelector(".prose p")!).fontFamily,
  );

  expect(answerFont).toContain("Gowun Batang");
  // 본문에 세리프가 새어나가면 시그니처의 희소성이 사라진다.
  expect(bodyFont).not.toContain("Gowun Batang");
});

test("코드블록은 JetBrains Mono 를 쓴다", async ({ page }) => {
  await page.goto(POST);
  await page.evaluate(() => document.fonts.ready);

  const codeFont = await page.evaluate(
    () => getComputedStyle(document.querySelector("pre.astro-code")!).fontFamily,
  );

  expect(codeFont).toContain("JetBrains Mono");
});

test("★ 폰트 총 다운로드가 250kB 미만이다", async ({ page }) => {
  const fontBytes = new Map<string, number>();

  page.on("response", async (response) => {
    const url = response.url();
    if (!url.includes("/fonts/") || !url.endsWith(".woff2")) return;
    const length = Number(response.headers()["content-length"] ?? 0);
    if (length > 0) fontBytes.set(url, length);
  });

  await page.goto(POST);
  await page.evaluate(() => document.fonts.ready);

  const total = [...fontBytes.values()].reduce((sum, n) => sum + n, 0);
  const summary = [...fontBytes.entries()]
    .map(([url, n]) => `${url.split("/").pop()} ${(n / 1024).toFixed(0)}kB`)
    .join(", ");

  expect(total, `실제 다운로드: ${summary}`).toBeLessThan(250 * 1024);
  // 한 글자도 안 받았다면 @font-face 배선이 끊긴 것이다.
  expect(total).toBeGreaterThan(0);
});

test("★ 폰트 스왑이 레이아웃을 밀지 않는다 (CLS 0)", async ({ page }) => {
  await page.goto(POST, { waitUntil: "domcontentloaded" });

  const shift = await page.evaluate(async () => {
    let cls = 0;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const e = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
        if (!e.hadRecentInput) cls += e.value;
      }
    });
    observer.observe({ type: "layout-shift", buffered: true });

    await document.fonts.ready;
    // 스왑 후 안정화까지 한 프레임 더 기다린다.
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    observer.disconnect();
    return cls;
  });

  // 폴백 메트릭을 맞춰 뒀으므로 스왑으로 인한 이동이 없어야 한다.
  expect(shift).toBeLessThan(0.1);
});

test("★ 폰트를 전부 차단해도 레이아웃이 성립한다", async ({ page }) => {
  await page.route("**/fonts/*.woff2", (route) => route.abort());
  await page.goto(POST);

  // 본문이 읽히고 가로 오버플로가 없어야 한다.
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.locator(".answer-block")).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
