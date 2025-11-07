import { useCallback, useEffect, useRef } from "react";
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

  const caret = useSheetStore((s) => s.formulaCaret);
  const setCaret = useSheetStore((s) => s.setFormulaCaret);

  const inputRef = useRef<HTMLInputElement>(null);

  // 아직은 미러만 갱신 (셀 값 커밋은 다음 단계에서 Enter/Blur로 연결)

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { editing, focus } = useSheetStore.getState();
      if (!editing && focus) startEdit(focus, "formula"); // ★ formula 소스로 편집 시작
      setFormulaInput(e.target.value); // 미러 갱신 → 셀 화면은 미러 렌더(1단계에서 완료)

      // 입력 후 caret 저장
      const pos = e.target.selectionStart ?? 0;
      setCaret(pos);
    },
    [startEdit, setFormulaInput, setCaret]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (!focus) return; // 안전 가드

        const raw = (value ?? "").trim();
        // 결과로 치환하지 말고, “원문 수식” 그대로 커밋
        commitEdit(raw);

        move("down");
      } else if (e.key === "Escape") {
        syncMirrorToFocus();
        useSheetStore.getState().cancelEdit();
      }
    },
    [focus, value, commitEdit, syncMirrorToFocus, move]
  );

  // 입력창 포커스/선택 변화 시 caret 저장
  const handleSelect = useCallback(
    (e: React.SyntheticEvent<HTMLInputElement>) => {
      const el = e.currentTarget;
      const pos = el.selectionStart ?? 0;
      setCaret(pos);
    },
    [setCaret]
  );

  // value/caret 변동 후, DOM selection을 store caret으로 맞춤
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const p = Math.max(0, Math.min((value ?? "").length, caret));
    try {
      el.setSelectionRange(p, p);
    } catch {
      console.log(" ");
    }
  }, [value, caret]);

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
        ref={inputRef}
        className={styles.input}
        value={value ?? ""}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onSelect={handleSelect}
        onClick={handleSelect}
        onFocus={() => {
          const st = useSheetStore.getState();
          if (!st.editing && st.focus) st.startEdit(st.focus, "formula");
        }}
        spellCheck={false}
      />
    </div>
  );
}
