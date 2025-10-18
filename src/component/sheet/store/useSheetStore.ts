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

  selectColumn: (col: number, extend?: boolean) => void;
  selectRow: (row: number, extend?: boolean) => void;
  selectAll: () => void;
  clearSelection: () => void;

  isSelected: (r: number, c: number) => boolean;
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

// 지정된 범위를 벗어나지 않게 보정
const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

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
    const { focus, clearSelection } = get();
    if (!focus) return;
    let { row, col } = focus;
    if (dir === "up") row = clamp(row - 1, 0, ROW_COUNT - 1);
    if (dir === "down") row = clamp(row + 1, 0, ROW_COUNT - 1);
    if (dir === "left") col = clamp(col - 1, 0, COLUMN_COUNT - 1);
    if (dir === "right") col = clamp(col + 1, 0, COLUMN_COUNT - 1);
    set({ focus: { row, col } });
    clearSelection();
  },

  // Selection
  isSelecting: false,
  anchor: null,
  selection: null,

  startSelection: (pos, extend = false) => {
    const { focus, setFocus } = get();
    const base = extend && focus ? focus : pos;
    set({
      isSelecting: true,
      anchor: base,
      selection: normRect(base, pos),
    });
    if (!extend) setFocus(base);
  },

  updateSelection: (pos) => {
    const a = get().anchor;
    if (!get().isSelecting || !a) return;
    set({ selection: normRect(a, pos) });
  },

  endSelection: () => {
    set({ isSelecting: false, anchor: null }); // selection은 유지해서 하이라이트 남김
  },

  // Column 전체 선택
  selectColumn: (col, extend = false) => {
    const { focus, setFocus } = get();
    const c = clamp(col, 0, COLUMN_COUNT - 1);

    if (extend && focus) {
      //  Shift: focus.col ↔ 클릭 col 범위 (포커스 유지)
      const sc = Math.min(focus.col, c);
      const ec = Math.max(focus.col, c);
      set({
        selection: { sr: 0, sc, er: ROW_COUNT - 1, ec },
        isSelecting: false,
        anchor: focus, // anchor를 focus로
      });
      return; //  setFocus 호출하지 않음
    }

    //  Shift가 아니거나 focus가 없으면 일반 선택 + 포커스 이동
    set({
      selection: { sr: 0, sc: c, er: ROW_COUNT - 1, ec: c },
      isSelecting: false,
      anchor: { row: 0, col: c },
    });
    setFocus({ row: 0, col: c });
  },

  // Row 전체 선택
  selectRow: (row, extend = false) => {
    const { focus, setFocus } = get();
    const r = clamp(row, 0, ROW_COUNT - 1);

    if (extend && focus) {
      // Shift: focus.row ↔ 클릭 row 범위 (포커스 유지)
      const sr = Math.min(focus.row, r);
      const er = Math.max(focus.row, r);
      set({
        selection: { sr, sc: 0, er, ec: COLUMN_COUNT - 1 },
        isSelecting: false,
        anchor: focus, // anchor를 focus로
      });
      return; //  setFocus 호출하지 않음
    }

    //  Shift가 아니거나 focus가 없으면 일반 선택 + 포커스 이동
    set({
      selection: { sr: r, sc: 0, er: r, ec: COLUMN_COUNT - 1 },
      isSelecting: false,
      anchor: { row: r, col: 0 },
    });
    setFocus({ row: r, col: 0 });
  },

  //  좌상단 코너 클릭용 (전체)
  selectAll: () => {
    const rect: Rect = {
      sr: 0,
      sc: 0,
      er: ROW_COUNT - 1,
      ec: COLUMN_COUNT - 1,
    };
    set({ selection: rect, isSelecting: false, anchor: null });
    get().setFocus({ row: 0, col: 0 });
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
