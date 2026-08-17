/// <reference types="vitest/config" />
import { getViteConfig } from "astro/config";

/**
 * Astro 의 Vite 설정을 재사용한다 — `astro:content` 등 가상 모듈과
 * 경로 별칭이 그대로 동작한다.
 */
export default getViteConfig({
  test: {
    include: ["src/**/*.test.ts"],
    coverage: {
      include: ["src/lib/**/*.ts"],
      exclude: ["src/lib/**/*.test.ts"],
      thresholds: { lines: 80, functions: 80, branches: 75, statements: 80 },
    },
  },
});
