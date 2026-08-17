import { imageSize } from "image-size";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { Cover, ResolvedCover } from "./types";

/**
 * cover 이미지 치수를 **빌드 타임에** 읽는다.
 *
 * 이유: `<img>` 에 명시적 width/height 가 없으면 이미지가 도착하는 순간
 * 레이아웃이 밀려 CLS 가 발생한다. 히어로 이미지는 화면 최상단이라 피해가 가장 크다.
 *
 * cover 는 `public/images/<slug>/…` 에 있어 Astro 의 `<Image>` 최적화 대상이 아니다
 * (`astro:assets` 는 `src/` 임포트만 처리한다). 계약이 `public/` 경로를 못박고
 * blog-publisher 도 거기 쓰므로, 경로를 바꾸는 대신 치수만 직접 읽는다.
 */

const PUBLIC_DIR = "public";

/** 같은 이미지를 여러 번 읽지 않는다 (목록·본문·OG 가 같은 파일을 참조). */
const cache = new Map<string, ResolvedCover | undefined>();

export function resolveCover(
  cover: Cover | undefined,
  context: string,
): ResolvedCover | undefined {
  if (!cover) return undefined;

  const cached = cache.get(cover.src);
  if (cached !== undefined) return { ...cached, alt: cover.alt };

  // `/images/foo/cover.webp` → `public/images/foo/cover.webp`
  const filePath = join(PUBLIC_DIR, cover.src.replace(/^\//, ""));

  let dimensions: { width?: number; height?: number };
  try {
    dimensions = imageSize(readFileSync(filePath));
  } catch {
    throw new Error(
      `[content] cover 이미지를 읽을 수 없습니다: ${filePath} (${context}). ` +
        `public/images/<slug>/ 아래에 실제 파일이 있는지 확인하세요. ` +
        `upload_asset 으로 올렸다면 경로가 반환값과 일치하는지 보세요.`,
    );
  }

  if (!dimensions.width || !dimensions.height) {
    throw new Error(
      `[content] cover 이미지의 크기를 알 수 없습니다: ${filePath} (${context}). ` +
        `치수를 모르면 CLS 를 막을 수 없으므로 빌드를 중단합니다.`,
    );
  }

  const resolved: ResolvedCover = {
    src: cover.src,
    alt: cover.alt,
    width: dimensions.width,
    height: dimensions.height,
  };

  cache.set(cover.src, resolved);
  return resolved;
}
