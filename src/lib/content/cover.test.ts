import { describe, expect, it } from "vitest";

import { resolveCover } from "./cover";

/**
 * ★ cover 치수는 CLS 방지의 전제다.
 *   치수를 못 읽으면 조용히 넘어가지 말고 빌드를 세워야 한다.
 */

const REAL = "/images/nextjs-hydration-mismatch/cover.png";

describe("resolveCover", () => {
  it("cover 가 없으면 undefined", () => {
    expect(resolveCover(undefined, "test")).toBeUndefined();
  });

  it("★ 실제 파일에서 치수를 읽는다", () => {
    const resolved = resolveCover({ src: REAL, alt: "설명" }, "test");

    expect(resolved).toEqual({
      src: REAL,
      alt: "설명",
      width: 1600,
      height: 900,
    });
  });

  it("alt 는 호출 시점 값을 쓴다 (캐시가 alt 를 고정하지 않는다)", () => {
    resolveCover({ src: REAL, alt: "첫 번째" }, "test");
    const second = resolveCover({ src: REAL, alt: "두 번째" }, "test");

    // 로케일마다 alt 가 다르므로 캐시된 alt 를 재사용하면 안 된다.
    expect(second?.alt).toBe("두 번째");
  });

  it("★ 파일이 없으면 빌드를 세운다", () => {
    expect(() =>
      resolveCover({ src: "/images/nope/missing.png", alt: "x" }, "ko/foo"),
    ).toThrow(/cover 이미지를 읽을 수 없습니다/);
  });

  it("오류 메시지가 어느 글인지와 다음 행동을 알려준다", () => {
    try {
      resolveCover({ src: "/images/nope/missing.png", alt: "x" }, "ko/some-post");
      expect.unreachable("던졌어야 한다");
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain("ko/some-post");
      expect(message).toContain("public/images");
    }
  });
});
