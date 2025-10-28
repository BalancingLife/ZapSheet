import { create } from "zustand";
import { supabase } from "@/lib/supabaseClient";

import {
  ROW_COUNT,
  COLUMN_COUNT,
  ROW_MAX,
  ROW_MIN,
  COL_MAX,
  COL_MIN,
  DEFAULT_ROW_HEIGHT,
  DEFAULT_COL_WIDTH,
} from "../SheetConstants";

// --------- types ---------
export type Pos = { row: number; col: number };
export type Rect = { sr: number; sc: number; er: number; ec: number }; // start row, start column, end row, end column
export type Dir = "up" | "down" | "left" | "right";
export type Grid2D = string[][];

// --------- Slice ---------

// UI 상태
type LayoutSlice = {
  columnWidths: number[];
  rowHeights: number[];
  initLayout: (defaultColWidth: number, defaultRowHeight: number) => void;
};

// Supabase의 레이아웃을 불러오는 Slice, 서버 동기화 로직
type LayoutPersistSlice = {
  sheetId: string;
  setSheetId: (id: string) => void;
  saveLayout: () => Promise<void>;
  loadLayout: () => Promise<void>;
  isLayoutReady: boolean;
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
  clearFocus: () => void;
  move: (dir: Dir) => void;
  moveCtrlEdge: (dir: Dir) => void;
};

// 드래깅(Selecting)을 위한 Slice
type SelectionSlice = {
  isSelecting?: boolean; // 드래깅 중인지
  anchor: Pos | null; // 드래깅 시작점
  head: Pos | null; // 드래깅 끝점
  selection: Rect | null; // 현재 선택 범위

  startSelection: (pos: Pos, extend?: boolean) => void;
  updateSelection: (pos: Pos) => void;
  endSelection: () => void;

  selectColumn: (col: number, extend?: boolean) => void;
  selectRow: (row: number, extend?: boolean) => void;
  selectAll: () => void;
  clearSelection: () => void;

  isSelected: (r: number, c: number) => boolean;
  extendSelectionByArrow: (dir: Dir) => void; // ADD
  extendSelectionByCtrlEdge: (dir: Dir) => void; // ADD
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
  clearSelectionCells: () => Promise<void>;
};

type ClipboardSlice = {
  // 내부 복사 버퍼 (마지막 복사된 2D 그리드)
  clipboard: string[][] | null;

  // 현재 selection을 TSV로 반환하고, 내부 버퍼에도 저장
  copySelectionToTSV: () => string;

  // 현재 selection의 좌상단부터 grid를 로컬 상태에 붙여넣기
  pasteGridFromSelection: (grid: string[][]) => void;
};

type HistorySlice = {
  /** 최대 저장 스냅샷 개수 */
  historyLimit: number;
  /** 과거 스냅샷 스택 */
  historyPast: Array<{
    data: Record<string, string>;
    selection: Rect | null;
    focus: Pos | null;
  }>;

  /** 현재 상태(data/selection)를 스냅샷으로 저장 */
  pushHistory: () => void;

  /** 한 단계 되돌리기 (Ctrl/Cmd+Z용) */
  undo: () => void;
};

type SheetState = LayoutSlice &
  LayoutPersistSlice &
  ResizeSlice &
  FocusSlice &
  SelectionSlice &
  EditSlice &
  DataSlice &
  ClipboardSlice &
  HistorySlice;

// =====================
// Helpers (공통 유틸)
// =====================

// 현재 로그인 유저 id 추출
async function getCurrentUserId(): Promise<string | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user.id;
}

// 유저 확인을 래핑 (반복 제거)
async function withUserId<T>(
  fn: (uid: string) => Promise<T>
): Promise<T | void> {
  const uid = await getCurrentUserId();
  if (!uid) {
    console.error("사용자 정보 없음");
    return;
  }
  return fn(uid);
}

// 좌표 키
const keyOf = (r: number, c: number) => `${r}:${c}`;

// 지정된 범위를 벗어나지 않게 보정
const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));
// 행/열 인덱스를 시트 경계 안으로 클램프
const clampRow = (r: number) => clamp(r, 0, ROW_COUNT - 1);
const clampCol = (c: number) => clamp(c, 0, COLUMN_COUNT - 1);

function normRect(a: Pos, b: Pos): Rect {
  const sr = Math.min(a.row, b.row);
  const er = Math.max(a.row, b.row);
  const sc = Math.min(a.col, b.col);
  const ec = Math.max(a.col, b.col);
  return { sr, sc, er, ec };
}

// 방향 델타 상수 (상수 컨벤션: 대문자))
const DIR: Record<Dir, { dr: number; dc: number }> = {
  up: { dr: -1, dc: 0 },
  down: { dr: 1, dc: 0 },
  left: { dr: 0, dc: -1 },
  right: { dr: 0, dc: 1 },
};

// 한 칸 이동
const step1 = (p: Pos, dir: Dir): Pos => {
  const { dr, dc } = DIR[dir];
  return { row: clampRow(p.row + dr), col: clampCol(p.col + dc) };
};

// 경계로 점프
const toEdge = (p: Pos, dir: Dir): Pos => {
  if (dir === "up") return { row: 0, col: p.col };
  if (dir === "down") return { row: ROW_COUNT - 1, col: p.col };
  if (dir === "left") return { row: p.row, col: 0 };
  // dir === "right"
  return { row: p.row, col: COLUMN_COUNT - 1 };
};

// 배열 pad/trunc
const padTo = <T>(arr: T[], len: number, fill: T) =>
  [...arr, ...Array(Math.max(0, len - arr.length)).fill(fill)].slice(0, len);

// selection → 좌표 목록
function rectToCells(sel: Rect): Array<Pos> {
  const out: Pos[] = [];
  for (let r = sel.sr; r <= sel.er; r++) {
    for (let c = sel.sc; c <= sel.ec; c++) out.push({ row: r, col: c });
  }
  return out;
}

// 포커스 = 단일 selection 세팅
function setFocusAsSingleSelection(
  set: (p: Partial<SheetState>) => void,
  pos: Pos
) {
  set({
    focus: pos,
    selection: { sr: pos.row, sc: pos.col, er: pos.row, ec: pos.col },
    isSelecting: false,
    anchor: null,
    head: null,
  });
}

// Shift 확장 시작 시 anchor/head 초기화
function prepareAnchorHead(args: {
  focus: Pos | null;
  anchor: Pos | null;
  head: Pos | null;
  selection: Rect | null;
}): { a: Pos; h: Pos } | null {
  const { focus, anchor, head, selection } = args;
  if (!focus) return null;

  const a = anchor ?? { row: focus.row, col: focus.col };
  if (head) return { a, h: { ...head } };

  if (selection) {
    const s = selection;
    const tl: Pos = { row: s.sr, col: s.sc };
    const br: Pos = { row: s.er, col: s.ec };
    if (a.row === s.sr && a.col === s.sc) return { a, h: br };
    if (a.row === s.er && a.col === s.ec) return { a, h: tl };
    if (a.row === s.sr && a.col === s.ec)
      return { a, h: { row: s.er, col: s.sc } };
    return { a, h: { row: s.sr, col: s.ec } };
  }
  return { a, h: { row: focus.row, col: focus.col } };
}

// selection 갱신 payload
const updateSelectionFrom = (a: Pos, h: Pos) => ({
  anchor: a,
  head: h,
  selection: normRect(a, h),
  isSelecting: false,
});

// 공통 확장 실행기 (전략: 한 칸/경계)
function extendSelectionWith(
  get: () => SheetState,
  set: (partial: Partial<SheetState>) => void,
  dir: Dir,
  strategy: "step" | "edge"
) {
  const { focus, anchor, head, selection } = get();
  const init = prepareAnchorHead({ focus, anchor, head, selection });
  if (!init) return;
  const { a } = init;
  let { h } = init;

  h = strategy === "step" ? step1(h, dir) : toEdge(h, dir);
  set(updateSelectionFrom(a, h));
}

let __layoutSaveTimer: ReturnType<typeof setTimeout> | null = null;
// 이 변수는 함수가 여러 번 불려도 계속 기억되어야 함
// const -> 값 재할당 불가
// let -> 다음 호출 때 새로운 타이머 ID로 덮어 써야 함
// __ 의 의미 : private / 내부용 이라는 의미. 컨벤션

//“연속 호출이 발생하면 타이머를 계속 밀어서,
// 마지막 호출 후 ms 밀리초 뒤에만 실행된다.”
function debounceLayoutSave(fn: () => void, ms = 500) {
  if (__layoutSaveTimer) clearTimeout(__layoutSaveTimer);
  __layoutSaveTimer = setTimeout(fn, ms);
}

const rectW = (r: Rect) => r.ec - r.sc + 1;
const rectH = (r: Rect) => r.er - r.sr + 1;

function get2DGrid(sel: Rect): string[][] {
  const { getValue } = useSheetStore.getState();
  const h = rectH(sel);
  const w = rectW(sel);
  const out: string[][] = Array.from({ length: h }, () =>
    Array<string>(w).fill("")
  );

  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      out[r][c] = getValue(sel.sr + r, sel.sc + c) ?? "";
    }
  }

  return out;
}

// TSV란 “Tab-Separated Values” , 즉 탭 문자로 구분된 값들의 형식

// 2D 배열 → TSV 문자열 (엑셀/시트 호환)
const gridToTSV = (g: string[][]) => g.map((row) => row.join("\t")).join("\n"); // row 를 \t를 포함시켜서 잇고, 행들을 개행문자로 연결함

// TSV 문자열 → 2D 배열
export function tsvToGrid(tsv: string): string[][] {
  const lines = tsv.replace(/\r/g, "").split("\n"); // 윈도우에서는 줄바꿈이 \r\n 으로 되어 있을 수 있어서 \r 제거
  return lines.map((line) => line.split("\t")); // \n을 다시 행 단위로 나누고, \t을 쪼개 다시 열단위로 만듦
}

// ===== Undo/Redo용: 로컬 데이터 차이를 Supabase에 반영 =====
async function persistDataDiff(
  oldData: Record<string, string>,
  newData: Record<string, string>
) {
  // 변경/삭제 목록 계산
  const toUpsert: Array<{ row: number; col: number; value: string }> = [];
  const toDelete: Array<{ row: number; col: number }> = [];

  // 키 집합(합집합) 순회
  const keySet = new Set<string>([
    ...Object.keys(oldData),
    ...Object.keys(newData),
  ]);

  for (const k of keySet) {
    const before = oldData[k] ?? "";
    const after = newData[k] ?? "";
    if (before === after) continue;

    const [r, c] = k.split(":").map((x) => parseInt(x, 10));

    if (after === "" || after == null) {
      // 값이 빈 문자열로 바뀐 경우 → 삭제
      toDelete.push({ row: r, col: c });
    } else {
      // 그 외 변경 → upsert
      toUpsert.push({ row: r, col: c, value: after });
    }
  }

  if (toUpsert.length === 0 && toDelete.length === 0) return;

  await withUserId(async (uid) => {
    // 1) upsert
    if (toUpsert.length > 0) {
      const payload = toUpsert.map((c) => ({
        row: c.row,
        col: c.col,
        value: c.value,
        user_id: uid,
      }));
      const { error } = await supabase
        .from("cells")
        .upsert(payload, { onConflict: "row,col,user_id" });
      if (error) console.error("undo upsert 실패:", error);
    }

    // 2) delete
    if (toDelete.length > 0) {
      const orClauses = toDelete.map(
        ({ row, col }) => `and(row.eq.${row},col.eq.${col})`
      );
      const { error } = await supabase
        .from("cells")
        .delete()
        .eq("user_id", uid)
        .or(orClauses.join(","));
      if (error) console.error("undo delete 실패:", error);
    }
  });
}

// ==============================
// ------- store create ---------
// ==============================

export const useSheetStore = create<SheetState>((set, get) => ({
  // Layout
  columnWidths: Array.from({ length: COLUMN_COUNT }, () => DEFAULT_COL_WIDTH),
  rowHeights: Array.from({ length: ROW_COUNT }, () => DEFAULT_ROW_HEIGHT),

  // 시트가 처음 렌더될 때 columnWidths·rowHeights 배열을 초기값으로 채워주는 액션
  initLayout: (cw, rh) => {
    set({
      columnWidths: Array.from({ length: COLUMN_COUNT }, () => cw),
      rowHeights: Array.from({ length: ROW_COUNT }, () => rh),
    });
  },

  //Layout Persist
  sheetId: "default",
  setSheetId: (id) => set({ sheetId: id }),
  isLayoutReady: false,

  saveLayout: async () => {
    await withUserId(async (uid) => {
      const { columnWidths, rowHeights, sheetId } = get();

      const payload = {
        user_id: uid,
        sheet_id: sheetId,
        column_widths: columnWidths.map(Number),
        row_heights: rowHeights.map(Number),
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from("sheet_layouts")
        .upsert(payload, { onConflict: "user_id,sheet_id" });
      if (error) console.error("레이아웃 저장 실패:", error);
    });
  },

  loadLayout: async () => {
    // 0) 아직 준비 안됨
    set({ isLayoutReady: false });
    await withUserId(async (uid) => {
      // 2) Supabase에서 레이아웃 조회
      const { data, error } = await supabase
        .from("sheet_layouts")
        .select("column_widths,row_heights")
        .eq("user_id", uid)
        .eq("sheet_id", get().sheetId)
        .maybeSingle(); // 결과가 0개면 data: null, error: null. 1개면 그 행 반환
      if (error) {
        console.error("레이아웃 불러오기 실패:", error);
      }

      if (data) {
        const cw = Array.isArray(data.column_widths) ? data.column_widths : [];
        const rh = Array.isArray(data.row_heights) ? data.row_heights : [];
        set({
          columnWidths: padTo(cw, COLUMN_COUNT, 100),
          rowHeights: padTo(rh, ROW_COUNT, 25),
          isLayoutReady: true,
        });
      } else {
        set({
          columnWidths: Array.from({ length: COLUMN_COUNT }, () => 100),
          rowHeights: Array.from({ length: ROW_COUNT }, () => 25),
          isLayoutReady: true,
        });
      }
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

  endResize: () => {
    set({ resizing: null });
    // 열/행 리사이즈 후 손 떼면 0.5초 이후에 DB 저장
    debounceLayoutSave(() => {
      const { saveLayout } = get();
      saveLayout().catch(console.error);
    }, 500);
  },

  // Focus
  focus: null, // pos(r,c)를 받음
  setFocus: (pos) => set({ focus: pos }),
  clearFocus: () => set({ focus: null }),

  move: (dir) => {
    const focus = get().focus;
    if (!focus) return;

    setFocusAsSingleSelection(set, step1(focus, dir));
  },

  moveCtrlEdge: (dir) => {
    const focus = get().focus;
    if (!focus) return;

    setFocusAsSingleSelection(set, toEdge(focus, dir));
  },

  // Selection
  isSelecting: false,
  anchor: null,
  head: null,
  selection: null,

  startSelection: (pos, extend = false) => {
    const { focus, setFocus } = get();
    const base = extend && focus ? focus : pos;
    set({
      isSelecting: true,
      anchor: base,
      head: pos,
      selection: normRect(base, pos),
    });
    if (!extend) setFocus(base);
  },

  updateSelection: (pos) => {
    const anchor = get().anchor;
    if (!get().isSelecting || !anchor) return;
    set({ head: pos, selection: normRect(anchor, pos) });
  },

  endSelection: () => {
    set({ isSelecting: false, anchor: null }); // selection은 유지해서 하이라이트 남김
  },

  // Column 전체 선택
  selectColumn: (col, extend = false) => {
    const { focus, setFocus } = get();
    const c = clampCol(col);

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
    const r = clampRow(row);

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
    if (count < 2) return false; // 단일 셀은 하이라이트 X

    return r >= sel.sr && r <= sel.er && c >= sel.sc && c <= sel.ec;
  },

  clearSelection: () =>
    set({ selection: null, isSelecting: false, anchor: null }),

  extendSelectionByArrow: (dir) => {
    extendSelectionWith(get, set, dir, "step");
  },

  extendSelectionByCtrlEdge: (dir) => {
    extendSelectionWith(get, set, dir, "edge");
  },

  // Edit
  editing: null,
  startEdit: (pos) => set({ editing: pos }),
  cancelEdit: () => set({ editing: null }),

  commitEdit: async (value) => {
    const { editing, clearSelection } = get();
    if (!editing) return;

    get().pushHistory();

    const { row, col } = editing;

    // 로컬 상태 업데이트
    set((s) => ({
      data: { ...s.data, [keyOf(row, col)]: value },
      editing: null,
      focus: { row, col },
    }));
    clearSelection(); // selection 영역 초기화

    // DB 반영
    await withUserId(async (uid) => {
      const { error } = await supabase.from("cells").upsert(
        [{ row, col, value, user_id: uid }],
        { onConflict: "row,col,user_id" } // 수정 가능하게 한 코드
      );
      if (error) console.error(" Supabase 저장 실패:", error);
      else console.log(`저장됨: (${row}, ${col}) → ${value}`);
    });
  },

  // ---- Data ----
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
  },
  clearData: () => set({ data: {} }),

  clearSelectionCells: async () => {
    const sel = get().selection;
    if (!sel) return;

    get().pushHistory(); // ctrl z 하기 위해 히스토리에 추가

    // 1) 로컬 상태 변경
    const draft = { ...get().data };
    const targets = rectToCells(sel);
    for (const { row, col } of targets) draft[keyOf(row, col)] = "";
    set({ data: draft });

    // DB
    await withUserId(async (uid) => {
      const orClauses = targets.map(
        ({ row, col }) => `and(row.eq.${row},col.eq.${col})`
      );
      const { error } = await supabase
        .from("cells")
        .delete()
        .eq("user_id", uid)
        .or(orClauses.join(","));
      if (error) console.error("clearSelectionCells 삭제 실패:", error);
    });
  },

  // ====== Clipboard Slice ======
  clipboard: null,

  copySelectionToTSV: () => {
    const sel = get().selection;
    if (!sel) return "";
    const grid = get2DGrid(sel);
    set({ clipboard: grid });
    return gridToTSV(grid);
  },

  pasteGridFromSelection: (grid) => {
    // 선택 영역 확인
    const sel = get().selection;
    if (!sel) return;

    get().pushHistory();
    // 데이터 복사
    const { data } = get();
    const next = { ...data };

    const h = grid.length; // column
    const w = Math.max(...grid.map((r) => r.length)); // row

    for (let rr = 0; rr < h; rr++) {
      for (let cc = 0; cc < w; cc++) {
        const r = clampRow(sel.sr + rr);
        const c = clampCol(sel.sc + cc);
        const v = grid[rr][cc] ?? "";
        next[keyOf(r, c)] = v; // "2:3": "A" 이런 식으로 값 기록
      }
    }

    set({
      data: next,
      selection: {
        sr: sel.sr,
        sc: sel.sc,
        er: clampRow(sel.sr + h - 1),
        ec: clampCol(sel.sc + w - 1),
      },
      isSelecting: false,
      anchor: null,
      head: null,
    });
  },

  // ===== History (undo) =====
  historyLimit: 50,
  historyPast: [],

  pushHistory: () => {
    const { data, selection, focus, historyPast, historyLimit } = get();
    const snap = {
      data: { ...data }, // 얕은 복사(불변성)
      selection: selection ? { ...selection } : null,
      focus: focus ? { ...focus } : null,
    };
    const next = [...historyPast, snap];
    // 용량 제한
    if (next.length > historyLimit) next.shift();
    set({ historyPast: next });
  },

  undo: async () => {
    const { historyPast } = get();
    if (historyPast.length === 0) return;

    // 마지막 스냅샷으로 복원
    const last = historyPast[historyPast.length - 1];

    const prevData = get().data;

    set({
      data: last.data,
      selection: last.selection,
      focus: last.focus ?? null,
      isSelecting: false,
      anchor: null,
      head: null,
      historyPast: historyPast.slice(0, historyPast.length - 1),
      editing: null,
    });

    await persistDataDiff(prevData, last.data);
  },
}));
