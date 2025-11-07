import { toDisplayString, DISPLAY_ERROR } from "@/utils/formula";
import { memo, useRef, useEffect, useCallback } from "react";
import styles from "./Cell.module.css";
import { useSheetStore } from "./store/useSheetStore";
import { formatWithComma, isNumericValue } from "@/utils/numberFormat";
import { DEFAULT_FONT_SIZE } from "./SheetConstants";
import { useBorderCss } from "./store/useSheetStore";

type CellProps = {
  row: number;
  col: number;
};

function Cell({ row, col }: CellProps) {
  const isFocused = useSheetStore(
    (s) => s.focus?.row === row && s.focus?.col == col
  );
  const isEditing = useSheetStore(
    (s) => s.editing?.row === row && s.editing?.col === col
  );

  const editingSource = useSheetStore((s) => s.editingSource);

  const setFocus = useSheetStore((s) => s.setFocus);

  // SelectionSlice
  const isSelected = useSheetStore((s) => s.isSelected(row, col));
  const startSel = useSheetStore((s) => s.startSelection);
  const updateSel = useSheetStore((s) => s.updateSelection);
  const endSel = useSheetStore((s) => s.endSelection);

  const move = useSheetStore((s) => s.move);
  const startEdit = useSheetStore((s) => s.startEdit);
  const cancelEdit = useSheetStore((s) => s.cancelEdit);
  const commitEdit = useSheetStore((s) => s.commitEdit);

  const resolveCell = useSheetStore((s) => s.resolveCellNumeric);

  // 표시 값
  const val = useSheetStore((s) => {
    const isThis = s.editing?.row === row && s.editing?.col === col;
    if (isThis && s.editingSource === "formula") return s.formulaMirror; // ★
    return s.data[`${row}:${col}`] ?? ""; // getValue 대신 직접 구독
  });
  const displayVal = toDisplayString(val, { resolveCell });
  const isErr = displayVal === DISPLAY_ERROR;
  const isDisplayNumeric = isNumericValue(displayVal);
  const alignClass = isDisplayNumeric
    ? styles.alignBottomRight
    : styles.alignBottomLeft;

  const fontSize = useSheetStore(
    (s) => s.stylesByCell[`${row}:${col}`]?.fontSize ?? DEFAULT_FONT_SIZE
  );

  const cellRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const style = useSheetStore((s) => s.stylesByCell[`${row}:${col}`]);
  const borderCss = useBorderCss(row, col);

  useEffect(() => {
    if (isFocused && isEditing && editingSource === "cell") {
      // 편집용 input에 포커스(아래 useEffect에서 처리)
    } else if (isFocused && !isEditing) {
      cellRef.current?.focus();
    }
  }, [isFocused, isEditing, editingSource]);

  // 편집 input 포커스 (★ cell 편집일 때만)
  useEffect(() => {
    if (isEditing && editingSource === "cell") {
      requestAnimationFrame(() => {
        const el = inputRef.current;
        if (el) {
          el.focus();
          el.select();
        }
      });
    }
  }, [isEditing, editingSource]);

  // 편집 커밋
  const commit = (nextVal?: string) => {
    commitEdit(nextVal ?? val);
  };

  // ESC시 편집 취소, 내용 null 처리
  const cancel = () => {
    cancelEdit();
    setFocus({ row, col });
  };

  //  Shift면 포커스 금지 + 브라우저 포커스 이동 차단
  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.button !== 0) return; // 좌클릭만
      const extend = e.shiftKey === true;

      // 텍스트 선택/포커스 이동 방지 (특히 Shift-클릭에서 DOM 포커스 튀는 것 막기)
      e.preventDefault();

      startSel({ row, col }, extend);

      // Shift 아닐 때만 포커스 이동 (기준점 갱신)
      if (!extend) setFocus({ row, col });
    },
    [row, col, startSel, setFocus]
  );

  const onMouseEnter = useCallback(() => {
    // 좌클릭 드래그 중일 때만 선택 갱신
    // (마우스 버튼 상태는 e.buttons를 쓰지만, 간단히 isSelecting 플래그로도 충분)
    if (useSheetStore.getState().isSelecting) {
      updateSel({ row, col });
    }
  }, [row, col, updateSel]);

  const onMouseUp = useCallback(() => {
    endSel();
  }, [endSel]);

  const isCellEditing = isEditing && editingSource === "cell"; // ★

  if (isCellEditing) {
    return (
      <div
        ref={cellRef}
        role="gridcell"
        className={`${styles.container} ${isFocused ? styles.focused : ""}`}
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.preventDefault()}
        style={{ fontSize: `${fontSize}px` }}
      >
        <input
          ref={inputRef}
          className={styles.editorInput}
          defaultValue={val}
          onInput={(e) => {
            // 셀에서 입력 중일 때 FormulaInput 미러 동기화
            const next = (e.target as HTMLInputElement).value;
            useSheetStore.getState().setFormulaInput(next);
          }}
          onKeyDown={(e) => {
            e.stopPropagation();
            const val = (e.target as HTMLInputElement).value;

            if (e.key === "Enter") {
              e.preventDefault();
              commit(val);
              move("down"); // enter 시 한칸 아래로 이동
            } else if (e.key === "Escape") {
              e.preventDefault();
              cancel();
            } else if (e.key === "Tab") {
              e.preventDefault();
              commit(val);
              move("right");
            }
          }}
          onBlur={(e) => commit(e.currentTarget.value)}
        />
      </div>
    );
  }

  // formula 편집 중이거나, 편집이 아닌 일반 보기
  return (
    <div
      ref={cellRef}
      tabIndex={0} // tabIndex => 이 요소가 키보드 포커스를 받을 수 있게 만든다
      role="gridcell" // 시멘틱, 접근성을 위해, 브라우저에게 알려줌
      className={`${styles.cellView} ${alignClass} ${
        isFocused ? styles.focused : ""
      } ${isSelected ? "selected" : ""} ${isErr ? styles.error : ""}`}
      style={{
        ...borderCss,
        color: isErr ? "#d93025" : style?.textColor,
        backgroundColor: style?.bgColor,
        fontSize: `${fontSize}px`,
        fontWeight: style?.bold ? "bold" : "normal",
        fontStyle: style?.italic ? "italic" : "normal",
        textDecoration: style?.underline ? "underline" : "none",
      }}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onMouseUp={onMouseUp}
      onDoubleClick={() => startEdit({ row, col })}
      title={val ?? ""}
    >
      {isEditing && editingSource === "formula"
        ? val // 포뮬라 편집 중엔 수식 그대로
        : isDisplayNumeric
        ? formatWithComma(displayVal)
        : displayVal}
    </div>
  );
}

export default memo(Cell); // 리액트 메모를 이용해 props가 바뀐 Cell컴포넌트만 리렌더링
