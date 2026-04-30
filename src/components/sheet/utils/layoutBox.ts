import type { Rect } from "../types";

export type RectBox = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export function sumRange(values: number[], start: number, end: number) {
  if (start > end) return 0;

  let total = 0;
  for (let index = start; index <= end; index++) {
    total += values[index];
  }
  return total;
}

export function rectToGridBox(
  rect: Rect,
  columnWidths: number[],
  rowHeights: number[],
): RectBox {
  return {
    left: sumRange(columnWidths, 0, rect.sc - 1),
    top: sumRange(rowHeights, 0, rect.sr - 1),
    width: sumRange(columnWidths, rect.sc, rect.ec),
    height: sumRange(rowHeights, rect.sr, rect.er),
  };
}

export function rectToViewportBox(
  rect: Rect,
  columnWidths: number[],
  rowHeights: number[],
  rowHeaderWidth: number,
  colHeaderHeight: number,
  scrollX: number,
  scrollY: number,
): RectBox {
  const gridBox = rectToGridBox(rect, columnWidths, rowHeights);

  return {
    left: rowHeaderWidth + gridBox.left - scrollX,
    top: colHeaderHeight + gridBox.top - scrollY,
    width: gridBox.width,
    height: gridBox.height,
  };
}
