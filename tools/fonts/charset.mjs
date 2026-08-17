import { readFile, readdir } from "node:fs/promises";
import { join, extname } from "node:path";

import { LATIN_EXTRA } from "./sources.mjs";

/**
 * 사이트에 실제로 등장하는 문자를 모은다.
 *
 * 콘텐츠 기반 서브셋의 근거: 한글 전체 11,172 음절을 넣으면 1.7MB 지만,
 * 실제 쓰는 글자만 넣으면 90KB 로 끝난다. 대신 **글이 추가되면 다시 생성해야
 * 한다** — 그래서 `check-fonts.mjs` 가 CI에서 누락을 잡는다.
 */

const SCAN = [
  { dir: "content/posts", ext: [".mdx", ".md"] },
  { dir: "messages", ext: [".json"] },
  // UI 문자열이 컴포넌트에 하드코딩된 경우까지 포괄한다.
  { dir: "src", ext: [".astro", ".ts"] },
];

async function* walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else yield path;
  }
}

/** 사이트 전체 문자셋 (한글 포함) */
export async function collectSiteCharset(root = process.cwd()) {
  const chars = new Set();

  for (const { dir, ext } of SCAN) {
    for await (const path of walk(join(root, dir))) {
      if (!ext.includes(extname(path))) continue;
      for (const ch of await readFile(path, "utf8")) chars.add(ch);
    }
  }

  // 공백류는 폰트에 굳이 넣지 않는다 (space 는 아래에서 명시 추가).
  for (const ch of [...chars]) {
    if (/\s/.test(ch) && ch !== " ") chars.delete(ch);
  }

  for (const ch of LATIN_EXTRA) chars.add(ch);
  // ASCII 인쇄 가능 문자는 항상 포함 — 코드·URL·숫자에 필수다.
  for (let cp = 0x20; cp < 0x7f; cp += 1) chars.add(String.fromCodePoint(cp));

  return chars;
}

/** 라틴 전용 문자셋 (모노 폰트용) */
export function latinCharset() {
  const chars = new Set();
  for (let cp = 0x20; cp < 0x7f; cp += 1) chars.add(String.fromCodePoint(cp));
  for (const ch of LATIN_EXTRA) chars.add(ch);
  return chars;
}

/** 정렬된 문자열로 직렬화 — 매니페스트 비교를 안정적으로 만든다. */
export const serializeCharset = (chars) =>
  [...chars].sort((a, b) => a.codePointAt(0) - b.codePointAt(0)).join("");
