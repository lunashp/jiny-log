import { OGImageRoute } from "astro-og-canvas";

import { getAllPosts, type Category } from "@/lib/content";

/**
 * 글별 OG 이미지 — 빌드 타임에 굽는다.
 *
 * astro-og-canvas 는 canvaskit-wasm 으로 PNG를 그린다. 전부 빌드 타임이라
 * 런타임 비용이 0이다. 폰트도 빌드 중에만 내려받으며, 페이지 로드 시
 * 외부 요청이 발생하지 않는다.
 *
 * 한글 렌더링에 한글 폰트가 필요하다 — 없으면 제목이 두부(□□□)로 나온다.
 * 경로에 파라미터가 하나만 허용되므로 `<locale>/<slug>` 를 catch-all 로 받는다.
 */

/** 카테고리 → 시그널 색. tokens.css 의 oklch 값을 RGB 근사로 옮긴 것. */
const CATEGORY_RGB: Record<Category, [number, number, number]> = {
  troubleshooting: [200, 62, 45],
  insight: [26, 138, 156],
  note: [122, 126, 136],
  retrospective: [190, 138, 46],
};

const FONT_BASE =
  "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/public/static";

const posts = await getAllPosts();

const pages = Object.fromEntries(
  posts.map((post) => [`${post.locale}/${post.slug}`, post]),
);

export const { getStaticPaths, GET } = await OGImageRoute({
  pages,

  getImageOptions: (_path, post: (typeof posts)[number]) => ({
    title: post.title,
    description: post.description,
    bgGradient: [
      [251, 251, 252],
      [242, 243, 246],
    ],
    /*
     * cover 가 있으면 배경으로 깐다. 없으면 그라디언트만 쓴다.
     * 제목 가독성이 우선이라 어둡게 덮지 않고 'cover' 로 채우기만 한다 —
     * 밝은 이미지에 어두운 텍스트라는 전제는 유지된다.
     */
    ...(post.cover
      ? { bgImage: { path: `public${post.cover.src}`, fit: "cover" as const } }
      : {}),
    border: {
      color: CATEGORY_RGB[post.category ?? "note"],
      width: 14,
      side: "inline-start",
    },
    padding: 72,
    font: {
      title: {
        color: [22, 24, 29],
        size: post.title.length > 45 ? 60 : 74,
        weight: "Bold",
        lineHeight: 1.22,
        families: ["Pretendard"],
      },
      description: {
        color: [107, 114, 128],
        size: 27,
        lineHeight: 1.5,
        families: ["Pretendard"],
      },
    },
    fonts: [
      `${FONT_BASE}/Pretendard-Bold.otf`,
      `${FONT_BASE}/Pretendard-Regular.otf`,
    ],
    format: "PNG",
  }),
});
