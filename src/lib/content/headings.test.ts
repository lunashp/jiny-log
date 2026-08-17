import { describe, expect, it } from "vitest";

import { extractHeadings, slugifyHeading } from "./headings";

describe("extractHeadings", () => {
  it("H2 와 H3 를 깊이와 함께 추출한다", () => {
    const headings = extractHeadings("## 증상\n\n본문\n\n### 재현 방법\n");

    expect(headings).toEqual([
      { id: "증상", depth: 2, text: "증상" },
      { id: "재현-방법", depth: 3, text: "재현 방법" },
    ]);
  });

  it("H1 과 H4 이하는 무시한다", () => {
    const headings = extractHeadings("# 제목\n\n#### 너무 깊음\n\n## 진짜\n");

    expect(headings.map((h) => h.text)).toEqual(["진짜"]);
  });

  it("★ 코드 블록 안의 # 를 헤딩으로 오인하지 않는다", () => {
    const content = [
      "## 진짜 헤딩",
      "",
      "```bash",
      "# 이건 셸 주석이지 헤딩이 아니다",
      "## 이것도 아니다",
      "```",
      "",
      "## 또 다른 진짜 헤딩",
    ].join("\n");

    expect(extractHeadings(content).map((h) => h.text)).toEqual([
      "진짜 헤딩",
      "또 다른 진짜 헤딩",
    ]);
  });

  it("~~~ 펜스도 추적한다", () => {
    const content = ["~~~", "# 주석", "~~~", "", "## 헤딩"].join("\n");

    expect(extractHeadings(content).map((h) => h.text)).toEqual(["헤딩"]);
  });

  it("인라인 마크업을 제거한다", () => {
    const headings = extractHeadings("## `useEffect` 를 **언제** 쓰나\n");

    expect(headings[0]?.text).toBe("useEffect 를 언제 쓰나");
  });

  it("링크 텍스트만 남긴다", () => {
    const headings = extractHeadings("## [React 문서](https://react.dev) 읽기\n");

    expect(headings[0]?.text).toBe("React 문서 읽기");
  });

  it("중복 헤딩에 접미사를 붙인다", () => {
    const headings = extractHeadings("## 해결\n\n## 해결\n\n## 해결\n");

    expect(headings.map((h) => h.id)).toEqual(["해결", "해결-1", "해결-2"]);
  });

  it("헤딩이 없으면 빈 배열을 반환한다", () => {
    expect(extractHeadings("그냥 본문입니다.\n")).toEqual([]);
  });
});

describe("slugifyHeading", () => {
  it("공백을 하이픈으로 바꾸고 소문자화한다", () => {
    expect(slugifyHeading("Why This Fails")).toBe("why-this-fails");
  });

  it("구두점을 제거한다", () => {
    expect(slugifyHeading("What's the fix?")).toBe("whats-the-fix");
  });

  it("한글을 보존한다", () => {
    expect(slugifyHeading("왜 이 에러가 나는가")).toBe("왜-이-에러가-나는가");
  });
});
