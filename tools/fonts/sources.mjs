/**
 * 서브셋 원본 폰트. 전부 SIL Open Font License 1.1 이라 self-host·재배포가 가능하다.
 *
 * `axis` 가 있으면 가변 폰트를 해당 weight 범위로 좁힌 뒤 서브셋한다 —
 * 전 축(45–920)을 그대로 두면 쓰지도 않는 굵기 때문에 파일이 커진다.
 */
export const FONT_SOURCES = [
  {
    id: "pretendard",
    family: "Pretendard Variable",
    file: "pretendard-variable.subset.woff2",
    url: "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/web/variable/woff2/PretendardVariable.woff2",
    source: "PretendardVariable.woff2",
    /** 본문 400 · 제목 700 · 디스플레이 800 (docs/DESIGN.md §4) */
    axis: "wght=400:800",
    weight: "400 800",
    /** 사이트 전체 문자 — 본문·UI 모두 이 폰트로 조판된다 */
    charset: "site",
    /** LCP 요소(제목)에 쓰이므로 유일하게 preload 한다 */
    preload: true,
  },
  {
    id: "gowun-batang",
    family: "Gowun Batang",
    file: "gowun-batang.subset.woff2",
    url: "https://raw.githubusercontent.com/google/fonts/main/ofl/gowunbatang/GowunBatang-Regular.ttf",
    source: "GowunBatang-Regular.ttf",
    weight: "400",
    /**
     * Answer Block 전용이지만 사이트 전체 문자셋으로 서브셋한다.
     * summary 문자만 넣으면 새 글의 한 글자가 폴백으로 빠져 문장 중간에
     * 서체가 섞인다 — 그게 67KB 아끼는 것보다 나쁘다.
     */
    charset: "site",
    preload: false,
  },
  {
    id: "jetbrains-mono",
    family: "JetBrains Mono",
    file: "jetbrains-mono.subset.woff2",
    url: "https://raw.githubusercontent.com/JetBrains/JetBrainsMono/master/fonts/ttf/JetBrainsMono-Regular.ttf",
    source: "JetBrainsMono-Regular.ttf",
    weight: "400",
    /** 코드·메타데이터는 라틴이다. 한글은 Pretendard 로 폴백된다 */
    charset: "latin",
    preload: false,
  },
];

/** 라틴 + 사이트에서 실제 쓰는 기호. 모노 폰트용. */
export const LATIN_EXTRA =
  "←→↑↓✓✗⧉◐◑·…—–‘’“”°×÷≤≥≠№™©®±∞";

export const FONT_DIR = "public/fonts";
export const CHARSET_MANIFEST = "tools/fonts/charset.json";
