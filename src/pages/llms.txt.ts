import type { APIRoute } from "astro";

import { LOCALES, getPosts } from "@/lib/content";
import { SITE_URL, postMarkdownUrl } from "@/lib/seo/site";

/**
 * llms.txt (docs/SEO-GEO.md §5-2).
 *
 * 정직한 평가: 효능 근거가 갈린다. 채택 이유는 "효과가 증명돼서"가 아니라
 * "비용이 30분이고 downside가 0이라서"다. 전략의 축으로 취급하지 않는다.
 *
 * ★ 링크는 HTML이 아니라 .md 라우트를 가리킨다 — 읽는 주체가 곧바로
 *   본문 텍스트에 도달하게 하는 것이 핵심이다.
 */
const SECTION_TITLE: Record<(typeof LOCALES)[number], string> = {
  ko: "Posts (Korean)",
  en: "Posts (English)",
};

export const GET: APIRoute = async () => {
  const lines: string[] = [
    "# jiny log (지니로그)",
    "",
    "> Engineering insights and troubleshooting notes, written in Korean and English.",
    "> Each post states its conclusion first and pins the versions it was verified against.",
    "",
    `Site: ${SITE_URL}`,
    "",
  ];

  for (const locale of LOCALES) {
    const posts = await getPosts(locale);
    if (posts.length === 0) continue;

    lines.push(`## ${SECTION_TITLE[locale]}`, "");
    for (const post of posts) {
      lines.push(
        `- [${post.title}](${postMarkdownUrl(locale, post.slug)}): ${post.description}`,
      );
    }
    lines.push("");
  }

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
