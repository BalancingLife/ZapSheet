import { create } from "zustand";
import { ROW_COUNT, COLUMN_COUNT } from "../SheetConstants";

export type Pos = { row: number; col: number };

type State = {
  focus: Pos | null;
  setFocus: (pos: Pos) => void;
  move: (dir: "up" | "down" | "left" | "right") => void;
};

export const useFocusStore = create<State>((set, get) => ({
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
    // Math.max,min을 쓴 이유는 경계제한
    set({ focus: { row, col } });
  },
}));
