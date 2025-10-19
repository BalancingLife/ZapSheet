import { ROW_COUNT } from "./SheetConstants";
import styles from "./RowHeader.module.css";
import { useSheetStore } from "./store/useSheetStore";

interface RowHeaderProps {
  rowHeaderWidth: number;
}

export default function RowHeader({ rowHeaderWidth }: RowHeaderProps) {
  const selectRow = useSheetStore((s) => s.selectRow);
  const selection = useSheetStore((s) => s.selection);
  const rowHeights = useSheetStore((s) => s.rowHeights);

  const rows = Array.from({ length: ROW_COUNT }).map((_, i) => {
    const selected = !!selection && i >= selection.sr && i <= selection.er;

    return (
      <div
        key={i}
        className={selected ? `${styles.rowHeader} selected` : styles.rowHeader}
        style={{ height: rowHeights[i] - 1, width: rowHeaderWidth - 1 }}
        role="button"
        tabIndex={0}
        onMouseDown={(e) => {
          e.preventDefault(); // 드래그 충돌 방지
          selectRow(i, e.shiftKey); // Shift 누르면 기존 selection에 합집합
        }}
        title={`${i + 1}`}
      >
        {i + 1}
      </div>
    );
  });

  return (
    <div className={styles.container} style={{ width: rowHeaderWidth }}>
      {rows}
    </div>
  );
}
