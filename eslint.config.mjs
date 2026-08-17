import js from "@eslint/js";
import astro from "eslint-plugin-astro";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      ".astro/**",
      ".vercel/**",
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,

  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },

  /**
   * ★ 콘텐츠 파이프라인 격리 (docs/ARCHITECTURE.md §4, CLAUDE.md 규칙 1)
   *
   * `astro:content` 는 src/lib/content/ 와 content.config.ts 안에서만 쓴다.
   * 이 규칙이 없으면 콘텐츠 레이어 교체 비용이 저장소 전체로 번진다.
   */
  {
    files: ["src/**/*.{ts,astro}"],
    ignores: ["src/lib/content/**", "src/content.config.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "astro:content",
              message:
                "astro:content 를 직접 import 하지 마세요. @/lib/content 의 도메인 타입과 쿼리를 사용하세요. (docs/ARCHITECTURE.md §4)",
            },
          ],
        },
      ],
    },
  },

  /** 빌드 스크립트는 Node 환경이고 콘솔 출력이 본업이다. */
  {
    files: ["tools/**/*.mjs", "*.config.mjs", "*.config.ts"],
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        URL: "readonly",
        fetch: "readonly",
        setTimeout: "readonly",
        __dirname: "readonly",
      },
    },
    rules: { "no-console": "off" },
  },
);
