// ColHeader.tsx
import { useEffect } from "react";
import { COLUMN_COUNT } from "./SheetConstants";
import styles from "./ColHeader.module.css";
import { useSheetStore } from "./store/useSheetStore";
import { colToLabel } from "@/utils/a1Utils";

interface ColHeaderProps {
  colHeaderHeight: number;
}

export default function ColHeader({ colHeaderHeight }: ColHeaderProps) {
  const selectCol = useSheetStore((s) => s.selectCol);
  const selection = useSheetStore((s) => s.selection);
  const columnWidths = useSheetStore((s) => s.columnWidths);

  const startResizeCol = useSheetStore((s) => s.startResizeCol);
  const updateResize = useSheetStore((s) => s.updateResize);
  const endResize = useSheetStore((s) => s.endResize);
  const resizing = useSheetStore((s) => s.resizing);

  const openColHeaderMenu = useSheetStore((s) => s.openColHeaderMenu);

  useEffect(() => {
    if (!resizing || resizing.type !== "col") return;
    const onMove = (e: MouseEvent) => {
      e.preventDefault();
      updateResize(e.clientX);
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

  const cols = Array.from({ length: COLUMN_COUNT }).map((_, i) => {
    const selected = !!selection && i >= selection.sc && i <= selection.ec;

    return (
      <div
        key={i}
        className={selected ? `${styles.colHeader} selected` : styles.colHeader}
        style={{ width: columnWidths[i], height: colHeaderHeight }}
        role="button"
        tabIndex={0}
        onMouseDown={(e) => {
          if (e.button !== 0) return;
          e.preventDefault();
          selectCol(i, e.shiftKey);
        }}
        onContextMenu={(e) => {
          e.preventDefault();

          const hasSelection = !!selection;
          const isMulti = hasSelection && selection!.sc !== selection!.ec;
          const insideMulti =
            hasSelection && i >= selection!.sc && i <= selection!.ec;

          // 다중 선택 영역 안 우클릭이면 selection 유지
          // 그 외는 단일 선택으로 변경
          if (!isMulti || !insideMulti) {
            selectCol(i, false);
          }

          // 메뉴 열기
          openColHeaderMenu(i, e.clientX, e.clientY);
        }}
        title={colToLabel(i)}
      >
        {colToLabel(i)}
        <div
          data-resize="col"
          className={styles.colResizeHandle}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            startResizeCol(i, e.clientX);
            document.body.style.cursor = "col-resize";
          }}
        />
      </div>
    );
  });

  return (
    <div className={styles.container} style={{ height: colHeaderHeight }}>
      {cols}
    </div>
  );
}
