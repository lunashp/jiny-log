import {
  DEFAULT_LOCALE,
  getAvailableLocales,
  getAvailableWorkLocales,
  type Locale,
} from "@/lib/content";
import { absoluteUrl, postUrl, workUrl } from "./site";

/**
 * hreflang 맵 — ★ 실제 존재하는 번역만 포함한다.
 *
 * 없는 번역을 가리키는 hreflang 은 SEO에 해롭다. 그래서 로케일 목록을
 * 하드코딩하지 않고 콘텐츠 레이어에 물어본다.
 *
 * x-default 는 기본 로케일(ko)을 가리키되, ko 번역이 없으면 넣지 않는다.
 */
export async function buildPostHreflang(slug: string): Promise<Record<string, string>> {
  const available = await getAvailableLocales(slug);
  const languages: Record<string, string> = {};

  for (const locale of available) {
    languages[locale] = postUrl(locale, slug);
  }

  if (available.includes(DEFAULT_LOCALE)) {
    languages["x-default"] = postUrl(DEFAULT_LOCALE, slug);
  }

  return languages;
}

/**
 * 케이스 스터디용 hreflang.
 *
 * 글용 `buildPostHreflang` 을 재사용하지 않는다 — 다른 컬렉션을 조회해야 하고,
 * 잘못 쓰면 없는 글을 찾아 hreflang 이 조용히 비어버린다 (docs/PORTFOLIO.md §6-3).
 */
export async function buildWorkHreflang(slug: string): Promise<Record<string, string>> {
  const available = await getAvailableWorkLocales(slug);
  const languages: Record<string, string> = {};

  for (const locale of available) {
    languages[locale] = workUrl(locale, slug);
  }

  if (available.includes(DEFAULT_LOCALE)) {
    languages["x-default"] = workUrl(DEFAULT_LOCALE, slug);
  }

  return languages;
}

/** 글이 아닌 정적 라우트(홈·목록 등)는 전 로케일에 항상 존재한다. */
export function buildStaticHreflang(
  path: string,
  locales: readonly Locale[],
): Record<string, string> {
  const languages: Record<string, string> = {};

  for (const locale of locales) {
    languages[locale] = absoluteUrl(`/${locale}${path}`);
  }
  languages["x-default"] = absoluteUrl(`/${DEFAULT_LOCALE}${path}`);

  return languages;
}
