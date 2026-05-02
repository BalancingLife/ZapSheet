import { describe, expect, it } from "vitest";
import {
  clamp,
  keyOf,
  normRect,
  rectContainsCell,
  rectH,
  rectToCells,
  rectW,
  rectsIntersect,
  step1,
  toEdge,
} from "./geometry";
import { COLUMN_COUNT, ROW_COUNT } from "../SheetConstants";

describe("geometry utilities", () => {
  it("builds stable cell keys", () => {
    expect(keyOf(3, 5)).toBe("3:5");
  });

  it("clamps values inside an inclusive range", () => {
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(4, 0, 10)).toBe(4);
    expect(clamp(11, 0, 10)).toBe(10);
  });

  it("normalizes two positions into a top-left to bottom-right rect", () => {
    expect(normRect({ row: 5, col: 7 }, { row: 2, col: 3 })).toEqual({
      sr: 2,
      sc: 3,
      er: 5,
      ec: 7,
    });
  });

  it("steps one cell in a direction without leaving sheet bounds", () => {
    expect(step1({ row: 2, col: 2 }, "up")).toEqual({ row: 1, col: 2 });
    expect(step1({ row: 0, col: 0 }, "up")).toEqual({ row: 0, col: 0 });
    expect(step1({ row: 0, col: 0 }, "left")).toEqual({ row: 0, col: 0 });
  });

  it("moves to the sheet edge in a direction", () => {
    expect(toEdge({ row: 3, col: 4 }, "up")).toEqual({ row: 0, col: 4 });
    expect(toEdge({ row: 3, col: 4 }, "down")).toEqual({
      row: ROW_COUNT - 1,
      col: 4,
    });
    expect(toEdge({ row: 3, col: 4 }, "right")).toEqual({
      row: 3,
      col: COLUMN_COUNT - 1,
    });
  });

  it("calculates rect width and height inclusively", () => {
    const rect = { sr: 1, sc: 2, er: 3, ec: 5 };
    expect(rectW(rect)).toBe(4);
    expect(rectH(rect)).toBe(3);
  });

  it("expands a rect into cells in row-major order", () => {
    expect(rectToCells({ sr: 1, sc: 2, er: 2, ec: 3 })).toEqual([
      { row: 1, col: 2 },
      { row: 1, col: 3 },
      { row: 2, col: 2 },
      { row: 2, col: 3 },
    ]);
  });

  it("detects rect intersection and cell containment", () => {
    const rect = { sr: 1, sc: 1, er: 3, ec: 3 };

    expect(rectsIntersect(rect, { sr: 3, sc: 3, er: 5, ec: 5 })).toBe(true);
    expect(rectsIntersect(rect, { sr: 4, sc: 4, er: 5, ec: 5 })).toBe(false);
    expect(rectContainsCell(rect, 2, 2)).toBe(true);
    expect(rectContainsCell(rect, 4, 2)).toBe(false);
  });
});
