/**
 * `interface` 가 아니라 `type` 이어야 한다.
 * TS 인터페이스에는 암묵적 인덱스 시그니처가 없어서 content-collections 의
 * Serializable 제약을 통과하지 못한다.
 */
export type Heading = {
  /** rehype-slug 가 생성하는 것과 동일한 id */
  id: string;
  depth: 2 | 3;
  text: string;
};

/**
 * github-slugger 와 동일한 규칙으로 헤딩 id를 만든다.
 * rehype-slug 가 HTML에 붙이는 id와 일치해야 목차 앵커가 동작한다.
 *
 * 한글은 그대로 보존된다 — 유니코드 URL 프래그먼트는 브라우저가 처리하며,
 * 슬러그(경로)와 달리 인코딩되어도 문제되지 않는다.
 */
export function slugifyHeading(text: string): string {
  return (
    text
      .trim()
      .toLowerCase()
      // 구두점·일반 기호 제거. 유니코드 범위는 이스케이프로 쓴다 —
      // 리터럴로 넣으면 눈에 보이지 않는 공백 문자가 소스에 섞여 들어간다.
      .replace(/[\u2000-\u206F\u2E00-\u2E7F'!"#$%&()*+,./:;<=>?@[\]^`{|}~]/g, "")
      .replace(/\s+/g, "-")
  );
}

const FENCE = /^\s*(```|~~~)/;
const HEADING = /^(#{2,3})\s+(.+?)\s*$/;

/** 인라인 마크다운 마크업을 제거해 목차에 넣을 평문을 만든다. */
function stripInline(raw: string): string {
  return raw
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .trim();
}

/**
 * MDX 본문에서 H2/H3를 추출한다.
 *
 * 코드 블록 안의 `#` 주석을 헤딩으로 오인하지 않도록 펜스를 추적한다.
 * (`# 이건 셸 주석이지 헤딩이 아니다`)
 *
 * 중복 텍스트에는 github-slugger 처럼 -1, -2 접미사를 붙인다.
 */
export function extractHeadings(content: string): Heading[] {
  const headings: Heading[] = [];
  const seen = new Map<string, number>();
  let fence: string | null = null;

  for (const line of content.split("\n")) {
    const fenceMatch = FENCE.exec(line);
    if (fenceMatch) {
      const marker = fenceMatch[1]!;
      if (fence === null) fence = marker;
      else if (fence === marker) fence = null;
      continue;
    }
    if (fence !== null) continue;

    const match = HEADING.exec(line);
    if (!match) continue;

    const depth = match[1]!.length as 2 | 3;
    const text = stripInline(match[2]!);
    if (!text) continue;

    const base = slugifyHeading(text);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);

    headings.push({ id: count === 0 ? base : `${base}-${count}`, depth, text });
  }

  return headings;
}
