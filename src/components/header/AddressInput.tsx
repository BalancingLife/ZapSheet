import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./AddressInput.module.css";
import {
  useSheetStore,
  type Rect,
  type Pos,
} from "@/components/sheet/store/useSheetStore";

/** 0-indexed col -> A1 표기 */
function colToLabel(c: number): string {
  let n = c + 1;
  let s = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/** A1 → {row:0,col:0} */
function parseA1(a1: string): { row: number; col: number } | null {
  const s = a1.trim().toUpperCase();
  const m = /^([A-Z]+)\s*([0-9]+)$/.exec(s);
  if (!m) return null;

  const [, colStr, rowStr] = m;
  let col = 0;
  for (let i = 0; i < colStr.length; i++) {
    col = col * 26 + (colStr.charCodeAt(i) - 64); // 'A'->1
  }
  col -= 1;

  const row = parseInt(rowStr, 10) - 1;
  if (row < 0 || col < 0) return null;
  return { row, col };
}

/** "B2" 또는 "A1:C5" → Rect(0-indexed) */
function parseAddress(input: string): Rect | null {
  const raw = input.replace(/\s+/g, "").toUpperCase();
  if (!raw) return null;

  if (raw.includes(":")) {
    const [lhs, rhs] = raw.split(":");
    const p1 = parseA1(lhs);
    const p2 = parseA1(rhs);
    if (!p1 || !p2) return null;
    const sr = Math.min(p1.row, p2.row);
    const sc = Math.min(p1.col, p2.col);
    const er = Math.max(p1.row, p2.row);
    const ec = Math.max(p1.col, p2.col);
    return { sr, sc, er, ec };
  }

  const p = parseA1(raw);
  return p ? { sr: p.row, sc: p.col, er: p.row, ec: p.col } : null;
}

/** Rect → "A1" 또는 "A1:C5" */
function rectToLabel(rect: Rect): string {
  const a = `${colToLabel(rect.sc)}${rect.sr + 1}`;
  const b = `${colToLabel(rect.ec)}${rect.er + 1}`;
  return rect.sr === rect.er && rect.sc === rect.ec ? a : `${a}:${b}`;
}

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
    () => (selection ? rectToLabel(selection) : ""),
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
    const parsed = parseAddress(draft);
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
    <div className={styles.AddressInput}>
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
          <span className={styles.text}>{label || "—"}</span>
          {!readOnly && (
            <span className={styles.caret} aria-hidden>
              ▼
            </span>
          )}
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
