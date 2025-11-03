import styles from "./ToolBar.module.css";
import { useSheetStore } from "../sheet/store/useSheetStore";

export default function ToolBar() {
  const undo = useSheetStore((s) => s.undo);
  const redo = useSheetStore((s) => s.redo);
  return (
    <div className={styles.toolBarConatiner}>
      <div className={styles.undoIcon} onClick={undo}>
        <img width="10px" src="/images/undo.png" alt="되돌리기" />
      </div>
      <div className={styles.redoIcon} onClick={redo}>
        <img width="10px" src="/images/redo.png" alt="다시실행" />
      </div>
      <div>글자 크기</div>
      <div>글자 색상</div>
      <div>배경 색상</div>
      <div>테두리</div>
    </div>
  );
}
