import { memo, useRef, useEffect, useCallback } from "react";
import styles from "./Cell.module.css";
import { useSheetStore } from "./store/useSheetStore";

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

  // 표시 값
  const display = useSheetStore((s) => s.getValue(row, col));

  const cellRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isFocused && !isEditing) cellRef.current?.focus();
  }, [isFocused, isEditing]);

  useEffect(() => {
    if (isEditing) {
      // requestAnimationFrame 사용으로 렌더 → DOM 붙음 → 다음 프레임에 focus/select” 순서를 보장
      requestAnimationFrame(() => {
        const el = inputRef.current;
        if (el) {
          el.focus();
          el.select();
        }
      });
    }
  }, [isEditing]);

  // 편집 커밋
  const commit = (nextVal?: string) => {
    commitEdit(nextVal ?? display);
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

  if (isEditing) {
    return (
      <div
        ref={cellRef}
        role="gridcell"
        className={`${styles.container} ${isFocused ? styles.focused : ""}`}
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.preventDefault()}
      >
        <input
          ref={inputRef}
          className={styles.editorInput}
          defaultValue={display}
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

  return (
    <div
      ref={cellRef}
      tabIndex={0} // tabIndex => 이 요소가 키보드 포커스를 받을 수 있게 만든다
      role="gridcell" // 시멘틱, 접근성을 위해, 브라우저에게 알려줌
      className={`${styles.container} ${isFocused ? styles.focused : ""} ${
        isSelected ? "selected" : ""
      }`}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onMouseUp={onMouseUp}
      onDoubleClick={() => startEdit({ row, col })}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === "F2") {
          e.preventDefault();
          startEdit({ row, col });
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          move("up");
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          move("down");
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          move("left");
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          move("right");
        }
      }}
    >
      {display}
    </div>
  );
}

export default memo(Cell); // 리액트 메모를 이용해 props가 바뀐 Cell컴포넌트만 리렌더링
