import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";

import { PostFrontmatterSchema } from "./lib/content/schema";

/**
 * 콘텐츠 파이프라인 설정.
 *
 * ★ `astro:content` 를 직접 import 하는 곳은 이 파일과 src/lib/content/ 뿐이다.
 *   (eslint no-restricted-imports 로 강제. docs/ARCHITECTURE.md §4)
 *
 * 스키마 검증 실패는 빌드 실패로 처리한다. 깨진 메타데이터로 배포되면
 * SEO 손해가 조용히 누적되므로 경고 후 통과시키지 않는다.
 *
 * id 는 `<locale>/<slug>` 형태가 된다 — 로케일과 슬러그를 여기서 분리한다.
 */
const posts = defineCollection({
  loader: glob({
    pattern: "**/*.mdx",
    base: "./content/posts",
    // raw markdown 라우트와 llms.txt 가 원문을 필요로 한다.
    retainBody: true,
  }),
  schema: PostFrontmatterSchema,
});

export const collections = { posts };
