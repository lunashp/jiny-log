import type { APIRoute } from "astro";

import { getAllFullPosts, type Post } from "@/lib/content";
import { postMarkdownUrl, postUrl } from "@/lib/seo/site";

/**
 * 글별 raw markdown — `/posts/<locale>/<slug>.md` (docs/SEO-GEO.md §5-1).
 *
 * AI 크롤러가 내비게이션·CSS·JS 없이 본문만 가져갈 수 있게 한다.
 * MDX 소스가 이미 있으므로 비용이 거의 0이다.
 *
 * draft 글은 getAllFullPosts 가 이미 걸러내므로 라우트 자체가 생기지 않는다.
 */
export async function getStaticPaths() {
  const posts = await getAllFullPosts();

  return posts.map((post) => ({
    params: { locale: post.locale, slug: post.slug },
    props: { post },
  }));
}

export const GET: APIRoute = ({ props }) => {
  const post = props.post as Post;

  const header = [
    `# ${post.title}`,
    "",
    `> ${post.description}`,
    "",
    `- Source: ${postUrl(post.locale, post.slug)}`,
    `- Markdown: ${postMarkdownUrl(post.locale, post.slug)}`,
    `- Published: ${post.date}`,
    post.updated ? `- Updated: ${post.updated}` : null,
    post.category ? `- Category: ${post.category}` : null,
    post.tags.length > 0 ? `- Tags: ${post.tags.join(", ")}` : null,
    `- Language: ${post.locale}`,
    "",
    post.summary ? `**TL;DR** ${post.summary}` : null,
    "",
    "---",
    "",
  ]
    .filter((line) => line !== null)
    .join("\n");

  return new Response(header + post.raw, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
};
