export type ClientPointToCellArgs = {
  clientX: number;
  clientY: number;
  gridRect: DOMRect; // gridRef.current.getBoundingClientRect()
  columnWidths: number[];
  rowHeights: number[];
};

/**
 * 브라우저 client 좌표 → (row, col) 셀 인덱스로 변환
 * 그리드 영역 밖이면 null 반환
 */

export function clientPointToCell({
  clientX,
  clientY,
  gridRect,
  columnWidths,
  rowHeights,
}: ClientPointToCellArgs): { row: number; col: number } | null {
  // 그리드 왼쪽 위를 (0,0) 로 맞추기
  const x = clientX - gridRect.left;
  const y = clientY - gridRect.top;

  // 위/왼쪽 바깥
  if (x < 0 || y < 0) return null;

  // 1) 열 찾기 (x 기준)
  let col = -1;
  let accX = 0;
  for (let c = 0; c < columnWidths.length; c++) {
    const w = columnWidths[c];
    if (x >= accX && x < accX + w) {
      col = c;
      break;
    }
    accX += w;
  }

  // 2) 행 찾기 (y 기준)
  let row = -1;
  let accY = 0;
  for (let r = 0; r < rowHeights.length; r++) {
    const h = rowHeights[r];
    if (y >= accY && y < accY + h) {
      row = r;
      break;
    }
    accY += h;
  }

  if (row === -1 || col === -1) {
    // 오른쪽/아래 바깥
    return null;
  }

  return { row, col };
}
