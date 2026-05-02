import { describe, expect, it } from "vitest";
import {
  collectColumnValues,
  collectRowValues,
  detectFillMode,
  inferNumberFillPattern,
} from "./autoFill";

describe("autoFill utilities", () => {
  describe("detectFillMode", () => {
    it("detects vertical expansion when columns match and rows change", () => {
      expect(
        detectFillMode(
          { sr: 1, sc: 2, er: 3, ec: 4 },
          { sr: 1, sc: 2, er: 6, ec: 4 },
        ),
      ).toBe("vertical");
    });

    it("detects horizontal expansion when rows match and columns change", () => {
      expect(
        detectFillMode(
          { sr: 1, sc: 2, er: 3, ec: 4 },
          { sr: 1, sc: 2, er: 3, ec: 7 },
        ),
      ).toBe("horizontal");
    });

    it("uses tile mode when both rows and columns change", () => {
      expect(
        detectFillMode(
          { sr: 1, sc: 2, er: 3, ec: 4 },
          { sr: 1, sc: 2, er: 6, ec: 7 },
        ),
      ).toBe("tile");
    });
  });

  describe("collect values", () => {
    it("collects numeric values from a column in source order", () => {
      expect(
        collectColumnValues(
          { sr: 1, sc: 0, er: 3, ec: 0 },
          0,
          {
            "1:0": "10",
            "2:0": "20",
            "3:0": "30",
          },
        ),
      ).toEqual([10, 20, 30]);
    });

    it("collects numeric values from a row in source order", () => {
      expect(
        collectRowValues(
          { sr: 0, sc: 1, er: 0, ec: 3 },
          0,
          {
            "0:1": "1",
            "0:2": "2",
            "0:3": "3",
          },
        ),
      ).toEqual([1, 2, 3]);
    });

    it("returns null when a required source cell is empty or non-numeric", () => {
      expect(
        collectColumnValues(
          { sr: 0, sc: 0, er: 1, ec: 0 },
          0,
          {
            "0:0": "1",
            "1:0": "",
          },
        ),
      ).toBeNull();

      expect(
        collectRowValues(
          { sr: 0, sc: 0, er: 0, ec: 1 },
          0,
          {
            "0:0": "1",
            "0:1": "A",
          },
        ),
      ).toBeNull();
    });
  });

  describe("inferNumberFillPattern", () => {
    it("infers a zero-step pattern for a single value", () => {
      expect(inferNumberFillPattern([7], "row", 3)).toEqual({
        axis: "row",
        base: 7,
        step: 0,
        startIndex: 3,
      });
    });

    it("infers an arithmetic step for evenly spaced values", () => {
      expect(inferNumberFillPattern([2, 5, 8], "col", 1)).toEqual({
        axis: "col",
        base: 2,
        step: 3,
        startIndex: 1,
      });
    });

    it("returns null for non-arithmetic values", () => {
      expect(inferNumberFillPattern([1, 2, 4], "row", 0)).toBeNull();
    });
  });
});
