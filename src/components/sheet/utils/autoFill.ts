import type { Rect } from "../types";
import { keyOf } from "./geometry";

export type NumberFillPattern = {
  axis: "row" | "col";
  base: number;
  step: number;
  startIndex: number;
};

export type FillMode = "vertical" | "horizontal" | "tile";

export function detectFillMode(source: Rect, target: Rect): FillMode {
  const verticalOnly =
    target.sc === source.sc &&
    target.ec === source.ec &&
    (target.sr !== source.sr || target.er !== source.er);

  const horizontalOnly =
    target.sr === source.sr &&
    target.er === source.er &&
    (target.sc !== source.sc || target.ec !== source.ec);

  if (verticalOnly && !horizontalOnly) return "vertical";
  if (horizontalOnly && !verticalOnly) return "horizontal";
  return "tile";
}

export function collectColumnValues(
  source: Rect,
  col: number,
  data: Record<string, string>,
): number[] | null {
  const out: number[] = [];
  for (let row = source.sr; row <= source.er; row++) {
    const raw = data[keyOf(row, col)];
    if (raw == null || raw === "") return null;
    const value = Number(raw);
    if (!Number.isFinite(value)) return null;
    out.push(value);
  }
  return out;
}

export function collectRowValues(
  source: Rect,
  row: number,
  data: Record<string, string>,
): number[] | null {
  const out: number[] = [];
  for (let col = source.sc; col <= source.ec; col++) {
    const raw = data[keyOf(row, col)];
    if (raw == null || raw === "") return null;
    const value = Number(raw);
    if (!Number.isFinite(value)) return null;
    out.push(value);
  }
  return out;
}

export function inferNumberFillPattern(
  values: number[],
  axis: "row" | "col",
  startIndex: number,
): NumberFillPattern | null {
  if (values.length === 0) return null;

  if (values.length === 1) {
    return {
      axis,
      base: values[0],
      step: 0,
      startIndex,
    };
  }

  const step = values[1] - values[0];
  for (let index = 1; index < values.length - 1; index++) {
    if (values[index + 1] - values[index] !== step) {
      return null;
    }
  }

  return {
    axis,
    base: values[0],
    step,
    startIndex,
  };
}
