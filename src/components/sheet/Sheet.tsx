import { useEffect, useState } from "react";
import styles from "./Sheet.module.css";
import Corner from "./Corner";
import ColHeader from "./ColHeader";
import RowHeader from "./RowHeader";
import Grid from "./Grid";
import { useSheetStore } from "./store/useSheetStore";
import SheetSkeleton from "./SheetSkeleton";

export default function Sheet() {
  const loadCellData = useSheetStore((s) => s.loadCellData);
  const editing = useSheetStore((s) => s.editing);
  const focus = useSheetStore((s) => s.focus);
  const selection = useSheetStore((s) => s.selection);

  const clearSelectionCells = useSheetStore((s) => s.clearSelectionCells);

  const [rowHeaderWidth] = useState(48);
  const [colHeaderHeight] = useState(28);

  const setSheetId = useSheetStore((s) => s.setSheetId);
  const loadLayout = useSheetStore((s) => s.loadLayout);
  const isLayoutReady = useSheetStore((s) => s.isLayoutReady);

  const startEdit = useSheetStore((s) => s.startEdit);
  const move = useSheetStore((s) => s.move);
  const extendSelectionByArrow = useSheetStore((s) => s.extendSelectionByArrow);

  useEffect(() => {
    setSheetId("default");
    loadLayout().then(() => {
      // 레이아웃 준비된 뒤에 셀 데이터 로드
      loadCellData();
    });
  }, [setSheetId, loadLayout, loadCellData]);

  // 전역 키보드 처리
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editing) return;
      if (!selection) return;

      const isArrow =
        e.key === "ArrowUp" ||
        e.key === "ArrowDown" ||
        e.key === "ArrowLeft" ||
        e.key === "ArrowRight";

      // ---- 1) 방향키 : 포커스 1칸 이동 ----
      if (isArrow && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        const dir =
          e.key === "ArrowUp"
            ? "up"
            : e.key === "ArrowDown"
            ? "down"
            : e.key === "ArrowLeft"
            ? "left"
            : "right";
        move(dir);
        return;
      }

      // ---- 2) 시프트 + 방향키 : Selection 확장
      if (e.shiftKey && isArrow) {
        e.preventDefault();
        e.stopPropagation(); // ← 다른 곳으로 못 흘러가게

        const dir =
          e.key === "ArrowUp"
            ? "up"
            : e.key === "ArrowDown"
            ? "down"
            : e.key === "ArrowLeft"
            ? "left"
            : "right";
        extendSelectionByArrow(dir);
        return;
      }

      // 3) Delete/Backspace : 선택영역 삭제
      if (e.key === "Backspace" || e.key === "Delete") {
        if (!selection) return;
        e.preventDefault();
        clearSelectionCells(); // JS에서 함수 호출 앞에 void를 붙이면 이것은 비동기로 실행하되, 기다리지 않고 바로 넘어가겠다. 라는 코드
        return;
      }
      // 4) Enter/F2: 현재 focus 편집 시작
      if ((e.key === "Enter" || e.key === "F2") && focus) {
        e.preventDefault();
        e.stopPropagation();
        startEdit(focus);
        return;
      }

      // 5) Tab: 오른쪽으로 이동
      if (e.key === "Tab") {
        e.preventDefault();
        e.stopPropagation();
        move("right");
        return;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    editing,
    selection,
    focus,
    move,
    startEdit,
    extendSelectionByArrow,
    clearSelectionCells,
  ]);

  // 레이아웃 준비 전엔 스켈레톤 UI 렌더
  if (!isLayoutReady) {
    return (
      <SheetSkeleton
        rowHeaderWidth={rowHeaderWidth}
        colHeaderHeight={colHeaderHeight}
      />
    );
  }

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
