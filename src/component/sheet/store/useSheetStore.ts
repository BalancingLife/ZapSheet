import { create } from "zustand";
import { ROW_COUNT, COLUMN_COUNT } from "../SheetConstants";

// --------- types ---------
export type Pos = { row: number; col: number };
export type Rect = { sr: number; sc: number; er: number; ec: number }; // start row, start column, end row, end column

type FocusSlice = {
  focus: Pos | null;
  setFocus: (pos: Pos) => void;
  move: (dir: "up" | "down" | "left" | "right") => void;
};

// 드래깅(Selecting)을 위한 Slice
type SelectionSlice = {
  isSelecting?: boolean; // 드래깅 중인지
  anchor: Pos | null; // 드래깅 시작점
  selection: Rect | null; // 현재 선택 범위
  startSelection: (pos: Pos, extend?: boolean) => void;
  updateSelection: (pos: Pos) => void;
  endSelection: () => void;
  isSelected: (r: number, c: number) => boolean;
  clearSelection: () => void;
};

type EditSlice = {
  editing: Pos | null;
  startEdit: (pos: Pos) => void;
  cancelEdit: () => void;
  commitEdit: (value: string) => void;
};

type DataSlice = {
  data: Record<string, string>; // key = `${row}:${col}`
  getValue: (r: number, c: number) => string;
  setValue: (r: number, c: number, v: string) => void;
};

type SheetState = FocusSlice & SelectionSlice & EditSlice & DataSlice;

// --------- helpers ---------
const keyOf = (r: number, c: number) => `${r}:${c}`;

function normRect(a: Pos, b: Pos): Rect {
  const sr = Math.min(a.row, b.row);
  const er = Math.max(a.row, b.row);
  const sc = Math.min(a.col, b.col);
  const ec = Math.max(a.col, b.col);
  return { sr, sc, er, ec };
}

// ---------- store ----------

export const useSheetStore = create<SheetState>((set, get) => ({
  // Focus
  focus: null, // pos(r,c)를 받음
  setFocus: (pos) => set({ focus: pos }),
  move: (dir) => {
    const cur = get().focus;
    if (!cur) return;
    let { row, col } = cur;
    if (dir === "up") row = Math.max(0, row - 1);
    if (dir === "down") row = Math.min(ROW_COUNT - 1, row + 1);
    if (dir === "left") col = Math.max(0, col - 1);
    if (dir === "right") col = Math.min(COLUMN_COUNT - 1, col + 1);
    set({ focus: { row, col } });
  },

  // Selection
  selecting: false,
  anchor: null,
  selection: null,

  startSelection: (pos, extend = false) => {
    const state = get();
    const sel = state.selection;

    const base = extend && sel ? { row: sel.sr, col: sel.sc } : pos;

    set({
      isSelecting: true,
      anchor: base,
      selection: normRect(base, pos),
    });

    state.setFocus(base);
  },

  updateSelection: (pos) => {
    const a = get().anchor;
    if (!get().isSelecting || !a) return;
    set({ selection: normRect(a, pos) });
  },

  endSelection: () => {
    set({ isSelecting: false, anchor: null }); // selection은 유지해서 하이라이트 남김
  },

  isSelected: (r, c) => {
    const sel = get().selection;
    if (!sel) return false;

    const count = (sel.er - sel.sr + 1) * (sel.ec - sel.sc + 1); // count = 행 개수 * 열 개수 = 선택된 셀의 총 개수, 이 로직을 통해 선택된 셀들이 2개 이상일 때만 isSelected 적용
    if (count < 2) return false;

    return r >= sel.sr && r <= sel.er && c >= sel.sc && c <= sel.ec;
  },

  clearSelection: () =>
    set({ selection: null, isSelecting: false, anchor: null }),

  // Edit
  editing: null,
  startEdit: (pos) => set({ editing: pos }),
  cancelEdit: () => set({ editing: null }),

  commitEdit: (value) => {
    const { editing, clearSelection } = get();
    if (!editing) return;
    const { row, col } = editing;

    set((s) => ({
      data: { ...s.data, [keyOf(row, col)]: value },
      editing: null,
      focus: { row, col },
    }));
    clearSelection(); // selection 영역 초기화
  },

  // Data
  data: {},
  getValue: (r, c) => get().data[keyOf(r, c)] ?? "",
  setValue: (r, c, v) =>
    set((s) => ({ data: { ...s.data, [keyOf(r, c)]: v } })),
}));
