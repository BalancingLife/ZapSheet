import { useEffect, useState } from "react";
import styles from "./Sheet.module.css";
import Corner from "./Corner";
import ColHeader from "./ColHeader";
import RowHeader from "./RowHeader";
import Grid from "./Grid";
import { useSheetStore } from "./store/useSheetStore";

export default function Sheet() {
  const loadCellData = useSheetStore((s) => s.loadCellData);
  const editing = useSheetStore((s) => s.editing);
  const selection = useSheetStore((s) => s.selection);
  const clearSelectionCells = useSheetStore((s) => s.clearSelectionCells);

  const [cellWidth] = useState(100);
  const [cellHeight] = useState(25);
  const [rowHeaderWidth] = useState(48);
  const [colHeaderHeight] = useState(28);

  const initLayout = useSheetStore((s) => s.initLayout);
  useEffect(() => {
    initLayout(cellWidth, cellHeight);
  }, [cellWidth, cellHeight, initLayout]);

  useEffect(() => {
    loadCellData();
  }, [loadCellData]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editing) return;
      if (!selection) return;

      if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        void clearSelectionCells(); // JS에서 함수 호출 앞에 void를 붙이면 이것은 비동기로 실행하되, 기다리지 않고 바로 넘어가겠다. 라는 코드
      }
    };

    // window 에게 사용자가 키보드를 누를때 마다 onKey 함수를 호출하라는 뜻.

    window.addEventListener("keydown", onKey); // 컴포넌트가 화면에 나타날 떄 keydown 이벤트를 등록
    return () => window.removeEventListener("keydown", onKey); // 화면에서 사라질때 등록을 해제 하는 구조
  }, [editing, selection, clearSelectionCells]);

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
