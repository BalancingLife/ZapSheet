import { useEffect } from "react";
import { COLUMN_COUNT } from "./SheetConstants";
import styles from "./ColHeader.module.css";
import { colToLabel } from "@/utils/cellAddress";
import { useSheetStore } from "./store/useSheetStore";

interface ColHeaderProps {
  colHeaderHeight: number;
}

export default function ColHeader({ colHeaderHeight }: ColHeaderProps) {
  const selectColumn = useSheetStore((s) => s.selectColumn);
  const selection = useSheetStore((s) => s.selection);
  const columnWidths = useSheetStore((s) => s.columnWidths);

  const startResizeCol = useSheetStore((s) => s.startResizeCol);
  const updateResize = useSheetStore((s) => s.updateResize);
  const endResize = useSheetStore((s) => s.endResize);
  const resizing = useSheetStore((s) => s.resizing);

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

  const colTemplate = columnWidths.map((w) => `${w}px`).join(" ");

  const cols = Array.from({ length: COLUMN_COUNT }).map((_, i) => {
    const selected = !!selection && i >= selection.sc && i <= selection.ec;

    return (
      <div
        key={i}
        className={selected ? `${styles.colHeader} selected` : styles.colHeader}
        style={{ width: columnWidths[i] - 1 }} // 기존 -1px 조정 유지
        role="button"
        tabIndex={0}
        onMouseDown={(e) => {
          e.preventDefault();
          selectColumn(i, e.shiftKey); // Shift로 확장
        }}
        title={colToLabel(i)}
      >
        {colToLabel(i)}

        {/* 크기 변경 div */}

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
    <div
      className={styles.container}
      style={{ height: colHeaderHeight, gridTemplateColumns: colTemplate }}
    >
      {cols}
    </div>
  );
}
