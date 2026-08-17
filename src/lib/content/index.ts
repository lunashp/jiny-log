/**
 * 콘텐츠 레이어의 공개 API.
 *
 * 애플리케이션 코드는 반드시 이 진입점만 사용한다.
 * `astro:content` 직접 import는 eslint 로 차단된다. (docs/ARCHITECTURE.md §4)
 */

export {
  getAllFullPosts,
  getAllPosts,
  getAllTags,
  getAvailableLocales,
  getPostBySlug,
  getPosts,
  getPostsByTag,
  getRelatedPosts,
  renderPost,
} from "./queries";

export type {
  Category,
  Cover,
  Heading,
  Locale,
  Post,
  PostSummary,
  ResolvedCover,
} from "./types";

export {
  CATEGORIES,
  CONTRACT_VERSION,
  DEFAULT_LOCALE,
  LOCALES,
  isLocale,
} from "./schema";
