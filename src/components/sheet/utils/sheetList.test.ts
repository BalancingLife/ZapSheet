import { describe, expect, it } from "vitest";
import { arrayMove, nextSheetName } from "./sheetList";

describe("sheetList utilities", () => {
  describe("arrayMove", () => {
    it("moves an item from one index to another without mutating the input", () => {
      const sheets = ["Sheet1", "Sheet2", "Sheet3"];

      expect(arrayMove(sheets, 0, 2)).toEqual(["Sheet2", "Sheet3", "Sheet1"]);
      expect(sheets).toEqual(["Sheet1", "Sheet2", "Sheet3"]);
    });

    it("returns the same array reference when source and target indexes match", () => {
      const sheets = ["Sheet1", "Sheet2"];

      expect(arrayMove(sheets, 1, 1)).toBe(sheets);
    });

    it("supports moving an item backward", () => {
      expect(arrayMove(["A", "B", "C"], 2, 0)).toEqual(["C", "A", "B"]);
    });
  });

  describe("nextSheetName", () => {
    it("returns Sheet1 when no default names exist", () => {
      expect(nextSheetName([])).toBe("Sheet1");
    });

    it("returns the first missing SheetN name", () => {
      expect(nextSheetName(["Sheet1", "Sheet2", "Sheet4"])).toBe("Sheet3");
    });

    it("ignores non-default sheet names when finding the next SheetN name", () => {
      expect(nextSheetName(["Budget", "Sheet1"])).toBe("Sheet2");
    });
  });
});
