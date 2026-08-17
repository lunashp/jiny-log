import type { APIRoute } from "astro";

import { absoluteUrl } from "@/lib/seo/site";

/**
 * AI 크롤러 정책: 전부 허용 (docs/SEO-GEO.md §4).
 *
 * 이 블로그의 목적이 노출과 인용이므로 학습 크롤러(GPTBot, ClaudeBot,
 * Google-Extended)까지 막지 않는다. 정책을 바꾸려면 SEO-GEO.md 의
 * UA 분류표를 참고해 학습/검색 봇을 분리해 제어할 수 있다.
 *
 * robots.txt 는 예의상 신호이지 접근 제어가 아니다. 무시하는 크롤러가 실재한다.
 */
export const GET: APIRoute = () =>
  new Response(
    ["User-agent: *", "Allow: /", "", `Sitemap: ${absoluteUrl("/sitemap-index.xml")}`, ""].join("\n"),
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
