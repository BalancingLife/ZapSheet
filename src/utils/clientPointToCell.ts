// src/utils/clientPointToCell.ts
export type ClientPointToCellArgs = {
  clientX: number;
  clientY: number;
  gridEl: HTMLDivElement | null;
  columnWidths: number[];
  rowHeights: number[];
};

export type CellPos = { row: number; col: number };

/**
 * 화면 좌표(clientX/Y) + grid DOM + 열/행 폭 배열 -> 셀 좌표(row,col)
 * 그리드 바깥이면 null
 */
export function clientPointToCell({
  clientX,
  clientY,
  gridEl,
  columnWidths,
  rowHeights,
}: ClientPointToCellArgs): CellPos | null {
  if (!gridEl) return null;

  const rect = gridEl.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;

  // 그리드 좌상단 밖이면 무시
  if (x < 0 || y < 0) return null;

  // 열 찾기
  let accX = 0;
  let col = -1;
  for (let c = 0; c < columnWidths.length; c++) {
    accX += columnWidths[c];
    if (x < accX) {
      col = c;
      break;
    }
  }

  // 행 찾기
  let accY = 0;
  let row = -1;
  for (let r = 0; r < rowHeights.length; r++) {
    accY += rowHeights[r];
    if (y < accY) {
      row = r;
      break;
    }
  }

  if (row < 0 || col < 0) return null;
  return { row, col };
}
