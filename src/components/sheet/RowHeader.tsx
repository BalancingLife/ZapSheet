// RowHeader.tsx
import { useEffect } from "react";
import { ROW_COUNT } from "./SheetConstants";
import styles from "./RowHeader.module.css";
import { useSheetStore } from "./store/useSheetStore";

interface RowHeaderProps {
  rowHeaderWidth: number;
}

export default function RowHeader({ rowHeaderWidth }: RowHeaderProps) {
  const selectRow = useSheetStore((s) => s.selectRow);
  const selection = useSheetStore((s) => s.selection);
  const rowHeights = useSheetStore((s) => s.rowHeights);

  const startResizeRow = useSheetStore((s) => s.startResizeRow);
  const updateResize = useSheetStore((s) => s.updateResize);
  const endResize = useSheetStore((s) => s.endResize);
  const resizing = useSheetStore((s) => s.resizing);

  const openRowHeaderMenu = useSheetStore((s) => s.openRowHeaderMenu);

  // 리사이즈 전역 바인딩
  useEffect(() => {
    if (!resizing || resizing.type !== "row") return;
    const onMove = (e: MouseEvent) => {
      e.preventDefault();
      updateResize(e.clientY);
    };
    const onUp = () => {
      endResize();
      document.body.style.cursor = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [resizing, updateResize, endResize]);

  const rows = Array.from({ length: ROW_COUNT }).map((_, i) => {
    const selected = !!selection && i >= selection.sr && i <= selection.er;

    return (
      <div
        key={i}
        className={selected ? `${styles.rowHeader} selected` : styles.rowHeader}
        style={{ height: rowHeights[i] - 1, width: rowHeaderWidth - 1 }}
        role="button"
        tabIndex={0}
        onMouseDown={(e) => {
          // 왼쪽 버튼일 때만 selection 변경
          if (e.button !== 0) return;
          e.preventDefault();
          selectRow(i, e.shiftKey);
        }}
        onContextMenu={(e) => {
          e.preventDefault();

          const hasSelection = !!selection;
          const isMulti = hasSelection && selection!.sr !== selection!.er;
          const insideMulti =
            hasSelection && i >= selection!.sr && i <= selection!.er;

          // 다중 선택 + 영역 안 우클릭이면 selection 유지
          // 그 외에는 이 행만 단일 선택으로 교체
          if (!isMulti || !insideMulti) {
            selectRow(i, false);
          }

          openRowHeaderMenu(i, e.clientX, e.clientY);
        }}
        title={`${i + 1}`}
      >
        {i + 1}
        <div
          data-resize="row"
          className={styles.rowResizeHandle}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            startResizeRow(i, e.clientY);
            document.body.style.cursor = "row-resize";
          }}
        />
      </div>
    );
  });

  return (
    <div className={styles.container} style={{ width: rowHeaderWidth }}>
      {rows}
    </div>
  );
}
