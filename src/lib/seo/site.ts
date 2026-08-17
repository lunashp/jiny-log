import type { Locale } from "@/lib/content";

/**
 * PUBLIC_SITE_URL 이 틀리면 canonical·sitemap 이 조용히 잘못된 도메인을
 * 가리킨다. 빌드는 성공하고 SEO만 망가지므로, 여기서 형식을 검증한다.
 */
function resolveSiteUrl(): string {
  const raw = import.meta.env.PUBLIC_SITE_URL?.trim();

  if (!raw) {
    if (import.meta.env.PROD) {
      throw new Error(
        "PUBLIC_SITE_URL 이 설정되지 않았습니다. canonical·sitemap·OG 절대경로 " +
          "생성에 필요합니다. .env.example 을 참고하세요.",
      );
    }
    return "http://localhost:4321";
  }

  const normalized = raw.replace(/\/+$/, "");
  try {
    new URL(normalized);
  } catch {
    throw new Error(`PUBLIC_SITE_URL 이 올바른 URL이 아닙니다: "${raw}"`);
  }
  return normalized;
}

export const SITE_URL = resolveSiteUrl();

export const AUTHOR = {
  name: "지니",
  nameEn: "Jiny",
  url: SITE_URL,
} as const;

export const SITE_NAME: Record<Locale, string> = {
  ko: "지니로그",
  en: "jiny log",
};

export const OG_LOCALE: Record<Locale, string> = {
  ko: "ko_KR",
  en: "en_US",
};

export const HTML_LANG: Record<Locale, string> = {
  ko: "ko",
  en: "en",
};

export const absoluteUrl = (path: string): string =>
  `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

export const postUrl = (locale: Locale, slug: string): string =>
  absoluteUrl(`/${locale}/posts/${slug}`);

/** AI 크롤러가 HTML 크롬 없이 본문만 가져가는 경로 (docs/SEO-GEO.md §5-1) */
export const postMarkdownUrl = (locale: Locale, slug: string): string =>
  absoluteUrl(`/posts/${locale}/${slug}.md`);

/** 글별 OG 이미지 (빌드 타임 생성) */
export const ogImageUrl = (locale: Locale, slug: string): string =>
  absoluteUrl(`/og/${locale}/${slug}.png`);
