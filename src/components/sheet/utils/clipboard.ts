import type { Rect } from "../types";
import { keyOf, rectH, rectW } from "./geometry";

export function get2DGrid(
  selection: Rect,
  data: Record<string, string>,
): string[][] {
  const height = rectH(selection);
  const width = rectW(selection);

  const grid: string[][] = Array.from({ length: height }, () =>
    Array<string>(width).fill(""),
  );

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      grid[row][col] = data[keyOf(selection.sr + row, selection.sc + col)] ?? "";
    }
  }

  return grid;
}

export const gridToTSV = (grid: string[][]) =>
  grid.map((row) => row.join("\t")).join("\n");

export function tsvToGrid(tsv: string): string[][] {
  const lines = tsv.replace(/\r/g, "").split("\n");
  return lines.map((line) => line.split("\t"));
}
