import styles from "./Grid.module.css";
import Cell from "./Cell";
import { ROW_COUNT, COLUMN_COUNT } from "./SheetConstants";
import SelectionOverlay from "./SelectionOverlay";
import { useMemo, useRef, useState } from "react";
import { useSheetStore } from "./store/useSheetStore";

import { clientPointToCell } from "@/utils/clientPointToCell";
import type { Rect } from "./store/useSheetStore";

export default function Grid() {
  const gridRef = useRef<HTMLDivElement | null>(null);

  // fill drag 상태
  const [isFillDragging, setIsFillDragging] = useState(false);
  const fillSourceRectRef = useRef<Rect | null>(null);
  const fillTargetCellRef = useRef<{ row: number; col: number } | null>(null);

  const selection = useSheetStore((s) => s.selection);
  const fillSelectionTo = useSheetStore((s) => s.fillSelectionTo);

  const columnWidths = useSheetStore((s) => s.columnWidths);
  const rowHeights = useSheetStore((s) => s.rowHeights);

  const colTemplate = columnWidths.map((w) => `${w}px`).join(" ");
  const rowTemplate = rowHeights.map((h) => `${h}px`).join(" ");

  // Cell 컴포넌트 Array.from({length}).map 이용하여 ROWS.COUNT * COLUMNS.COUNT 개 만들기
  const cells = useMemo(() => {
    return Array.from({ length: ROW_COUNT * COLUMN_COUNT }).map((_, i) => {
      const row = Math.floor(i / COLUMN_COUNT);
      const col = i % COLUMN_COUNT;
      return <Cell key={`${row}-${col}`} row={row} col={col} />;
    });
  }, []);

  // mousemove: 드래그 중 마우스 위치를 셀 좌표로 변환
  const handleFillMouseMove = (e: MouseEvent) => {
    if (!isFillDragging) return;
    if (!gridRef.current) return;

    const hit = clientPointToCell({
      clientX: e.clientX,
      clientY: e.clientY,
      gridRect: gridRef.current.getBoundingClientRect(),
      columnWidths,
      rowHeights,
    });

    if (!hit) return;

    fillTargetCellRef.current = hit;
  };

  // mouseup: 드래그 종료 시 자동 채우기 실행
  const handleFillMouseUp = () => {
    if (!isFillDragging) return;

    setIsFillDragging(false);
    window.removeEventListener("mousemove", handleFillMouseMove);
    window.removeEventListener("mouseup", handleFillMouseUp);

    const src = fillSourceRectRef.current;
    const hit = fillTargetCellRef.current;
    if (!src || !hit) return;

    const { row } = hit; // ✅ col 안씀

    // ⬇️ 아래로만 확장하는 최소 버전
    if (row > src.er) {
      const target: Rect = {
        sr: src.er + 1,
        sc: src.sc,
        er: row,
        ec: src.ec,
      };
      fillSelectionTo(target);
    }
  };

  // fill handle 드래그 시작
  const onFillHandleMouseDown = () => {
    if (!selection) return;

    fillSourceRectRef.current = selection;
    fillTargetCellRef.current = null;
    setIsFillDragging(true);

    window.addEventListener("mousemove", handleFillMouseMove);
    window.addEventListener("mouseup", handleFillMouseUp);
  };

  return (
    <div className={styles.container}>
      <div
        ref={gridRef}
        className={styles.grid}
        style={{
          gridTemplateColumns: colTemplate,
          gridTemplateRows: rowTemplate,
        }}
      >
        {cells}
        <SelectionOverlay
          columnWidths={columnWidths}
          rowHeights={rowHeights}
          onFillHandleMouseDown={onFillHandleMouseDown}
        />
      </div>
    </div>
  );
}
