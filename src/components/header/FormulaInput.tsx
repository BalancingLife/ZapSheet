import { evaluateFormulaStrict, isArithmeticFormula } from "@/utils/formula";
import { useCallback } from "react";
import { useSheetStore } from "../sheet/store/useSheetStore";
import styles from "./FormulaInput.module.css";

export default function FormulaInput() {
  const value = useSheetStore((s) => s.formulaMirror);
  const setFormulaInput = useSheetStore((s) => s.setFormulaInput);

  // 포커스 및 편집 상태
  const focus = useSheetStore((s) => s.focus);
  const startEdit = useSheetStore((s) => s.startEdit);

  const commitEdit = useSheetStore((s) => s.commitEdit);
  const syncMirrorToFocus = useSheetStore((s) => s.syncMirrorToFocus);
  const move = useSheetStore((s) => s.move);
  // 아직은 미러만 갱신 (셀 값 커밋은 다음 단계에서 Enter/Blur로 연결)
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { editing, focus } = useSheetStore.getState();
      if (!editing && focus) startEdit(focus, "formula"); // ★ formula 소스로 편집 시작
      setFormulaInput(e.target.value); // 미러 갱신 → 셀 화면은 미러 렌더(1단계에서 완료)
    },
    [startEdit, setFormulaInput]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (!focus) return; // 안전 가드

        const raw = (value ?? "").trim();
        let commitValue = raw;

        if (isArithmeticFormula(raw)) {
          const result = evaluateFormulaStrict(raw);
          if (result !== null) commitValue = String(result);
        }
        // 미러를 먼저 결과로 업데이트해 commitEdit가 내부에서 미러를 읽어도 안전
        setFormulaInput(commitValue);
        commitEdit(raw);
        move("down");
      } else if (e.key === "Escape") {
        syncMirrorToFocus();
        useSheetStore.getState().cancelEdit();
      }
    },
    [focus, value, commitEdit, setFormulaInput, syncMirrorToFocus, move]
  );

  return (
    <div
      className={styles.wrapper}
      data-testid="formula-input-wrapper"
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className={styles.fxLabel} aria-hidden>
        fx
      </div>
      <input
        className={styles.input}
        value={value ?? ""}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        spellCheck={false}
      />
    </div>
  );
}
