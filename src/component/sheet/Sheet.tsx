import { useState } from "react";
import styles from "./Sheet.module.css";
import Corner from "./Corner";
import ColHeader from "./ColHeader";
import RowHeader from "./RowHeader";
import Grid from "./Grid";

export default function Sheet() {
  const [cellWidth, setCellWidth] = useState(100);
  const [cellHeight, setCellHeight] = useState(25);
  const [rowHeaderWidth] = useState(48);
  const [colHeaderHeight] = useState(28);

  return (
    <div className={styles.container}>
      <div className={styles.corner}>
        <Corner />
      </div>

      <div className={styles.colHeader}>
        <ColHeader cellWidth={cellWidth} colHeaderHeight={colHeaderHeight} />
      </div>

      <div className={styles.rowHeader}>
        <RowHeader rowHeaderWidth={rowHeaderWidth} cellHeight={cellHeight} />
      </div>

      <div className={styles.gridBody}>
        <Grid cellWidth={cellWidth} cellHeight={cellHeight} />
      </div>
    </div>
  );
}
