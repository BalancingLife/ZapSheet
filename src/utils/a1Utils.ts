import { type Rect } from "@/components/sheet/store/useSheetStore";

// 열 번호(index)를 “열 이름(A, B, C, …, Z, AA, AB …)”으로 변환하는 함수
export function colToLabel(index: number): string {
  let n = index;
  let s = "";
  while (n >= 0) {
    s = String.fromCharCode((n % 26) + 65) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}

/** A1 → Pos {row:0,col:0} */
export function a1ToPos(a1: string): { row: number; col: number } | null {
  const s = a1.trim().toUpperCase();
  const m = /^([A-Z]+)\s*([0-9]+)$/.exec(s);
  if (!m) return null;

  const [, colStr, rowStr] = m;
  let col = 0;
  for (let i = 0; i < colStr.length; i++) {
    col = col * 26 + (colStr.charCodeAt(i) - 64); // 'A'->1
  }
  col -= 1;

  const row = parseInt(rowStr, 10) - 1;
  if (row < 0 || col < 0) return null;
  return { row, col };
}

/** "B2" 또는 "A1:C5" → Rect(0-indexed) */
export function a1ToRect(input: string): Rect | null {
  const raw = input.replace(/\s+/g, "").toUpperCase();
  if (!raw) return null;

  if (raw.includes(":")) {
    const [lhs, rhs] = raw.split(":");
    const p1 = a1ToPos(lhs);
    const p2 = a1ToPos(rhs);
    if (!p1 || !p2) return null;
    const sr = Math.min(p1.row, p2.row);
    const sc = Math.min(p1.col, p2.col);
    const er = Math.max(p1.row, p2.row);
    const ec = Math.max(p1.col, p2.col);
    return { sr, sc, er, ec };
  }

  const p = a1ToPos(raw);
  return p ? { sr: p.row, sc: p.col, er: p.row, ec: p.col } : null;
}

/** Rect → "A1" 또는 "A1:C5" */
export function rectToA1(rect: Rect): string {
  const a = `${colToLabel(rect.sc)}${rect.sr + 1}`;
  const b = `${colToLabel(rect.ec)}${rect.er + 1}`;
  return rect.sr === rect.er && rect.sc === rect.ec ? a : `${a}:${b}`;
}
