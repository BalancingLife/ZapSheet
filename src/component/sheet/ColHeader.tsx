import { COLUMN_COUNT } from "./SheetConstants";
import styles from "./ColHeader.module.css";
import { getColName } from "@/utils/getColName";
import { useSheetStore } from "./store/useSheetStore";

interface ColHeaderProps {
  colHeaderHeight: number;
}

export default function ColHeader({ colHeaderHeight }: ColHeaderProps) {
  const selectColumn = useSheetStore((s) => s.selectColumn);
  const selection = useSheetStore((s) => s.selection);
  const columnWidths = useSheetStore((s) => s.columnWidths);

  const cols = Array.from({ length: COLUMN_COUNT }).map((_, i) => {
    const selected = !!selection && i >= selection.sc && i <= selection.ec;

    return (
      <div
        key={i}
        className={selected ? `${styles.ColHeader} selected` : styles.ColHeader}
        style={{ width: columnWidths[i] - 1 }} // 기존 -1px 조정 유지
        role="button"
        tabIndex={0}
        onMouseDown={(e) => {
          e.preventDefault();
          selectColumn(i, e.shiftKey); // Shift로 확장
        }}
        title={getColName(i)}
      >
        {getColName(i)}
      </div>
    );
  });

  return (
    <div className={styles.container} style={{ height: colHeaderHeight }}>
      {cols}
    </div>
  );
}
