import { useEffect, useRef } from "react";
import { useSheetStore } from "./store/useSheetStore";
import type { Rect } from "./store/useSheetStore";
import styles from "./EditOverlay.module.css";
import { DEFAULT_FONT_SIZE } from "./SheetConstants";

type EditOverlayProps = {
  columnWidths: number[];
  rowHeights: number[];
  rowHeaderWidth: number;
  colHeaderHeight: number;
  scrollX: number;
  scrollY: number;
};

function rectToBox(
  rect: Rect,
  columnWidths: number[],
  rowHeights: number[],
  rowHeaderWidth: number,
  colHeaderHeight: number,
  scrollX: number,
  scrollY: number
) {
  const sum = (arr: number[], s: number, e: number) => {
    let acc = 0;
    for (let i = s; i <= e; i++) acc += arr[i];
    return acc;
  };

  const top = colHeaderHeight + sum(rowHeights, 0, rect.sr - 1) - scrollY;
  const left = rowHeaderWidth + sum(columnWidths, 0, rect.sc - 1) - scrollX;
  const width = sum(columnWidths, rect.sc, rect.ec);
  const height = sum(rowHeights, rect.sr, rect.er);

  return { top, left, width, height };
}

export default function EditOverlay({
  columnWidths,
  rowHeights,
  rowHeaderWidth,
  colHeaderHeight,
  scrollX,
  scrollY,
}: EditOverlayProps) {
  const editing = useSheetStore((s) => s.editing);
  const editingSource = useSheetStore((s) => s.editingSource);
  const getMerge = useSheetStore((s) => s.getMergeRegionAt);
  const commitEdit = useSheetStore((s) => s.commitEdit);
  const cancelEdit = useSheetStore((s) => s.cancelEdit);
  const move = useSheetStore((s) => s.move);

  const formulaMirror = useSheetStore((s) => s.formulaMirror);
  const setFormulaInput = useSheetStore((s) => s.setFormulaInput);

  // 편집 대상 셀(master 기준) 스타일 가져오기
  const cellStyle = useSheetStore((s) => {
    const ed = s.editing;
    if (!ed) return undefined;
    const mr = s.getMergeRegionAt(ed.row, ed.col);
    const baseRow = mr ? mr.sr : ed.row;
    const baseCol = mr ? mr.sc : ed.col;
    return s.stylesByCell[`${baseRow}:${baseCol}`];
  });

  const fontSize = cellStyle?.fontSize ?? DEFAULT_FONT_SIZE;

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 편집 상태일 때만 포커스 실행
    if (editing && editingSource === "cell") {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [editing, editingSource]);

  // 편집 상태가 아니라면 overlay 없음
  if (!editing || editingSource !== "cell") return null;

  // 편집 좌표 기준 병합영역 계산
  const mr = getMerge(editing.row, editing.col);
  const rect: Rect = mr
    ? mr
    : { sr: editing.row, sc: editing.col, er: editing.row, ec: editing.col };

  const box = rectToBox(
    rect,
    columnWidths,
    rowHeights,
    rowHeaderWidth,
    colHeaderHeight,
    scrollX,
    scrollY
  );

  return (
    <div
      style={{
        position: "absolute",
        top: box.top,
        left: box.left,
        width: box.width,
        height: box.height,
        zIndex: 5000, // 셀 위
        // 편집 중엔 input이 클릭 가능해야 하니까 auto
        pointerEvents: "auto",
      }}
    >
      <input
        ref={inputRef}
        className={styles.editorInput}
        value={formulaMirror}
        onChange={(e) => setFormulaInput(e.target.value)}
        style={{
          //  편집 대상 셀 스타일 반영
          width: "100%",
          height: "100%",
          boxSizing: "border-box",
          fontSize: `${fontSize}px`,
          fontWeight: cellStyle?.bold ? "bold" : "normal",
          fontStyle: cellStyle?.italic ? "italic" : "normal",
          textDecoration: cellStyle?.underline ? "underline" : "none",
          color: cellStyle?.textColor,
        }}
        onKeyDown={(e) => {
          e.stopPropagation();

          const v = e.currentTarget.value;

          if (e.key === "Enter") {
            e.preventDefault();

            commitEdit(v);
            move("down");
          } else if (e.key === "Escape") {
            e.preventDefault();
            cancelEdit();
          } else if (e.key === "Tab") {
            e.preventDefault();
            commitEdit(v);
          }
        }}
        onBlur={(e) => {
          const st = useSheetStore.getState();

          // 이미 편집이 끝났거나, cell 편집이 아니면 아무것도 안 함
          if (!st.editing || st.editingSource !== "cell") return;

          commitEdit(e.target.value);
        }}
      />
    </div>
  );
}
