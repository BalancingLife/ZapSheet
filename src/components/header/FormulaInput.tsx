import { useCallback } from "react";
import { useSheetStore } from "../sheet/store/useSheetStore";
import styles from "./FormulaInput.module.css";

export default function FormulaInput() {
  const value = useSheetStore((s) => s.formulaMirror);
  const setFormulaInput = useSheetStore((s) => s.setFormulaInput);

  // 포커스 및 편집 상태
  const focus = useSheetStore((s) => s.focus);
  const startEdit = useSheetStore((s) => s.startEdit);

  // FormulaInput에 커서가 들어오면, 셀도 편집 상태로 전환
  const handleFocus = useCallback(() => {
    if (focus) startEdit(focus);
  }, [focus, startEdit]);

  // 아직은 미러만 갱신 (셀 값 커밋은 다음 단계에서 Enter/Blur로 연결)
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormulaInput(e.target.value);
    },
    [setFormulaInput]
  );

  return (
    <div className={styles.wrapper} data-testid="formula-input-wrapper">
      <div className={styles.fxLabel} aria-hidden>
        fx
      </div>
      <input
        className={styles.input}
        value={value ?? ""}
        onFocus={handleFocus}
        onChange={handleChange}
        spellCheck={false}
      />
    </div>
  );
}
