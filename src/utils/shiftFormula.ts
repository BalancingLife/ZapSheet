// src/utils/shiftFormula.ts
import { a1ToPos, colToLabel } from "@/utils/a1Utils";

/**
 * 수식 문자열 안의 셀 참조(A1, B3, AA10 ...)를
 * (dRow, dCol) 만큼 이동시킨 새 수식을 리턴.
 *
 * 예)
 *   shiftFormulaByOffset("=A1+B1", 1, 0) => "=A2+B2"
 *   shiftFormulaByOffset("=SUM(A1,B2)", 2, 0) => "=SUM(A3,B4)"
 */
export function shiftFormulaByOffset(
  formula: string,
  dRow: number,
  dCol: number
): string {
  if (!formula.startsWith("=")) return formula;

  const cellRefRegex = /([A-Z]+)([0-9]+)/g;

  return formula.replace(
    cellRefRegex,
    (match, colStr: string, rowStr: string) => {
      const ref = `${colStr}${rowStr}`;
      const pos = a1ToPos(ref);
      if (!pos) return match;

      const nextRow = pos.row + dRow;
      const nextCol = pos.col + dCol;

      // 음수로 나가면 그냥 원래 참조 유지
      if (nextRow < 0 || nextCol < 0) return match;

      const nextRef = `${colToLabel(nextCol)}${nextRow + 1}`;
      return nextRef;
    }
  );
}
