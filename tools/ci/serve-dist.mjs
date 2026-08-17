#!/usr/bin/env node
/**
 * 테스트용 정적 서버.
 *
 * `astro preview` 는 Astro 7 부터 **기본으로 데몬화**되어 부모 프로세스가 즉시 종료된다.
 * Playwright 의 webServer 는 그걸 "서버가 죽었다"로 판정하므로 포그라운드 서버가 필요하다.
 *
 * 의존성 없이 dist/ 를 그대로 서빙하며, Astro 의 디렉터리형 출력
 * (`/ko/posts/foo` → `/ko/posts/foo/index.html`)을 해석한다.
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../../dist");
const PORT = Number(process.env.PORT ?? 4321);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

/** 요청 경로 → 실제 파일. 디렉터리형 URL 과 확장자 있는 파일을 모두 처리한다. */
async function resolveFile(pathname) {
  // 경로 이탈 차단
  const safe = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, "");
  const base = join(ROOT, safe);

  const candidates = extname(safe)
    ? [base]
    : [join(base, "index.html"), `${base.replace(/\/$/, "")}.html`, base];

  for (const candidate of candidates) {
    if (!candidate.startsWith(ROOT)) continue;
    try {
      const info = await stat(candidate);
      if (info.isFile()) return candidate;
    } catch {
      /* 다음 후보 */
    }
  }
  return null;
}

/**
 * 리다이렉트는 파일이 아니라 어댑터 설정에 있다 (`/` → `/ko` 308).
 * 빌드 산출물에서 읽어와 프로덕션과 같게 동작시킨다 — 하드코딩하면
 * 설정이 바뀔 때 테스트 서버만 조용히 어긋난다.
 */
async function loadRedirects() {
  try {
    const config = JSON.parse(
      await readFile(resolve(ROOT, "../.vercel/output/config.json"), "utf8"),
    );
    return (config.routes ?? [])
      .filter((route) => route.status >= 300 && route.status < 400 && route.headers?.Location)
      .map((route) => ({
        pattern: new RegExp(route.src),
        location: route.headers.Location,
        status: route.status,
      }));
  } catch {
    return [];
  }
}

const redirects = await loadRedirects();

const server = createServer(async (req, res) => {
  const pathname = new URL(req.url ?? "/", `http://localhost:${PORT}`).pathname;

  for (const redirect of redirects) {
    if (redirect.pattern.test(pathname)) {
      res.writeHead(redirect.status, { Location: redirect.location });
      res.end();
      return;
    }
  }

  const file = await resolveFile(pathname);

  if (!file) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  const body = await readFile(file);
  res.writeHead(200, {
    "Content-Type": MIME[extname(file)] ?? "application/octet-stream",
    // 폰트 다운로드 크기를 테스트가 측정할 수 있어야 한다.
    "Content-Length": String(body.byteLength),
    "Cache-Control": "no-store",
  });
  res.end(body);
});

server.listen(PORT, () => {
  console.log(`[serve-dist] http://localhost:${PORT} → ${ROOT}`);
});
