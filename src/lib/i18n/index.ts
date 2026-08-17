import type { Locale } from "@/lib/content";

import en from "../../../messages/en.json";
import ko from "../../../messages/ko.json";

/**
 * UI 문자열 조회 — 전부 빌드 타임에 해결된다.
 *
 * 클라이언트로 나가는 i18n 런타임이 없다. Astro 컴포넌트는 서버에서만
 * 실행되므로 메시지 카탈로그가 브라우저 번들에 실리지 않는다.
 */
const CATALOG = { ko, en } as const;

/** ko 카탈로그를 기준 타입으로 삼는다 — en 이 키를 빠뜨리면 타입 오류가 난다. */
export type Messages = typeof ko;

export function getMessages(locale: Locale): Messages {
  return CATALOG[locale];
}

/**
 * 로케일 프리픽스가 붙은 내부 경로.
 * prefixDefaultLocale: true 라서 규칙이 단순하다 — 항상 `/{locale}` 이 앞에 붙는다.
 */
export function localeHref(locale: Locale, path: string): string {
  if (path === "/" || path === "") return `/${locale}`;
  return `/${locale}${path.startsWith("/") ? path : `/${path}`}`;
}

/** `{tag}` 같은 자리표시자를 치환한다. */
export function interpolate(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
