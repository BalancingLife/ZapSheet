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

  // 리사이즈 제어
  const startResizeRow = useSheetStore((s) => s.startResizeRow);
  const updateResize = useSheetStore((s) => s.updateResize);
  const endResize = useSheetStore((s) => s.endResize);
  const resizing = useSheetStore((s) => s.resizing);

  // 전역 mousemove / mouseup 바인딩
  useEffect(() => {
    if (!resizing || resizing.type !== "row") return; // 행 리사이즈 중일 때만 이 효과 실행.
    const onMove = (e: MouseEvent) => {
      e.preventDefault();
      updateResize(e.clientY);
    };
    const onUp = () => {
      endResize();
      document.body.style.cursor = "";

      // 전역(window)에 이벤트를 걸어두면
      // 마우스가 헤더 밖으로 나가도 드래그가 계속 인식
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
          e.preventDefault(); // 드래그 충돌 방지
          selectRow(i, e.shiftKey); // Shift 누르면 기존 selection에 합집합
        }}
        title={`${i + 1}`}
      >
        {i + 1}
        {/* 하단 리사이즈 핸들 */}
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
