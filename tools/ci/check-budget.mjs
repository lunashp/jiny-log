#!/usr/bin/env node
/**
 * 번들 예산 하드 게이트 (docs/PLAN.md Phase 5, CLAUDE.md 규칙 4).
 *
 * 빌드된 HTML이 실제로 참조하는 JS/CSS를 gzip 크기로 합산한다.
 * 매니페스트 장부가 아니라 사용자가 실제로 내려받는 것을 측정한다.
 *
 * ★ 초과하면 빌드를 실패시킨다. 예산을 올려서 통과시키지 않는다.
 */
import { gzipSync } from "node:zlib";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../..");
const DIST = join(ROOT, "dist");

/** 대표 라우트별 예산 (gzip 바이트) */
const BUDGETS = [
  { label: "글 본문", html: "ko/posts/nextjs-hydration-mismatch/index.html", js: 15_000, css: 20_000 },
  { label: "홈", html: "ko/index.html", js: 10_000, css: 20_000 },
  { label: "글 목록", html: "ko/posts/index.html", js: 10_000, css: 20_000 },
  { label: "태그", html: "ko/tags/nextjs/index.html", js: 10_000, css: 20_000 },
];

const ASSET_RE = /(?:href|src)="(\/[^"]+?\.(?:js|css))"/g;
/** noModule 스크립트는 레거시 브라우저 전용이다 — 모던 브라우저는 내려받지 않는다. */
const NOMODULE_RE = /<script[^>]*\bnomodule\b[^>]*>/gi;
const KB = (bytes) => `${(bytes / 1000).toFixed(1)}kB`;

const sizeCache = new Map();

async function gzipSize(assetPath) {
  if (sizeCache.has(assetPath)) return sizeCache.get(assetPath);

  let size = 0;
  try {
    const buffer = await readFile(join(DIST, assetPath));
    size = gzipSync(buffer, { level: 9 }).byteLength;
  } catch {
    console.warn(`[budget] 자산을 찾지 못했습니다: ${assetPath}`);
  }

  sizeCache.set(assetPath, size);
  return size;
}

async function measure(htmlRelPath) {
  const html = await readFile(join(DIST, htmlRelPath), "utf8");

  const legacyOnly = new Set();
  for (const tag of html.match(NOMODULE_RE) ?? []) {
    for (const match of tag.matchAll(ASSET_RE)) legacyOnly.add(match[1]);
  }

  // 인라인 <script> 도 사용자가 내려받는 바이트다. 합산한다.
  let inlineJs = 0;
  for (const match of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)) {
    const body = match[1] ?? "";
    // JSON-LD 는 실행 코드가 아니지만 전송량이므로 별도 취급하지 않는다.
    inlineJs += gzipSync(Buffer.from(body), { level: 9 }).byteLength;
  }

  const assets = new Set();
  for (const match of html.matchAll(ASSET_RE)) {
    if (!legacyOnly.has(match[1])) assets.add(match[1]);
  }

  let js = inlineJs;
  let css = 0;
  for (const asset of assets) {
    const size = await gzipSize(asset);
    if (asset.endsWith(".css")) css += size;
    else js += size;
  }

  return { js, css, count: assets.size };
}

const rows = [];
const failures = [];

for (const budget of BUDGETS) {
  let actual;
  try {
    actual = await measure(budget.html);
  } catch {
    console.error(`[budget] ${budget.label}: dist/${budget.html} 를 읽을 수 없습니다. 먼저 \`pnpm build\` 를 실행하세요.`);
    process.exit(1);
  }

  rows.push({ label: budget.label, actual, limit: budget });

  if (actual.js > budget.js) {
    failures.push(`${budget.label}: JS ${KB(actual.js)} > 예산 ${KB(budget.js)} (초과 ${KB(actual.js - budget.js)})`);
  }
  if (actual.css > budget.css) {
    failures.push(`${budget.label}: CSS ${KB(actual.css)} > 예산 ${KB(budget.css)} (초과 ${KB(actual.css - budget.css)})`);
  }
}

console.log("\n번들 예산 (gzip, 빌드된 HTML 기준)\n");
console.log("라우트".padEnd(10) + "JS".padStart(11) + "예산".padStart(11) + "CSS".padStart(11) + "예산".padStart(11));
console.log("─".repeat(54));

for (const { label, actual, limit } of rows) {
  const jsCell = KB(actual.js) + (actual.js > limit.js ? " !" : "");
  const cssCell = KB(actual.css) + (actual.css > limit.css ? " !" : "");
  console.log(label.padEnd(10) + jsCell.padStart(11) + KB(limit.js).padStart(11) + cssCell.padStart(11) + KB(limit.css).padStart(11));
}

if (failures.length > 0) {
  console.error("\n❌ 번들 예산 초과\n");
  for (const failure of failures) console.error(`   ${failure}`);
  console.error("\n예산을 올려서 통과시키지 마세요. 무엇이 커졌는지 찾아 되돌리세요. (CLAUDE.md 규칙 4)\n");
  process.exit(1);
}

console.log("\n✅ 전 라우트 예산 내\n");
