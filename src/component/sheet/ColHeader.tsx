import { COLUMN_COUNT } from "./SheetConstants";
import styles from "./ColHeader.module.css";
import { getColName } from "@/utils/getColName";
import { useSheetStore } from "./store/useSheetStore";

interface ColHeaderProps {
  cellWidth: number;
  colHeaderHeight: number;
}

export default function ColHeader({
  cellWidth,
  colHeaderHeight,
}: ColHeaderProps) {
  const selectColumn = useSheetStore((s) => s.selectColumn);
  const selection = useSheetStore((s) => s.selection);

  const cols = Array.from({ length: COLUMN_COUNT }).map((_, i) => {
    const selected = !!selection && i >= selection.sc && i <= selection.ec;

    return (
      <div
        key={i}
        className={selected ? `${styles.ColHeader} selected` : styles.ColHeader}
        style={{
          width: `${cellWidth - 1}px`, // 왜 인지 모르겠지만 1 px 오차가 남
        }}
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
