import { describe, expect, it } from "vitest";
import {
  normalizeBorderSpec,
  resolveBorderEdge,
  toBorderCss,
} from "./border";
import type { CellStyle } from "../types";

describe("border utilities", () => {
  it("normalizes missing border values with stable defaults", () => {
    expect(normalizeBorderSpec({})).toEqual({
      color: "#222",
      width: 1,
      style: "solid",
    });
  });

  it("rounds border width and clamps negative widths to zero", () => {
    expect(normalizeBorderSpec({ width: 1.6 })?.width).toBe(2);
    expect(normalizeBorderSpec({ width: -3 })?.width).toBe(0);
  });

  it("converts border specs to CSS border strings", () => {
    expect(toBorderCss({ color: "#c00", width: 2, style: "dashed" })).toBe(
      "2px dashed #c00",
    );
  });

  it("falls back to the top neighbor bottom edge for a missing top edge", () => {
    const styles: Record<string, CellStyle> = {
      "1:2": { border: { bottom: { color: "#111", width: 2 } } },
    };

    expect(
      resolveBorderEdge(2, 2, "top", (row, col) => styles[`${row}:${col}`]),
    ).toEqual({ color: "#111", width: 2 });
  });

  it("falls back to the left neighbor right edge for a missing left edge", () => {
    const styles: Record<string, CellStyle> = {
      "3:1": { border: { right: { color: "#f00", style: "dotted" } } },
    };

    expect(
      resolveBorderEdge(3, 2, "left", (row, col) => styles[`${row}:${col}`]),
    ).toEqual({ color: "#f00", style: "dotted" });
  });
});
