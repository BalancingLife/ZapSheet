import { create } from "zustand";
import { ROW_COUNT, COLUMN_COUNT } from "../SheetConstants";

// --------- types ---------
export type Pos = { row: number; col: number };

type FocusSlice = {
  focus: Pos | null;
  setFocus: (pos: Pos) => void;
  move: (dir: "up" | "down" | "left" | "right") => void;
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

type SheetState = FocusSlice & EditSlice & DataSlice;

// --------- helpers ---------
const keyOf = (r: number, c: number) => `${r}:${c}`;

// ---------- store ----------

export const useSheetStore = create<SheetState>((set, get) => ({
  // Focus
  focus: null,
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

  // Edit
  editing: null,
  startEdit: (pos) => set({ editing: pos }),
  cancelEdit: () => set({ editing: null }),
  commitEdit: (value) => {
    const pos = get().editing;
    if (!pos) return;
    const { row, col } = pos;
    // 1) 데이터 저장
    set((s) => ({
      data: { ...s.data, [keyOf(row, col)]: value },
    }));
    // 2) 편집 종료
    set({ editing: null });
    // 3) 포커스 유지(옵션: 커밋 후 move("right") 등 가능)
    set({ focus: { row, col } });
  },

  // Data
  data: {},
  getValue: (r, c) => get().data[keyOf(r, c)] ?? "",
  setValue: (r, c, v) =>
    set((s) => ({ data: { ...s.data, [keyOf(r, c)]: v } })),
}));
