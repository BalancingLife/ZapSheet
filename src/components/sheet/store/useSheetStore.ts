import { create } from "zustand";
import { supabase } from "@/lib/supabaseClient";

import {
  ROW_COUNT,
  COLUMN_COUNT,
  ROW_MAX,
  ROW_MIN,
  COL_MAX,
  COL_MIN,
} from "../SheetConstants";

// --------- types ---------
export type Pos = { row: number; col: number };
export type Rect = { sr: number; sc: number; er: number; ec: number }; // start row, start column, end row, end column

type LayoutSlice = {
  columnWidths: number[];
  rowHeights: number[];
  initLayout: (defaultColWidth: number, defaultRowHeight: number) => void;
};

type ResizeState = null | {
  type: "col" | "row";
  index: number;
  startClient: number; // clientX or clientY
  startSize: number; // 시작 폭/높이
};

type ResizeSlice = {
  resizing: ResizeState;
  startResizeCol: (index: number, clientX: number) => void;
  startResizeRow: (index: number, clientY: number) => void;
  updateResize: (clientXY: number) => void;
  endResize: () => void;
};

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
  loadCellData: () => Promise<void>;
  clearData: () => void;
};

type SheetState = LayoutSlice &
  ResizeSlice &
  FocusSlice &
  SelectionSlice &
  EditSlice &
  DataSlice;

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
  // Layout
  columnWidths: Array.from({ length: COLUMN_COUNT }, () => 100),
  rowHeights: Array.from({ length: ROW_COUNT }, () => 25),

  // 시트가 처음 렌더될 때 columnWidths·rowHeights 배열을 초기값으로 채워주는 액션
  initLayout: (cw, rh) => {
    set({
      columnWidths: Array.from({ length: COLUMN_COUNT }, () => cw),
      rowHeights: Array.from({ length: ROW_COUNT }, () => rh),
    });
  },

  // Resize
  // 현재 리사이징 중인지 여부를 담는 상태
  // 리사이즈 시작 전엔 null, 드래그 중엔 { type, index, startClient, startSize } 형태로 값이 들어감.
  resizing: null,

  // 열 리사이즈 시작 시 실행
  startResizeCol: (index, clientX) => {
    // 현재 열의 초기 폭(w)을 가져오고,
    const w = get().columnWidths[index];

    // resizing 상태에 "col", 열 인덱스, 드래그 시작 좌표(clientX), 시작 폭 저장.
    set({
      resizing: { type: "col", index, startClient: clientX, startSize: w },
    });
  },

  // 행 리사이즈 시작 시 실행
  startResizeRow: (index, clientY) => {
    // 현재 행의 초기 높이(h)를 가져오고,
    const h = get().rowHeights[index];

    // resizing 상태에 "row", 행 인덱스, 시작 좌표(clientY), 시작 높이 저장.
    set({
      resizing: { type: "row", index, startClient: clientY, startSize: h },
    });
  },

  // 마우스를 움직일 때마다 실행.
  updateResize: (clientXY) => {
    const rs = get().resizing;
    if (!rs) return;

    // delta = 마우스 이동거리 계산
    const delta = clientXY - rs.startClient;

    // rs.type이 col일때
    if (rs.type === "col") {
      const next = Math.max(COL_MIN, Math.min(COL_MAX, rs.startSize + delta));
      const arr = get().columnWidths.slice(); // slice로 배열 복사, 불변성 유지
      arr[rs.index] = next;
      set({ columnWidths: arr });

      // rs.type이 row일때
    } else if (rs.type === "row") {
      const next = Math.max(ROW_MIN, Math.min(ROW_MAX, rs.startSize + delta));
      const arr = get().rowHeights.slice(); // slice로 배열 복사, 불변성 유지
      arr[rs.index] = next;
      set({ rowHeights: arr });
    }
  },

  endResize: () => set({ resizing: null }),

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

  commitEdit: async (value) => {
    const { editing, clearSelection } = get();
    if (!editing) return;
    const { row, col } = editing;

    // 1. 로컬 상태 업데이트
    set((s) => ({
      data: { ...s.data, [keyOf(row, col)]: value },
      editing: null,
      focus: { row, col },
    }));
    clearSelection(); // selection 영역 초기화

    // 2. Supabase에 반영
    try {
      const { error } = await supabase
        .from("cells")
        .upsert([{ row, col, value }]);
      if (error) console.error("Supabase 저장 실패:", error);
      else console.log("저장 완료 : (${row}, ${col}) -> ${value}");
    } catch (e) {
      console.error("Supabase 요청 중 오류:", e);
    }
  },

  // Data
  data: {},
  getValue: (r, c) => get().data[keyOf(r, c)] ?? "",
  setValue: (r, c, v) =>
    set((s) => ({ data: { ...s.data, [keyOf(r, c)]: v } })),

  // Supabase에서 data 불러오기
  loadCellData: async () => {
    const { data, error } = await supabase.from("cells").select("*");
    if (error) {
      console.error("데이터 불러오기 실패", error);
      return;
    }

    // Supabase의 각 행(row,col,value) 을  key: `${row}:${col}` 형태로 변환
    const obj: Record<string, string> = {};
    for (const cell of data) {
      obj[`${cell.row}:${cell.col}`] = cell.value;
    }

    // Zustand 상태에 반영
    set({ data: obj });
    console.log("데이터 불러오기 완료:", obj);
  },
  clearData: () => set({ data: {} }),
}));
