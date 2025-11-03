import styles from "./ToolBar.module.css";
import { useSheetStore } from "../sheet/store/useSheetStore";

export default function ToolBar() {
  const undo = useSheetStore((s) => s.undo);
  const redo = useSheetStore((s) => s.redo);

  const fontSize = useSheetStore((s) => s.getFontSizeForFocus());
  const setFontSize = useSheetStore((s) => s.setFontSize);

  const apply = (next: number) => {
    // Number 보정만 해주면 나머지(반올림/클램프)는 slice가 처리
    const n = Number(next);
    if (Number.isNaN(n)) return;
    setFontSize(n);
  };

  const stepDown = () => apply(fontSize - 1);
  const stepUp = () => apply(fontSize + 1);

  const onInputChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    apply(Number(e.target.value));
  };

  return (
    <div className={styles.toolBarConatiner}>
      <div className={styles.undoIcon} onClick={undo}>
        <img width="10px" src="/images/undo.png" alt="되돌리기" />
      </div>
      <div className={styles.redoIcon} onClick={redo}>
        <img width="10px" src="/images/redo.png" alt="다시실행" />
      </div>

      {/* 글자 크기 */}
      <div className={styles.group}>
        <button className={styles.btn} onClick={stepDown} title="작게">
          –
        </button>
        <input
          className={styles.sizeInput}
          value={fontSize}
          onChange={onInputChange}
        />
        <button className={styles.btn} onClick={stepUp} title="크게">
          +
        </button>
      </div>

      <div>글자 색상</div>
      <div>배경 색상</div>
      <div>테두리</div>
    </div>
  );
}
