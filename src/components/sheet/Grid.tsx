import styles from "./Grid.module.css";
import Cell from "./Cell";
import { ROW_COUNT, COLUMN_COUNT } from "./SheetConstants";
import SelectionOverlay from "./SelectionOverlay";
import { useMemo, useRef } from "react";
import { useSheetStore } from "./store/useSheetStore";

export default function Grid() {
  const gridRef = useRef<HTMLDivElement | null>(null);
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
          gridRef={gridRef}
        />
      </div>
    </div>
  );
}
