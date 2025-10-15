import { memo, useRef, useEffect } from "react";
import styles from "./Cell.module.css";
import { getColName } from "@/utils/getColName";
import { useFocusStore } from "./store/useFocusStore";

type CellProps = {
  row: number;
  col: number;
};

function Cell({ row, col }: CellProps) {
  const isFocused = useFocusStore(
    (s) => s.focus?.row === row && s.focus?.col == col
  );
  const setFocus = useFocusStore((s) => s.setFocus);
  const move = useFocusStore((s) => s.move);

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isFocused) ref.current?.focus();
  }, [isFocused]);

  return (
    <div
      ref={ref}
      tabIndex={0} // tabIndex => 이 요소가 키보드 포커스를 받을 수 있게 만든다
      role="gridcell" // 시멘틱, 접근성을 위해, 브라우저에게 알려줌
      className={`${styles.container} ${isFocused ? styles.focused : ""}`}
      onMouseDown={() => setFocus({ row, col })}
      onFocus={() => setFocus({ row, col })}
      onKeyDown={(e) => {
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
      {row + 1},{getColName(col)}
    </div>
  );
}

export default memo(Cell);
