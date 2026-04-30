import { COLUMN_COUNT, ROW_COUNT } from "../SheetConstants";
import type { Dir, Pos, Rect } from "../types";

export const keyOf = (row: number, col: number) => `${row}:${col}`;

export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export const clampRow = (row: number) => clamp(row, 0, ROW_COUNT - 1);

export const clampCol = (col: number) => clamp(col, 0, COLUMN_COUNT - 1);

export function normRect(a: Pos, b: Pos): Rect {
  return {
    sr: Math.min(a.row, b.row),
    sc: Math.min(a.col, b.col),
    er: Math.max(a.row, b.row),
    ec: Math.max(a.col, b.col),
  };
}

const DIR: Record<Dir, { dr: number; dc: number }> = {
  up: { dr: -1, dc: 0 },
  down: { dr: 1, dc: 0 },
  left: { dr: 0, dc: -1 },
  right: { dr: 0, dc: 1 },
};

export const step1 = (pos: Pos, dir: Dir): Pos => {
  const { dr, dc } = DIR[dir];
  return { row: clampRow(pos.row + dr), col: clampCol(pos.col + dc) };
};

export const toEdge = (pos: Pos, dir: Dir): Pos => {
  if (dir === "up") return { row: 0, col: pos.col };
  if (dir === "down") return { row: ROW_COUNT - 1, col: pos.col };
  if (dir === "left") return { row: pos.row, col: 0 };
  return { row: pos.row, col: COLUMN_COUNT - 1 };
};

export const rectW = (rect: Rect) => rect.ec - rect.sc + 1;

export const rectH = (rect: Rect) => rect.er - rect.sr + 1;

export function rectToCells(rect: Rect): Pos[] {
  const cells: Pos[] = [];
  for (let row = rect.sr; row <= rect.er; row++) {
    for (let col = rect.sc; col <= rect.ec; col++) {
      cells.push({ row, col });
    }
  }
  return cells;
}

export function rectsIntersect(a: Rect, b: Rect): boolean {
  return !(a.er < b.sr || a.sr > b.er || a.ec < b.sc || a.sc > b.ec);
}

export function rectContainsCell(rect: Rect, row: number, col: number): boolean {
  return row >= rect.sr && row <= rect.er && col >= rect.sc && col <= rect.ec;
}
