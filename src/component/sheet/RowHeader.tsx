import { ROW_COUNT } from "./SheetConstants";
import styles from "./RowHeader.module.css";

interface RowHeaderProps {
  rowHeaderWidth: number;
  cellHeight: number;
}

export default function RowHeader({
  rowHeaderWidth,
  cellHeight,
}: RowHeaderProps) {
  const rows = Array.from({ length: ROW_COUNT }).map((_, i) => (
    <div
      key={i}
      className={styles.rowHeader}
      style={{
        width: `${rowHeaderWidth - 1}px`, // 왜 인지 모르겠지만 1 px 오차가 남
        height: `${cellHeight - 1}px`,
      }}
    >
      {i + 1}
    </div>
  ));

  return <div>{rows}</div>;
}
