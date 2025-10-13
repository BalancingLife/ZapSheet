import styles from "./Cell.module.css";

type CellProps = {
  row: number;
  col: number;
};

export default function Cell({ row, col }: CellProps) {
  return (
    <div className={styles.container}>
      Cell 입니다.{row}열,{col}행 입니다.
    </div>
  );
}
