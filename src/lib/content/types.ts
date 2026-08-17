import type { CollectionEntry } from "astro:content";

import type { Category, Locale } from "./schema";
import type { Heading } from "./headings";

export type { Category, Locale, Heading };

export type Cover = {
  src: string;
  alt: string;
};

/** 빌드 타임에 실제 치수를 읽어 붙인 cover. CLS 방지에 필수. */
export type ResolvedCover = Cover & {
  width: number;
  height: number;
};

/** 목록·사이트맵·RSS 에 필요한 최소 정보. 본문을 포함하지 않는다. */
export interface PostSummary {
  slug: string;
  locale: Locale;
  title: string;
  description: string;
  date: string;
  updated?: string;
  summary?: string;
  tags: string[];
  category?: Category;
  series?: string;
  canonical?: string;
  cover?: ResolvedCover;
  draft: boolean;
}

/** 본문 렌더링까지 필요한 전체 정보. */
export interface Post extends PostSummary {
  /**
   * Astro 콘텐츠 엔트리. `render()` 에 넘겨 본문 컴포넌트를 얻는다.
   * 이 타입만 astro:content 를 노출하지만, 소비자는 렌더링에만 쓴다.
   */
  entry: CollectionEntry<"posts">;
  /** 원본 마크다운. raw markdown 라우트와 llms.txt 에서 사용. */
  raw: string;
  related: string[];
  headings: Heading[];
}
