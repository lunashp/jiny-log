import { defineConfig, devices } from "@playwright/test";

const PORT = 4321;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },

  /**
   * 빌드된 정적 산출물을 검사한다 — dev 서버가 아니다.
   * dev 에서는 draft 글이 보이고 자산 처리도 달라 실제 배포와 다르다.
   */
  webServer: {
    command: `pnpm build && node tools/ci/serve-dist.mjs`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: { PUBLIC_SITE_URL: BASE_URL, PORT: String(PORT) },
  },

  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
  ],
});
