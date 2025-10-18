import { ROW_COUNT } from "./SheetConstants";
import styles from "./RowHeader.module.css";
import { useSheetStore } from "./store/useSheetStore";

interface RowHeaderProps {
  rowHeaderWidth: number;
  cellHeight: number;
}

export default function RowHeader({
  rowHeaderWidth,
  cellHeight,
}: RowHeaderProps) {
  const selectRow = useSheetStore((s) => s.selectRow);
  const selection = useSheetStore((s) => s.selection);

  const rows = Array.from({ length: ROW_COUNT }).map((_, i) => {
    const selected = !!selection && i >= selection.sr && i <= selection.er;

    return (
      <div
        key={i}
        className={selected ? `${styles.rowHeader} selected` : styles.rowHeader}
        style={{
          width: `${rowHeaderWidth - 1}px`, // 왜 인지 모르겠지만 1 px 오차가 남
          height: `${cellHeight - 1}px`,
        }}
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
