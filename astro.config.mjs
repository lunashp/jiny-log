// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";
import { unified } from "@astrojs/markdown-remark";
import tailwindcss from "@tailwindcss/vite";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";

const SITE_URL = process.env.PUBLIC_SITE_URL ?? "http://localhost:4321";

export default defineConfig({
  site: SITE_URL,
  output: "static",
  adapter: vercel(),

  /**
   * 기본 로케일에도 프리픽스를 붙인다 (prefixDefaultLocale: true).
   * 프리픽스 유무가 섞이면 같은 글이 두 URL로 접근 가능해지고
   * canonical·hreflang·사이트맵이 전부 지저분해진다.
   */
  i18n: {
    defaultLocale: "ko",
    locales: ["ko", "en"],
    routing: {
      prefixDefaultLocale: true,
      // Astro 내장 리다이렉트는 meta refresh 페이지를 만든다.
      // 아래 `redirects` 로 진짜 308 을 내보내는 편이 낫다 (Vercel 어댑터가 처리).
      redirectToDefaultLocale: false,
    },
  },

  /** `/` → `/ko` 진짜 HTTP 리다이렉트. 프리픽스 없는 URL이 콘텐츠를 서빙하지 않는다. */
  redirects: {
    "/": { status: 308, destination: "/ko" },
  },

  integrations: [
    mdx(),
    sitemap({
      i18n: { defaultLocale: "ko", locales: { ko: "ko-KR", en: "en-US" } },
      // draft 글은 라우트 자체가 생성되지 않으므로 사이트맵에도 나타나지 않는다.
      filter: (page) => !page.includes("/tags/"),
    }),
  ],

  markdown: {
    // Astro 7 부터 remarkPlugins/rehypePlugins 직접 지정은 deprecated —
    // unified() 프로세서에 넘긴다.
    processor: unified({
      remarkPlugins: [remarkGfm],
      rehypePlugins: [
        rehypeSlug,
        [
          rehypeAutolinkHeadings,
          { behavior: "wrap", properties: { className: "heading-anchor" } },
        ],
      ],
    }),
    shikiConfig: {
      // 두 테마를 함께 굽는다. CSS 변수로 전환하므로 런타임 JS가 필요 없다.
      themes: {
        // 고대비 변형을 쓴다 — 기본 github-light 은 주황(#e36209) 토큰이
        // 흰 배경에서도 3.49:1 로 AA 미달이다.
        light: "github-light-high-contrast",
        dark: "github-dark-high-contrast",
      },
      // defaultColor: false 로 두면 Astro 가 --shiki-light / --shiki-dark 를 심는다.
      defaultColor: false,
      wrap: false,
    },
  },

  vite: {
    plugins: [tailwindcss()],
  },

  build: {
    // 자산 파일명에 해시를 넣어 장기 캐시가 안전해진다.
    assets: "_assets",
  },
});
