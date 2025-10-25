import { useEffect, useState } from "react";
import styles from "./Sheet.module.css";
import Corner from "./Corner";
import ColHeader from "./ColHeader";
import RowHeader from "./RowHeader";
import Grid from "./Grid";
import { useSheetStore } from "./store/useSheetStore";
import { supabase } from "@/lib/supabaseClient";

export default function Sheet() {
  const [cellWidth] = useState(100);
  const [cellHeight] = useState(25);
  const [rowHeaderWidth] = useState(48);
  const [colHeaderHeight] = useState(28);

  const initLayout = useSheetStore((s) => s.initLayout);
  useEffect(() => {
    initLayout(cellWidth, cellHeight);
  }, [cellWidth, cellHeight, initLayout]);

  return (
    <div className={styles.container}>
      <div className={styles.corner}>
        <Corner />
      </div>

      <div className={styles.colHeader}>
        <ColHeader colHeaderHeight={colHeaderHeight} />
      </div>

      <div className={styles.rowHeader}>
        <RowHeader rowHeaderWidth={rowHeaderWidth} />
      </div>

      <div className={styles.gridBody}>
        <Grid />
      </div>
    </div>
  );
}
