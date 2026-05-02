import { describe, expect, it } from "vitest";
import { a1ToPos, a1ToRect, colToLabel, rectToA1 } from "./a1Utils";

describe("a1 utilities", () => {
  describe("colToLabel", () => {
    it("converts zero-based column indexes to spreadsheet labels", () => {
      expect(colToLabel(0)).toBe("A");
      expect(colToLabel(25)).toBe("Z");
      expect(colToLabel(26)).toBe("AA");
      expect(colToLabel(27)).toBe("AB");
      expect(colToLabel(701)).toBe("ZZ");
      expect(colToLabel(702)).toBe("AAA");
    });
  });

  describe("a1ToPos", () => {
    it("parses A1 references into zero-based positions", () => {
      expect(a1ToPos("A1")).toEqual({ row: 0, col: 0 });
      expect(a1ToPos("b12")).toEqual({ row: 11, col: 1 });
      expect(a1ToPos("AA3")).toEqual({ row: 2, col: 26 });
    });

    it("allows spaces between column and row labels", () => {
      expect(a1ToPos("C 5")).toEqual({ row: 4, col: 2 });
    });

    it("returns null for invalid or out-of-range references", () => {
      expect(a1ToPos("")).toBeNull();
      expect(a1ToPos("A0")).toBeNull();
      expect(a1ToPos("1A")).toBeNull();
      expect(a1ToPos("AA")).toBeNull();
    });
  });

  describe("a1ToRect", () => {
    it("parses a single cell as a one-cell rect", () => {
      expect(a1ToRect("B2")).toEqual({ sr: 1, sc: 1, er: 1, ec: 1 });
    });

    it("parses ranges and normalizes reversed endpoints", () => {
      expect(a1ToRect("C3:A1")).toEqual({ sr: 0, sc: 0, er: 2, ec: 2 });
    });

    it("ignores whitespace around range separators", () => {
      expect(a1ToRect(" A1 : B2 ")).toEqual({ sr: 0, sc: 0, er: 1, ec: 1 });
    });
  });

  describe("rectToA1", () => {
    it("formats one-cell rects as single A1 references", () => {
      expect(rectToA1({ sr: 0, sc: 0, er: 0, ec: 0 })).toBe("A1");
    });

    it("formats multi-cell rects as A1 ranges", () => {
      expect(rectToA1({ sr: 0, sc: 0, er: 2, ec: 27 })).toBe("A1:AB3");
    });
  });
});
