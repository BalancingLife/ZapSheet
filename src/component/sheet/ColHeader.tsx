import { COLUMN_COUNT } from "./SheetConstants";
import styles from "./ColHeader.module.css";
import { getColName } from "@/utils/getColName";

interface ColHeaderProps {
  cellWidth: number;
  colHeaderHeight: number;
}

export default function ColHeader({
  cellWidth,
  colHeaderHeight,
}: ColHeaderProps) {
  const cols = Array.from({ length: COLUMN_COUNT }).map((_, i) => (
    <div
      key={i}
      className={styles.ColHeader}
      style={{
        width: `${cellWidth - 1}px`, // 왜 인지 모르겠지만 1 px 오차가 남
      }}
    >
      {getColName(i)}
    </div>
  ));

  return (
    <div className={styles.container} style={{ height: colHeaderHeight }}>
      {cols}
    </div>
  );
}
