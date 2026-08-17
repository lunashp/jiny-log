#!/usr/bin/env node
/**
 * 웹폰트 서브셋 생성 (docs/DESIGN.md §5).
 *
 * 한글 폰트는 원본이 2–8MB 다. 사이트에 실제 등장하는 문자만 남기면
 * 세 패밀리 합쳐 ~180KB 로 떨어진다.
 *
 * ★ 이 스크립트는 **로컬에서만** 돌린다. 결과물(woff2)과 문자셋 매니페스트를
 *   커밋하므로 Vercel 빌드에는 Python 이 필요 없다.
 *   글이 추가되어 새 글자가 생기면 `pnpm fonts:check` 가 CI에서 잡아낸다.
 *
 * 사전 준비:
 *   python3 -m venv .venv-fonts
 *   .venv-fonts/bin/pip install "fonttools[woff]" brotli
 *
 * 실행:
 *   pnpm fonts:build
 */
import { execFile } from "node:child_process";
import { mkdir, writeFile, stat, access } from "node:fs/promises";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

import {
  CHARSET_MANIFEST,
  FONT_DIR,
  FONT_SOURCES,
} from "./sources.mjs";
import { collectSiteCharset, latinCharset, serializeCharset } from "./charset.mjs";

const run = promisify(execFile);
const ROOT = resolve(import.meta.dirname, "../..");
const CACHE = join(ROOT, "node_modules/.cache/fonts");
const KB = (bytes) => `${(bytes / 1024).toFixed(0)}kB`;

/** venv 우선, 없으면 PYTHON 환경변수, 그래도 없으면 안내 후 종료 */
async function resolvePython() {
  const candidates = [
    process.env.PYTHON,
    join(ROOT, ".venv-fonts/bin/python"),
    join(ROOT, ".venv/bin/python"),
  ].filter(Boolean);

  for (const python of candidates) {
    try {
      await run(python, ["-c", "import fontTools"]);
      return python;
    } catch {
      /* 다음 후보 */
    }
  }

  console.error(
    "\n[fonts] fontTools 를 찾지 못했습니다.\n\n" +
      "  python3 -m venv .venv-fonts\n" +
      '  .venv-fonts/bin/pip install "fonttools[woff]" brotli\n\n' +
      "다른 위치의 파이썬을 쓰려면 PYTHON=/path/to/python 으로 지정하세요.\n",
  );
  process.exit(1);
}

async function download(url, dest) {
  try {
    await access(dest);
    return; // 캐시 히트
  } catch {
    /* 내려받는다 */
  }

  console.log(`[fonts] 원본 다운로드 ${url.split("/").pop()}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`원본 폰트 다운로드 실패 (${response.status}): ${url}`);
  }
  await writeFile(dest, Buffer.from(await response.arrayBuffer()));
}

async function main() {
  const python = await resolvePython();
  await mkdir(CACHE, { recursive: true });
  await mkdir(join(ROOT, FONT_DIR), { recursive: true });

  const siteCharset = await collectSiteCharset(ROOT);
  const latin = latinCharset();

  console.log(
    `[fonts] 사이트 문자 ${siteCharset.size}개 ` +
      `(한글 음절 ${[...siteCharset].filter((c) => c >= "가" && c <= "힣").length}개)`,
  );

  const results = [];

  for (const font of FONT_SOURCES) {
    const sourcePath = join(CACHE, font.source);
    await download(font.url, sourcePath);

    const chars = font.charset === "latin" ? latin : siteCharset;
    const textFile = join(CACHE, `${font.id}.chars.txt`);
    await writeFile(textFile, serializeCharset(chars), "utf8");

    // 가변 폰트는 필요한 weight 범위로 먼저 좁힌다.
    let input = sourcePath;
    if (font.axis) {
      input = join(CACHE, `${font.id}.instanced.ttf`);
      await run(python, [
        "-m",
        "fontTools.varLib.instancer",
        sourcePath,
        font.axis,
        "-o",
        input,
      ]);
    }

    const output = join(ROOT, FONT_DIR, font.file);
    await run(python, [
      "-m",
      "fontTools.subset",
      input,
      `--text-file=${textFile}`,
      "--flavor=woff2",
      "--layout-features=*",
      "--no-hinting",
      "--desubroutinize",
      `--output-file=${output}`,
    ]);

    const { size } = await stat(output);
    results.push({ family: font.family, file: font.file, size });
    console.log(`[fonts] ${font.file.padEnd(34)} ${KB(size).padStart(7)}`);
  }

  // 매니페스트 — check-fonts.mjs 가 이걸로 누락을 판정한다.
  await writeFile(
    join(ROOT, CHARSET_MANIFEST),
    `${JSON.stringify(
      {
        note: "pnpm fonts:build 가 생성합니다. 직접 수정하지 마세요.",
        generatedFrom: "content/posts, messages, src",
        siteCharset: serializeCharset(siteCharset),
        latinCharset: serializeCharset(latin),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  const total = results.reduce((sum, r) => sum + r.size, 0);
  console.log(`\n[fonts] 합계 ${KB(total)} (예산 250kB)`);

  if (total > 250 * 1024) {
    console.error(
      "\n❌ 폰트 예산 초과. 패밀리를 줄이거나 문자셋을 좁히세요. (docs/DESIGN.md §5)\n",
    );
    process.exit(1);
  }
  console.log("✅ 예산 내\n");
}

await main();
