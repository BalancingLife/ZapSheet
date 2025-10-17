import styles from "./Grid.module.css";
import Cell from "./Cell";
import { ROW_COUNT, COLUMN_COUNT } from "./SheetConstants";
import SelectionOverlay from "./SelectionOverlay";
import { useMemo } from "react";

interface GridProps {
  cellWidth: number;
  cellHeight: number;
}

export default function Grid({ cellWidth, cellHeight }: GridProps) {
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
        className={styles.grid}
        style={{
          gridTemplateColumns: `repeat(${COLUMN_COUNT}, ${cellWidth}px)`,
          gridTemplateRows: `repeat(${ROW_COUNT}, ${cellHeight}px)`,
        }}
      >
        {cells}
        <SelectionOverlay cellWidth={cellWidth} cellHeight={cellHeight} />
      </div>
    </div>
  );
}
