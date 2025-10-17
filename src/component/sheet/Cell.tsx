import { memo, useRef, useEffect } from "react";
import styles from "./Cell.module.css";
import { getColName } from "@/utils/getColName";
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

  // 액션 구독

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
        isSelected ? styles.selected : ""
      }`}
      onMouseDown={(e) => {
        if (e.button !== 0) return; // 좌클릭만
        // Shift로 기존 선택 확장 지원
        startSel({ row, col }, e.shiftKey);
        setFocus({ row, col });
        // 텍스트 드래그 방지
        e.preventDefault();
      }}
      onMouseEnter={(e) => {
        if (e.buttons & 1) updateSel({ row, col }); // 드래그 중일 때만 갱신
      }}
      onMouseUp={() => endSel()}
      onFocus={() => setFocus({ row, col })}
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
      {display || `${row + 1},${getColName(col)}`}
    </div>
  );
}

export default memo(Cell); // 리액트 메모를 이용해 props가 바뀐 Cell컴포넌트만 리렌더링
