import { describe, expect, it } from "vitest";
import { get2DGrid, gridToTSV, tsvToGrid } from "./clipboard";

describe("clipboard utilities", () => {
  it("builds a rectangular grid from sparse cell data", () => {
    const grid = get2DGrid(
      { sr: 1, sc: 1, er: 2, ec: 3 },
      {
        "1:1": "A",
        "1:3": "C",
        "2:2": "B",
      },
    );

    expect(grid).toEqual([
      ["A", "", "C"],
      ["", "B", ""],
    ]);
  });

  it("serializes a grid to TSV", () => {
    expect(
      gridToTSV([
        ["A", "B"],
        ["C", ""],
      ]),
    ).toBe("A\tB\nC\t");
  });

  it("parses TSV with CRLF line endings", () => {
    expect(tsvToGrid("A\tB\r\nC\tD")).toEqual([
      ["A", "B"],
      ["C", "D"],
    ]);
  });
});
