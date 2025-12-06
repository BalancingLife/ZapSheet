// src/components/sheet/Cell.tsx

import { toDisplayString, DISPLAY_ERROR } from "@/utils/formula";
import { memo, useRef, useEffect, useCallback } from "react";
import styles from "./Cell.module.css";
import { useSheetStore } from "./store/useSheetStore";
import { formatWithComma, isNumericValue } from "@/utils/numberFormat";
import { DEFAULT_FONT_SIZE } from "./SheetConstants";
import { useBorderCss } from "./store/useSheetStore";
import { colToLabel, rectToA1 } from "@/utils/a1Utils";

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

  const startEdit = useSheetStore((s) => s.startEdit);

  const resolveCell = useSheetStore((s) => s.resolveCellNumeric);

  const val = useSheetStore((s) => {
    // ① 이 셀이 병합 영역에 속해 있으면 master 좌표로 강제
    const mr = s.getMergeRegionAt(row, col);
    const baseRow = mr ? mr.sr : row;
    const baseCol = mr ? mr.sc : col;
    const key = `${baseRow}:${baseCol}`;

    // ② 포뮬라 편집 중이면, master 기준으로만 mirror 사용
    const isThis = s.editing?.row === baseRow && s.editing?.col === baseCol;
    if (isThis && s.editingSource === "formula") return s.formulaMirror;

    return s.data[key] ?? "";
  });

  const displayVal = toDisplayString(val, { resolveCell });
  const isErr = displayVal === DISPLAY_ERROR;
  const style = useSheetStore((s) => {
    const mr = s.getMergeRegionAt(row, col);
    const baseRow = mr ? mr.sr : row;
    const baseCol = mr ? mr.sc : col;
    return s.stylesByCell[`${baseRow}:${baseCol}`];
  });

  const fontSize = useSheetStore((s) => {
    const mr = s.getMergeRegionAt(row, col);
    const baseRow = mr ? mr.sr : row;
    const baseCol = mr ? mr.sc : col;
    return (
      s.stylesByCell[`${baseRow}:${baseCol}`]?.fontSize ?? DEFAULT_FONT_SIZE
    );
  });

  const isDisplayNumeric = isNumericValue(displayVal);

  //  최종 정렬 결정: 스타일에 textAlign 있으면 우선, 없으면 숫자는 right / 나머지는 left
  const computedAlign: "left" | "center" | "right" =
    style?.textAlign ?? (isDisplayNumeric ? "right" : "left");

  //  정렬에 따라 CSS 클래스 매핑
  const alignClass =
    computedAlign === "right"
      ? styles.alignBottomRight
      : computedAlign === "center"
      ? styles.alignBottomCenter
      : styles.alignBottomLeft;

  const cellRef = useRef<HTMLDivElement>(null);

  const borderCss = useBorderCss(row, col);

  // ✅ 병합 정보 조회
  const mergeRegion = useSheetStore((s) => s.getMergeRegionAt(row, col));
  const isMerged = !!mergeRegion;

  // ✅ "이 병합 영역이 포커스 상태인가?"
  const focusPos = useSheetStore((s) => s.focus);
  const isMergeFocused =
    !!mergeRegion &&
    !!focusPos &&
    focusPos.row === mergeRegion.sr &&
    focusPos.col === mergeRegion.sc;

  //
  const mergedBorderCss: React.CSSProperties = { ...borderCss };

  if (mergeRegion) {
    // 내부 경계선 제거
    if (row > mergeRegion.sr) mergedBorderCss.borderTop = "none";
    if (row < mergeRegion.er) mergedBorderCss.borderBottom = "none";
    if (col > mergeRegion.sc) mergedBorderCss.borderLeft = "none";
    if (col < mergeRegion.ec) mergedBorderCss.borderRight = "none";

    // 병합 전체에 포커스 보더
    if (isMergeFocused) {
      const focusBorder = "2px solid #1a73e8";

      if (row === mergeRegion.sr) mergedBorderCss.borderTop = focusBorder;
      if (row === mergeRegion.er) mergedBorderCss.borderBottom = focusBorder;
      if (col === mergeRegion.sc) mergedBorderCss.borderLeft = focusBorder;
      if (col === mergeRegion.ec) mergedBorderCss.borderRight = focusBorder;
    }
  }

  useEffect(() => {
    if (isFocused && isEditing && editingSource === "cell") {
      // 편집용 input에 포커스(아래 useEffect에서 처리)
    } else if (isFocused && !isEditing) {
      cellRef.current?.focus();
    }
  }, [isFocused, isEditing, editingSource]);

  //  Shift면 포커스 금지 + 브라우저 포커스 이동 차단
  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.button !== 0) return; // 좌클릭만

      const st = useSheetStore.getState();

      if (st.editing && st.editingSource === "cell") {
        e.preventDefault();
        st.commitEdit(st.formulaMirror ?? "");
        return;
      }

      const isFormulaEditing = st.editingSource === "formula";
      const withModKey = e.ctrlKey || e.metaKey;

      // ⌘/Ctrl + 클릭: 단일 셀 참조 삽입
      if (isFormulaEditing && withModKey) {
        e.preventDefault();
        // 단일 셀 참조 "A1" 삽입
        const a1 = `${colToLabel(col)}${row + 1}`;
        st.insertRefAtCaret(a1, { commaSmart: true });
        // 포커스 이동/selection 방지
        return;
      }

      const extend = e.shiftKey === true;

      //  병합 영역 안에서 클릭 시, 항상 master 셀 기준으로 selection/focus
      const baseRow = mergeRegion ? mergeRegion.sr : row;
      const baseCol = mergeRegion ? mergeRegion.sc : col;

      // 텍스트 선택/포커스 이동 방지 (특히 Shift-클릭에서 DOM 포커스 튀는 것 막기)
      e.preventDefault();
      startSel({ row: baseRow, col: baseCol }, extend);
      //  포뮬라 편집 중엔 setFocus 금지 (mirror가 덮어씌워지는 문제 방지)
      if (!extend && !isFormulaEditing)
        setFocus({ row: baseRow, col: baseCol });
    },
    [row, col, startSel, setFocus, mergeRegion]
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

    const st = useSheetStore.getState();
    if (st.editing?.row === row && st.editing?.col === col) {
      // 셀 편집 중이면 무시 (셀 인라인 입력과 충돌 방지)
      return;
    }
    if (st.editingSource === "formula") {
      const sel = st.selection;
      if (sel && sel.sr != null) {
        const a1 = rectToA1(sel); // "A1" | "A1:B5"
        st.insertRefAtCaret(a1, { commaSmart: true });
      }
    }
  }, [endSel, row, col]);

  // ✅ 병합된 셀 내용은 Overlay에서 렌더하므로,
  //    셀 컴포넌트에서는 "비병합 셀"일 때만 내용 표시
  const shouldRenderContent = !mergeRegion;

  // formula 편집 중이거나, 편집이 아닌 일반 보기
  return (
    <div
      ref={cellRef}
      tabIndex={0} // tabIndex => 이 요소가 키보드 포커스를 받을 수 있게 만든다
      role="gridcell" // 시멘틱, 접근성을 위해, 브라우저에게 알려줌
      className={`${styles.cellView} ${alignClass} ${
        !isMerged && isFocused ? styles.focused : ""
      } ${isSelected ? "selected" : ""} ${isErr ? styles.error : ""}`}
      style={{
        ...mergedBorderCss,
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
      // ✅ 병합 내부 아무 칸 더블클릭해도 항상 좌상단(master) 기준으로 편집 시작.
      onDoubleClick={() => {
        const st = useSheetStore.getState();
        const mr = st.getMergeRegionAt(row, col);

        const baseRow = mr ? mr.sr : row;
        const baseCol = mr ? mr.sc : col;

        startEdit({ row: baseRow, col: baseCol });
      }}
      title={shouldRenderContent ? val ?? "" : ""}
    >
      {shouldRenderContent &&
        (isEditing && editingSource === "formula"
          ? val // 포뮬라 편집 중엔 수식 그대로
          : isDisplayNumeric
          ? formatWithComma(displayVal)
          : displayVal)}
    </div>
  );
}

export default memo(Cell); // 리액트 메모를 이용해 props가 바뀐 Cell컴포넌트만 리렌더링
