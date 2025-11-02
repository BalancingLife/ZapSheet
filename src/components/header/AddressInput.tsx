import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./AddressInput.module.css";
import {
  useSheetStore,
  type Rect,
  type Pos,
} from "@/components/sheet/store/useSheetStore";
import { a1ToRect, rectToA1 } from "@/utils/a1Utils";

export default function AddressInput() {
  // ---- store states ----
  const selection = useSheetStore((s) => s.selection);
  const isSelecting = useSheetStore((s) => s.isSelecting);
  const setFocus = useSheetStore((s) => s.setFocus);
  const startSelection = useSheetStore((s) => s.startSelection);
  const updateSelection = useSheetStore((s) => s.updateSelection);
  const endSelection = useSheetStore((s) => s.endSelection);

  // ---- local ui states ----
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  // 현재 선택 라벨
  const label = useMemo(
    () => (selection ? rectToA1(selection) : ""),
    [selection]
  );

  // 표시 텍스트 동기화(편집 중이 아닐 때)
  useEffect(() => {
    if (!editing) setDraft(label);
  }, [label, editing]);

  // 편집 진입 시 포커스 + 전체 선택
  useEffect(() => {
    if (!editing || !inputRef.current) return;
    inputRef.current.focus();
    inputRef.current.setSelectionRange(0, inputRef.current.value.length);
  }, [editing]);

  // 지정 사각형으로 점프
  const jumpTo = (rect: Rect) => {
    const tl: Pos = { row: rect.sr, col: rect.sc };
    const br: Pos = { row: rect.er, col: rect.ec };

    // 포커스는 좌상단
    setFocus(tl);
    // selection 절차적 세팅 (start→update→end)
    startSelection(tl, false);
    updateSelection(br);
    endSelection();
  };

  const commit = () => {
    const parsed = a1ToRect(draft);
    if (parsed) {
      jumpTo(parsed);
    } else {
      // 파싱 실패: 표시만 원복
      setDraft(label);
    }
    setEditing(false);
  };

  const cancel = () => {
    setDraft(label);
    setEditing(false);
  };

  const readOnly = !!isSelecting; // 드래깅 중 읽기 전용

  return (
    <div className={styles.container}>
      {!editing ? (
        <button
          type="button"
          className={`${styles.read} ${readOnly ? styles.readOnly : ""}`}
          onClick={() => {
            if (!readOnly) setEditing(true);
          }}
          title={readOnly ? "읽기 전용(드래그 중)" : "클릭하여 주소 입력"}
          aria-label="주소/이름 박스"
          disabled={readOnly}
        >
          <span className={styles.text}>{label}</span>
          <span className={styles.caret} aria-hidden>
            ▼
          </span>
        </button>
      ) : (
        <input
          ref={inputRef}
          className={styles.input}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            } else if (e.key === "Escape") {
              e.preventDefault();
              cancel();
            }
          }}
          onBlur={commit}
          spellCheck={false}
          autoCapitalize="characters"
          placeholder="A1 또는 A1:C5"
          aria-label="주소 입력"
        />
      )}
    </div>
  );
}
