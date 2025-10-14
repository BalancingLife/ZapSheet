import styles from "./Cell.module.css";
import { getColName } from "@/utils/getColName";
type CellProps = {
  row: number;
  col: number;
};

export default function Cell({ row, col }: CellProps) {
  return (
    <div className={styles.container}>
      {row + 1},{getColName(col)}
    </div>
  );
}
