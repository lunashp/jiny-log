import rss from "@astrojs/rss";
import type { APIRoute } from "astro";

import { LOCALES, getPosts, isLocale } from "@/lib/content";
import { SITE_NAME, absoluteUrl, postUrl } from "@/lib/seo/site";
import { getMessages } from "@/lib/i18n";

export function getStaticPaths() {
  return LOCALES.map((locale) => ({ params: { locale } }));
}

export const GET: APIRoute = async ({ params }) => {
  const locale = params.locale;
  if (!locale || !isLocale(locale)) {
    return new Response("Not found", { status: 404 });
  }

  const posts = await getPosts(locale);
  const m = getMessages(locale);

  return rss({
    title: SITE_NAME[locale],
    description: m.site.description,
    site: absoluteUrl(`/${locale}`),
    // 전문이 아니라 요약 + 원문 링크를 싣는다.
    items: posts.map((post) => ({
      title: post.title,
      link: postUrl(locale, post.slug),
      description: post.summary ?? post.description,
      pubDate: new Date(`${post.date}T00:00:00Z`),
      categories: post.tags,
    })),
    customData: `<language>${locale}</language>`,
  });
};
