import type { Locale, Post } from "@/lib/content";
import { AUTHOR, HTML_LANG, SITE_NAME, SITE_URL, absoluteUrl, postUrl } from "./site";

/**
 * 채택한 타입: BlogPosting / Person / WebSite+SearchAction / BreadcrumbList
 *
 * 비채택 (docs/SEO-GEO.md §2):
 *   - HowTo    — 구글이 2023-09-13 데스크톱 리치결과 폐지. 순수 비용
 *   - FAQPage  — 구글이 2026-05-07 리치결과 폐지. FAQ 본문 *구조*는 유지하되
 *                마크업에는 투자하지 않는다
 */

type JsonLd = Record<string, unknown>;

const person = (): JsonLd => ({
  "@type": "Person",
  name: AUTHOR.name,
  alternateName: AUTHOR.nameEn,
  url: AUTHOR.url,
});

export function blogPostingJsonLd(post: Post, ogImage: string): JsonLd {
  const url = postUrl(post.locale, post.slug);

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    abstract: post.summary,
    datePublished: post.date,
    dateModified: post.updated ?? post.date,
    inLanguage: post.locale === "ko" ? "ko-KR" : "en-US",
    author: person(),
    publisher: person(),
    mainEntityOfPage: { "@type": "WebPage", "@id": post.canonical ?? url },
    url,
    image: ogImage,
    keywords: post.tags.length > 0 ? post.tags.join(", ") : undefined,
    articleSection: post.category,
  };
}

export function websiteJsonLd(locale: Locale): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME[locale],
    url: absoluteUrl(`/${locale}`),
    inLanguage: HTML_LANG[locale],
    author: person(),
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/${locale}/posts?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; url: string }>): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * undefined 필드를 제거해 직렬화한다.
 * JSON-LD에 `"keywords": null` 같은 값이 남으면 검증기가 경고를 낸다.
 */
export function serializeJsonLd(data: JsonLd | JsonLd[]): string {
  return JSON.stringify(data, (_key, value) => value ?? undefined);
}
