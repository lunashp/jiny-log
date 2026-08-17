#!/usr/bin/env node
/**
 * 폰트 서브셋 커버리지 검사 (CI 게이트).
 *
 * 콘텐츠 기반 서브셋의 유일한 약점은 **글이 추가되면 새 글자가 빠진다**는 것이다.
 * `blog-publisher` 가 자동으로 글을 올리므로 사람이 기억에 의존할 수 없다.
 *
 * 이 스크립트는 현재 콘텐츠의 문자셋을 다시 계산해 커밋된 매니페스트와 비교한다.
 * 순수 Node 라 Vercel 빌드에서도 돈다 — Python 이 필요 없다.
 */
import { readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";

import { CHARSET_MANIFEST, FONT_DIR, FONT_SOURCES } from "./sources.mjs";
import { collectSiteCharset } from "./charset.mjs";

const ROOT = resolve(import.meta.dirname, "../..");
const KB = (bytes) => `${(bytes / 1024).toFixed(0)}kB`;
const BUDGET = 250 * 1024;

function describe(ch) {
  const cp = ch.codePointAt(0).toString(16).toUpperCase().padStart(4, "0");
  return `${JSON.stringify(ch)} (U+${cp})`;
}

async function main() {
  let manifest;
  try {
    manifest = JSON.parse(await readFile(join(ROOT, CHARSET_MANIFEST), "utf8"));
  } catch {
    console.error(
      `[fonts] ${CHARSET_MANIFEST} 가 없습니다. \`pnpm fonts:build\` 를 먼저 실행하세요.`,
    );
    process.exit(1);
  }

  // 1. 폰트 파일이 실제로 있는가
  let total = 0;
  const missingFiles = [];

  for (const font of FONT_SOURCES) {
    const path = join(ROOT, FONT_DIR, font.file);
    try {
      total += (await stat(path)).size;
    } catch {
      missingFiles.push(font.file);
    }
  }

  if (missingFiles.length > 0) {
    console.error(
      `\n❌ 폰트 파일 누락: ${missingFiles.join(", ")}\n` +
        "   `pnpm fonts:build` 를 실행하고 결과물을 커밋하세요.\n",
    );
    process.exit(1);
  }

  // 2. 콘텐츠에 매니페스트 밖 문자가 생겼는가 — 새 글이 들어오면 여기서 걸린다
  const current = await collectSiteCharset(ROOT);
  const baked = new Set(manifest.siteCharset ?? "");
  const missing = [...current].filter((ch) => !baked.has(ch));

  if (missing.length > 0) {
    console.error(
      `\n❌ 서브셋에 없는 문자 ${missing.length}개가 콘텐츠에 있습니다.\n\n` +
        `   ${missing.slice(0, 40).map(describe).join(" ")}` +
        `${missing.length > 40 ? ` … 외 ${missing.length - 40}개` : ""}\n\n` +
        "   이 글자들은 폴백 폰트로 렌더되어 문장 중간에 서체가 섞입니다.\n" +
        "   `pnpm fonts:build` 를 실행하고 public/fonts/ 와 매니페스트를 커밋하세요.\n",
    );
    process.exit(1);
  }

  // 3. 예산
  console.log(`\n폰트 (${FONT_SOURCES.length}개 패밀리)\n`);
  for (const font of FONT_SOURCES) {
    const { size } = await stat(join(ROOT, FONT_DIR, font.file));
    console.log(
      `  ${font.family.padEnd(22)} ${KB(size).padStart(7)}` +
        `${font.preload ? "  (preload)" : ""}`,
    );
  }
  console.log(`  ${"─".repeat(22)} ${"─".repeat(7)}`);
  console.log(`  ${"합계".padEnd(21)} ${KB(total).padStart(7)}   예산 ${KB(BUDGET)}`);

  if (total > BUDGET) {
    console.error("\n❌ 폰트 예산 초과 (docs/DESIGN.md §5)\n");
    process.exit(1);
  }

  console.log(`\n✅ 문자 ${current.size}개 전부 커버됨, 예산 내\n`);
}

await main();
