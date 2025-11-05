import React from "react";
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
  DEFAULT_FONT_SIZE,
  FONT_SIZE_TO_ROW_RATIO,
} from "../SheetConstants";

// --------- types ---------
export type SheetMeta = { id: string; name: string };
export type Pos = { row: number; col: number };
export type Rect = { sr: number; sc: number; er: number; ec: number }; // start row, start column, end row, end column
export type Dir = "up" | "down" | "left" | "right";
export type CellStyle = {
  fontSize?: number;
  textColor?: string;
  bgColor?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  border?: CellBorder;
};

export type BorderLineStyle = "solid" | "dashed" | "dotted";

export type BorderSpec = {
  color?: string;
  width?: number;
  style?: BorderLineStyle;
};

export type CellBorder = {
  top?: BorderSpec;
  right?: BorderSpec;
  bottom?: BorderSpec;
  left?: BorderSpec;
};

type BorderApplyMode = "outline" | "all" | "inner";

// --------- Slice ---------

// UI 상태
type LayoutSlice = {
  columnWidths: number[];
  rowHeights: number[];
  initLayout: (defaultColWidth: number, defaultRowHeight: number) => void;
  setRowHeight: (row: number, height: number, isManual?: boolean) => void;
  manualRowFlags: boolean[]; //  각 행의 수동 조정 여부 (true면 자동 변경 금지)
  resetManualRowFlags: () => void; //  옵션: 초기화 함수
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
  editingSource: "cell" | "formula" | null;
  startEdit: (pos: Pos, source?: "cell" | "formula") => void;
  cancelEdit: () => void;
  commitEdit: (value: string) => void;
};

type DataSlice = {
  data: Record<string, string>; // key = `${row}:${col}`
  getValue: (r: number, c: number) => string;
  setValue: (r: number, c: number, v: string) => void;
  loadCellData: () => Promise<void>;
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
    stylesByCell: Record<string, CellStyle>;
    selection: Rect | null;
    focus: Pos | null;
  }>;

  historyFuture: Array<{
    data: Record<string, string>;
    stylesByCell: Record<string, CellStyle>;
    selection: Rect | null;
    focus: Pos | null;
  }>;

  /** 현재 상태(data/selection)를 스냅샷으로 저장 */
  pushHistory: () => void;

  undo: () => void | Promise<void>;
  redo: () => void | Promise<void>;
};

type FormulaSlice = {
  formulaMirror: string;
  setFormulaInput: (v: string) => void;
  syncMirrorToFocus: () => void;
};

type StyleSlice = {
  stylesByCell: Record<string, CellStyle>;

  // 개별 좌표 조회
  getFontSize: (row: number, col: number) => number;
  // 포커스 셀 기준 조회
  getFontSizeForFocus: () => number;
  // 선택영역 폰트사이즈 변경
  setFontSize: (next: number) => Promise<void> | void;
  /** Supabase로부터 스타일 로드 */
  loadCellStyles: () => Promise<void>;
  upsertCellStyles?: (
    payload: Array<{ row: number; col: number; style_json: CellStyle }>
  ) => Promise<void>;

  getCellStyle: (row: number, col: number) => CellStyle | undefined;
  applyStyleToSelection: (patch: Partial<CellStyle>) => Promise<void> | void;
  clearSelectionStyles: (keys?: (keyof CellStyle)[]) => Promise<void> | void;

  applyBorderToSelection: (
    mode: BorderApplyMode,
    spec: BorderSpec
  ) => Promise<void> | void;
  clearSelectionBorders: (mode?: BorderApplyMode) => Promise<void> | void;
};

type SheetListSlice = {
  sheets: SheetMeta[];
  currentSheetId: string | null;

  addSheet: (name?: string) => void;
  setCurrentSheet: (id: string) => void;
  renameSheet: (id: string, newName: string) => void;
  removeSheet: (id: string) => void;
  loadSheetsMeta: () => Promise<void>;
};

type SheetState = LayoutSlice &
  LayoutPersistSlice &
  ResizeSlice &
  FocusSlice &
  SelectionSlice &
  EditSlice &
  DataSlice &
  ClipboardSlice &
  HistorySlice &
  FormulaSlice &
  StyleSlice &
  SheetListSlice;

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

  useSheetStore.getState().syncMirrorToFocus();
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
  const toUpsert: Array<{ row: number; col: number; value: string }> = [];
  const toDelete: Array<{ row: number; col: number }> = [];

  const keySet = new Set<string>([
    ...Object.keys(oldData),
    ...Object.keys(newData),
  ]);
  for (const k of keySet) {
    const before = oldData[k] ?? "";
    const after = newData[k] ?? "";
    if (before === after) continue;
    const [r, c] = k.split(":").map((x) => parseInt(x, 10));
    if (!after) toDelete.push({ row: r, col: c });
    else toUpsert.push({ row: r, col: c, value: after });
  }
  if (toUpsert.length === 0 && toDelete.length === 0) return;

  await withUserId(async (uid) => {
    const { sheetId } = useSheetStore.getState();
    if (!sheetId) return;

    if (toUpsert.length > 0) {
      const payload = toUpsert.map(({ row, col, value }) => ({
        user_id: uid,
        sheet_id: sheetId,
        row,
        col,
        value,
      }));
      const { error } = await supabase
        .from("cells")
        .upsert(payload, { onConflict: "user_id,sheet_id,row,col" });
      if (error) console.error("undo/redo upsert 실패:", error);
    }

    if (toDelete.length > 0) {
      const orClauses = toDelete.map(
        ({ row, col }) => `and(row.eq.${row},col.eq.${col})`
      );
      const { error } = await supabase
        .from("cells")
        .delete()
        .eq("user_id", uid)
        .eq("sheet_id", sheetId)
        .or(orClauses.join(","));
      if (error) console.error("undo/redo delete 실패:", error);
    }
  });
}

async function persistStyleDiff(
  oldStyles: Record<string, CellStyle>,
  newStyles: Record<string, CellStyle>
) {
  const toUpsert: Array<{ row: number; col: number; style_json: CellStyle }> =
    [];
  const toDelete: Array<{ row: number; col: number }> = [];

  const keySet = new Set([
    ...Object.keys(oldStyles),
    ...Object.keys(newStyles),
  ]);

  for (const k of keySet) {
    const before = oldStyles[k];
    const after = newStyles[k];
    const [r, c] = k.split(":").map((n) => parseInt(n, 10));

    // 동일 스타일이면 스킵
    if (JSON.stringify(before) === JSON.stringify(after)) continue;

    if (!after || Object.keys(after).length === 0) {
      toDelete.push({ row: r, col: c });
    } else {
      toUpsert.push({ row: r, col: c, style_json: after });
    }
  }

  if (toUpsert.length === 0 && toDelete.length === 0) return;

  await withUserId(async (uid) => {
    const { sheetId } = useSheetStore.getState();

    if (toUpsert.length > 0) {
      const payload = toUpsert.map((c) => ({
        row: c.row,
        col: c.col,
        style_json: c.style_json,
        user_id: uid,
        sheet_id: sheetId,
        updated_at: new Date().toISOString(),
      }));
      const { error } = await supabase
        .from("cell_styles")
        .upsert(payload, { onConflict: "user_id,sheet_id,row,col" });
      if (error) console.error("undo/redo style upsert 실패:", error);
    }

    if (toDelete.length > 0) {
      const orClauses = toDelete.map(
        ({ row, col }) => `and(row.eq.${row},col.eq.${col})`
      );
      const { error } = await supabase
        .from("cell_styles")
        .delete()
        .eq("user_id", uid)
        .eq("sheet_id", sheetId)
        .or(orClauses.join(","));
      if (error) console.error("undo/redo style delete 실패:", error);
    }
  });
}

function makeSnapshot(s: SheetState) {
  return {
    data: { ...s.data },
    stylesByCell: { ...s.stylesByCell },
    selection: s.selection ? { ...s.selection } : null,
    focus: s.focus ? { ...s.focus } : null,
  };
}

// 테두리

function normBorder(b?: BorderSpec): Required<BorderSpec> | null {
  if (!b) return null;
  return {
    color: b.color ?? "#222",
    width: Math.max(0, Math.round(b.width ?? 1)),
    style: b.style ?? "solid",
  };
}

function cssFrom(b?: BorderSpec): string | undefined {
  const n = normBorder(b);
  return n ? `${n.width}px ${n.style} ${n.color}` : undefined;
}

// 이웃 보정: 없으면 이웃의 반대 변을 가져온다
function resolveEdge(
  row: number,
  col: number,
  edge: "top" | "left" | "right" | "bottom",
  getStyle: (r: number, c: number) => CellStyle | undefined
): BorderSpec | undefined {
  const me = getStyle(row, col);
  const mine = me?.border?.[edge];

  if (mine) return mine;

  if (edge === "top" && row > 0) {
    return getStyle(row - 1, col)?.border?.bottom;
  }
  if (edge === "left" && col > 0) {
    return getStyle(row, col - 1)?.border?.right;
  }
  // 오른/아래는 기본적으로 이웃 보정하지 않음(마지막 행/열에서만 렌더)
  return undefined;
}

/**
 * 셀 보더 CSS를 계산해 반환.
 * 규칙:
 *  - 항상 top/left를 그림(없으면 위/왼 이웃의 bottom/right를 승계)
 *  - 마지막 열에서만 right를 그림, 마지막 행에서만 bottom을 그림
 *  - 이렇게 하면 이중 선 방지됨
 */
export function getBorderCss(row: number, col: number): React.CSSProperties {
  const s = useSheetStore.getState();
  const getStyle = (r: number, c: number) => s.getCellStyle(r, c);

  const isLastCol = col === COLUMN_COUNT - 1;
  const isLastRow = row === ROW_COUNT - 1;

  const top = resolveEdge(row, col, "top", getStyle);
  const left = resolveEdge(row, col, "left", getStyle);
  const right = isLastCol ? s.getCellStyle(row, col)?.border?.right : undefined;
  const bottom = isLastRow
    ? s.getCellStyle(row, col)?.border?.bottom
    : undefined;

  return {
    borderTop: cssFrom(top),
    borderLeft: cssFrom(left),
    borderRight: cssFrom(right),
    borderBottom: cssFrom(bottom),
  };
}

export function useBorderCss(row: number, col: number): React.CSSProperties {
  // 이 3가지만 구독하면 이웃 보정도 바로 반영됨
  const selfStyle = useSheetStore((s) => s.stylesByCell[`${row}:${col}`]);
  const topStyle = useSheetStore((s) =>
    row > 0 ? s.stylesByCell[`${row - 1}:${col}`] : undefined
  );
  const leftStyle = useSheetStore((s) =>
    col > 0 ? s.stylesByCell[`${row}:${col - 1}`] : undefined
  );

  const isLastCol = col === COLUMN_COUNT - 1;
  const isLastRow = row === ROW_COUNT - 1;

  return React.useMemo(() => {
    const getStyle = (r: number, c: number) => {
      if (r === row && c === col) return selfStyle;
      if (r === row - 1 && c === col) return topStyle;
      if (r === row && c === col - 1) return leftStyle;
      return undefined;
    };

    const topSpec = resolveEdge(row, col, "top", getStyle);
    const leftSpec = resolveEdge(row, col, "left", getStyle);
    const rightSpec = isLastCol ? selfStyle?.border?.right : undefined;
    const bottomSpec = isLastRow ? selfStyle?.border?.bottom : undefined;

    return {
      borderTop: cssFrom(topSpec),
      borderLeft: cssFrom(leftSpec),
      borderRight: cssFrom(rightSpec),
      borderBottom: cssFrom(bottomSpec),
    } as React.CSSProperties;
  }, [row, col, selfStyle, topStyle, leftStyle, isLastCol, isLastRow]);
}

// sheetSlice
const genId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `sheet-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const nextSheetName = (existing: string[]) => {
  // Sheet1, Sheet2 ... 중 빈 번호를 찾아 부여
  let n = 1;
  const set = new Set(existing);
  while (set.has(`Sheet${n}`)) n += 1;
  return `Sheet${n}`;
};

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

  // 행 높이 변경
  setRowHeight: (row, height, isManual = false) => {
    set((state) => {
      const nextHeights = [...state.rowHeights];
      const nextFlags = [...state.manualRowFlags];

      nextHeights[row] = height;

      //  사용자가 수동으로 조정했다면 플래그 true
      if (isManual) {
        nextFlags[row] = true;
      }

      //  행이 너무 작아졌다면 자동 모드로 되돌리기
      if (height <= DEFAULT_ROW_HEIGHT + 5) {
        nextFlags[row] = false;
      }

      return { rowHeights: nextHeights, manualRowFlags: nextFlags };
    });

    // (선택) 레이아웃 자동 저장: 0.5초 뒤 Supabase 반영
    debounceLayoutSave(() => {
      const { saveLayout } = get();
      saveLayout().catch(console.error);
    }, 500);
  },

  manualRowFlags: Array.from({ length: ROW_COUNT }, () => false),

  resetManualRowFlags: () => {
    set({
      manualRowFlags: Array.from({ length: ROW_COUNT }, () => false),
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
    const rs = get().resizing;
    if (rs?.type === "row") {
      get().setRowHeight(rs.index, get().rowHeights[rs.index], true); // ✅ isManual=true
    }

    set({ resizing: null });
    // 열/행 리사이즈 후 손 떼면 0.5초 이후에 DB 저장
    debounceLayoutSave(() => {
      const { saveLayout } = get();
      saveLayout().catch(console.error);
    }, 500);
  },

  // Focus
  focus: { row: 0, col: 0 },
  setFocus: (pos) => {
    set({ focus: pos });
    if (pos) {
      get().syncMirrorToFocus();
    } else {
      set({ formulaMirror: "" });
    }
  },

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
  selection: { sr: 0, sc: 0, er: 0, ec: 0 },

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
  editingSource: null,
  startEdit: (pos, source = "cell") =>
    set({ editing: pos, editingSource: source }),
  cancelEdit: () => set({ editing: null }),

  commitEdit: async (value) => {
    const { editing, clearSelection, sheetId } = get();
    if (!editing || !sheetId) return;

    get().pushHistory();

    const { row, col } = editing;

    // 로컬 상태 업데이트
    set((s) => ({
      data: { ...s.data, [keyOf(row, col)]: value },
      editing: null,
      editingSource: null,
      focus: { row, col },
    }));
    clearSelection(); // selection 영역 초기화

    // DB 반영
    await withUserId(async (uid) => {
      const { sheetId } = get();

      const { error } = await supabase
        .from("cells")
        .upsert([{ row, col, value, user_id: uid, sheet_id: sheetId }], {
          onConflict: "sheet_id,row,col,user_id",
        });
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
    await withUserId(async (uid) => {
      const { sheetId } = get();
      if (!sheetId) return;

      const { data, error } = await supabase
        .from("cells")
        .select("row,col,value")
        .eq("user_id", uid)
        .eq("sheet_id", sheetId);

      if (error) {
        console.error("데이터 불러오기 실패", error);
        return;
      }

      //  빈 배열일 때 굳이 {}로 덮어쓰고 깜빡임 유발할 필요가 없으면 early return
      if (!data || data.length === 0) {
        return;
      }

      // Supabase의 각 행(row,col,value) 을  key: `${row}:${col}` 형태로 변환
      const obj: Record<string, string> = {};
      for (const cell of data ?? [])
        obj[`${cell.row}:${cell.col}`] = cell.value ?? "";

      // Zustand 상태에 반영
      set({ data: obj });
      console.log("[loadCellData]", {
        sheetId: get().sheetId,
        rows: data?.length,
      });
    });
  },

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
      const { sheetId } = get();
      const orClauses = targets.map(
        ({ row, col }) => `and(row.eq.${row},col.eq.${col})`
      );
      const { error } = await supabase
        .from("cells")
        .delete()
        .eq("user_id", uid)
        .eq("sheet_id", sheetId)
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

  pasteGridFromSelection: async (grid) => {
    // 선택 영역 확인
    const sel = get().selection;
    if (!sel) return;

    get().pushHistory();

    const prev = get().data;
    const next = { ...prev };

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

    await persistDataDiff(prev, next);
  },

  // ===== History (undo) =====
  historyLimit: 50,
  historyPast: [],
  historyFuture: [],

  pushHistory: () => {
    const { historyPast, historyLimit } = get();
    const snap = makeSnapshot(get());
    const nextPast = [...historyPast, snap];
    if (nextPast.length > historyLimit) nextPast.shift();

    set({ historyPast: nextPast, historyFuture: [] });
  },

  undo: async () => {
    const { historyPast, historyFuture } = get();
    if (historyPast.length === 0) return;

    const prevData = get().data; // DB diff용 (변경 전)
    const prevStyles = get().stylesByCell;
    const last = historyPast[historyPast.length - 1]; // 복원할 스냅샷
    const nowSnap = makeSnapshot(get()); // 현재 스냅샷을 future로 보관

    set({
      data: last.data,
      stylesByCell: last.stylesByCell,
      selection: last.selection,
      focus: last.focus ?? null,
      isSelecting: false,
      anchor: null,
      head: null,
      editing: null,
      historyPast: historyPast.slice(0, historyPast.length - 1),
      historyFuture: [...historyFuture, nowSnap],
    });

    await persistDataDiff(prevData, last.data);
    await persistStyleDiff(prevStyles, last.stylesByCell);
    get().syncMirrorToFocus();
  },

  redo: async () => {
    const { historyPast, historyFuture } = get();
    if (historyFuture.length === 0) return;

    const prevData = get().data; // DB diff용
    const prevStyles = get().stylesByCell;
    const next = historyFuture[historyFuture.length - 1]; // 적용할 스냅샷
    const nowSnap = makeSnapshot(get()); // 현재 상태는 past에 쌓기

    set({
      data: next.data,
      stylesByCell: next.stylesByCell,
      selection: next.selection,
      focus: next.focus ?? null,
      isSelecting: false,
      anchor: null,
      head: null,
      editing: null,
      historyPast: [...historyPast, nowSnap],
      historyFuture: historyFuture.slice(0, historyFuture.length - 1),
    });

    await persistDataDiff(prevData, next.data);
    await persistStyleDiff(prevStyles, next.stylesByCell);
    get().syncMirrorToFocus();
  },

  // formula
  formulaMirror: "",

  setFormulaInput: (v) =>
    set((s) => (s.formulaMirror === v ? {} : { formulaMirror: v })),

  syncMirrorToFocus: () => {
    const f = get().focus;
    if (!f) return;
    const v = get().getValue(f.row, f.col) ?? "";
    set((s) => (s.formulaMirror === v ? {} : { formulaMirror: v }));
  },

  // ----StyleSlice----
  stylesByCell: {},

  getCellStyle: (row, col) => {
    return get().stylesByCell[keyOf(row, col)];
  },

  applyStyleToSelection: async (patch) => {
    get().pushHistory();
    const sel = get().selection;
    const focus = get().focus;
    const targets = sel ? rectToCells(sel) : focus ? [focus] : [];
    if (targets.length === 0) return;

    // 1) 로컬 상태 즉시 업데이트
    const nextMap = { ...get().stylesByCell };
    const touched: Array<{ row: number; col: number }> = [];

    for (const { row, col } of targets) {
      const k = keyOf(row, col);
      const prev = nextMap[k] ?? {};
      const merged = { ...prev, ...patch };

      // 빈 객체는 저장하지 않음 (폰트사이즈만 있을 수 있으므로 그대로 병합)
      nextMap[k] = merged;
      touched.push({ row, col });
    }
    set({ stylesByCell: nextMap });

    // 2) 비차단 저장 (폰트사이즈 저장 로직과 동일 테이블 재사용)
    void withUserId(async (uid) => {
      const { sheetId } = get();
      const rows = touched.map(({ row, col }) => ({
        user_id: uid,
        sheet_id: sheetId,
        row,
        col,
        style_json: nextMap[keyOf(row, col)],
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from("cell_styles")
        .upsert(rows, { onConflict: "user_id,sheet_id,row,col" });

      if (error) console.error("cell_styles upsert 실패:", error);
    });
  },

  clearSelectionStyles: async (keys) => {
    get().pushHistory();
    const sel = get().selection;
    const focus = get().focus;
    const targets = sel ? rectToCells(sel) : focus ? [focus] : [];
    if (targets.length === 0) return;

    // 1) 로컬 상태 갱신
    const prevMap = get().stylesByCell;
    const nextMap: Record<string, CellStyle> = { ...prevMap };
    const toDeleteRemote: Array<{ row: number; col: number }> = [];
    const toUpsertRemote: Array<{
      row: number;
      col: number;
      style: CellStyle;
    }> = [];

    for (const { row, col } of targets) {
      const k = keyOf(row, col);
      const cur = nextMap[k];
      if (!cur) continue;

      if (!keys || keys.length === 0) {
        // 전체 스타일 제거
        delete nextMap[k];
        toDeleteRemote.push({ row, col });
      } else {
        // 지정 키만 제거
        const cloned = { ...cur };
        keys.forEach((kk) => delete (cloned as Partial<CellStyle>)[kk]);
        if (Object.keys(cloned).length === 0) {
          delete nextMap[k];
          toDeleteRemote.push({ row, col });
        } else {
          nextMap[k] = cloned;
          toUpsertRemote.push({ row, col, style: cloned });
        }
      }
    }
    set({ stylesByCell: nextMap });

    // 2) 비차단 저장 (삭제와 업데이트 분기)
    void withUserId(async (uid) => {
      const { sheetId } = get();

      // upsert
      if (toUpsertRemote.length > 0) {
        const rows = toUpsertRemote.map(({ row, col, style }) => ({
          user_id: uid,
          sheet_id: sheetId,
          row,
          col,
          style_json: style,
          updated_at: new Date().toISOString(),
        }));
        const { error } = await supabase
          .from("cell_styles")
          .upsert(rows, { onConflict: "user_id,sheet_id,row,col" });
        if (error) console.error("cell_styles upsert 실패:", error);
      }

      // delete
      if (toDeleteRemote.length > 0) {
        const orClauses = toDeleteRemote.map(
          ({ row, col }) => `and(row.eq.${row},col.eq.${col})`
        );
        const { error } = await supabase
          .from("cell_styles")
          .delete()
          .eq("user_id", uid)
          .eq("sheet_id", sheetId)
          .or(orClauses.join(","));
        if (error) console.error("cell_styles delete 실패:", error);
      }
    });
  },

  getFontSize: (row, col) => {
    const key = keyOf(row, col);
    const style = get().stylesByCell[key];
    return style?.fontSize ?? DEFAULT_FONT_SIZE;
  },

  getFontSizeForFocus: () => {
    const f = get().focus;
    if (!f) return DEFAULT_FONT_SIZE;
    return get().getFontSize(f.row, f.col);
  },

  setFontSize: (next) => {
    get().pushHistory();
    const n = Math.round(clamp(next, 0, 72));

    const sel = get().selection;
    const focus = get().focus;
    const targets = sel ? rectToCells(sel) : focus ? [focus] : [];
    if (targets.length === 0) return;

    // 1) stylesByCell 즉시 갱신 (동기)
    const map = { ...get().stylesByCell };
    for (const { row, col } of targets) {
      const key = keyOf(row, col);
      const prev = map[key] ?? {};
      map[key] = { ...prev, fontSize: n };
    }
    set({ stylesByCell: map });

    // 2) 행 높이 즉시 재계산 (동기) — ★ await 전에!
    const { rowHeights, manualRowFlags, setRowHeight } = get();
    const affectedRows = [...new Set(targets.map((t) => t.row))];
    for (const r of affectedRows) {
      if (manualRowFlags[r]) continue;

      let maxFont = DEFAULT_FONT_SIZE;
      for (let c = 0; c < COLUMN_COUNT; c++) {
        const style = map[keyOf(r, c)];
        if (style?.fontSize && style.fontSize > maxFont)
          maxFont = style.fontSize;
      }

      const desiredHeight = Math.max(
        DEFAULT_ROW_HEIGHT,
        Math.round(maxFont * FONT_SIZE_TO_ROW_RATIO)
      );

      if (Math.abs(rowHeights[r] - desiredHeight) > 1) {
        setRowHeight(r, desiredHeight);
      }
    }

    // 3) 저장은 비차단으로 뒤로 보냄 (레이아웃 확정 후)
    void (async () => {
      await withUserId(async (uid) => {
        const { sheetId } = get();
        const rows = targets.map(({ row, col }) => ({
          user_id: uid,
          sheet_id: sheetId,
          row,
          col,
          style_json: map[keyOf(row, col)],
          updated_at: new Date().toISOString(),
        }));

        const { error } = await supabase
          .from("cell_styles")
          .upsert(rows, { onConflict: "user_id,sheet_id,row,col" });
        if (error) console.error("cell_styles upsert 실패:", error);
      });
    })();
  },
  loadCellStyles: async () => {
    await withUserId(async (uid) => {
      const { sheetId } = get();
      const { data, error } = await supabase
        .from("cell_styles")
        .select("row,col,style_json")
        .eq("user_id", uid)
        .eq("sheet_id", sheetId);

      if (error) {
        console.error("cell_styles 로드 실패:", error);
        return;
      }

      const map: Record<string, CellStyle> = {};
      for (const rec of data ?? []) {
        map[keyOf(rec.row, rec.col)] = rec.style_json as CellStyle;
      }
      set({ stylesByCell: map });
    });
  },

  applyBorderToSelection: async (mode, spec) => {
    get().pushHistory();

    const sel = get().selection;
    const focus = get().focus;
    const targets = sel ? rectToCells(sel) : focus ? [focus] : [];
    if (targets.length === 0) return;

    const map = { ...get().stylesByCell };

    // 선택 박스 경계(있으면) 계산
    const box: Rect | null = sel
      ? { ...sel }
      : focus
      ? { sr: focus.row, sc: focus.col, er: focus.row, ec: focus.col }
      : null;

    const touch: Array<{ row: number; col: number }> = [];

    const applyEdge = (row: number, col: number, edge: keyof CellBorder) => {
      const k = keyOf(row, col);
      const prev = map[k] ?? {};
      const prevBorder: CellBorder = { ...(prev.border ?? {}) };
      prevBorder[edge] = { ...spec };
      map[k] = { ...prev, border: prevBorder };
      touch.push({ row, col });
    };

    if (!box) return;

    for (const { row, col } of targets) {
      const onTop = row === box.sr;
      const onBottom = row === box.er;
      const onLeft = col === box.sc;
      const onRight = col === box.ec;

      if (mode === "all") {
        applyEdge(row, col, "top");
        applyEdge(row, col, "bottom");
        applyEdge(row, col, "left");
        applyEdge(row, col, "right");
        continue;
      }

      if (mode === "outline") {
        if (onTop) applyEdge(row, col, "top");
        if (onBottom) applyEdge(row, col, "bottom");
        if (onLeft) applyEdge(row, col, "left");
        if (onRight) applyEdge(row, col, "right");
        continue;
      }

      if (mode === "inner") {
        // 내부 경계: 상/하/좌/우 중 "박스 내부측"에 있는 변만
        if (!onTop) applyEdge(row, col, "top");
        if (!onBottom) applyEdge(row, col, "bottom");
        if (!onLeft) applyEdge(row, col, "left");
        if (!onRight) applyEdge(row, col, "right");
        continue;
      }
    }

    // 로컬 반영
    set({ stylesByCell: map });

    // 비차단 저장
    void withUserId(async (uid) => {
      const { sheetId } = get();
      const rows = [
        ...new Set(touch.map(({ row, col }) => `${row}:${col}`)),
      ].map((k) => {
        const [r, c] = k.split(":").map(Number);
        return {
          user_id: uid,
          sheet_id: sheetId,
          row: r,
          col: c,
          style_json: map[k],
          updated_at: new Date().toISOString(),
        };
      });

      const { error } = await supabase
        .from("cell_styles")
        .upsert(rows, { onConflict: "user_id,sheet_id,row,col" });
      if (error) console.error("cell_styles border upsert 실패:", error);
    });
  },

  clearSelectionBorders: async (mode) => {
    get().pushHistory();

    const sel = get().selection;
    const focus = get().focus;
    const targets = sel ? rectToCells(sel) : focus ? [focus] : [];
    if (targets.length === 0) return;

    const mapPrev = get().stylesByCell;
    const map: Record<string, CellStyle> = { ...mapPrev };

    const box: Rect | null = sel
      ? { ...sel }
      : focus
      ? { sr: focus.row, sc: focus.col, er: focus.row, ec: focus.col }
      : null;

    const touchUpsert: Array<{ row: number; col: number; style: CellStyle }> =
      [];
    const touchDelete: Array<{ row: number; col: number }> = [];

    const clearEdge = (row: number, col: number, edge: keyof CellBorder) => {
      const k = keyOf(row, col);
      const cur = map[k];
      if (!cur?.border) return;

      const nextBorder: CellBorder = { ...cur.border };
      delete nextBorder[edge];

      // border 객체가 비면 제거
      if (
        !nextBorder.top &&
        !nextBorder.right &&
        !nextBorder.bottom &&
        !nextBorder.left
      ) {
        const next: CellStyle = { ...cur };
        delete next.border;

        if (Object.keys(next).length === 0) {
          delete map[k]; // 완전 빈 스타일이면 엔트리 제거
          touchDelete.push({ row, col });
        } else {
          map[k] = next;
          touchUpsert.push({ row, col, style: next });
        }
      } else {
        map[k] = { ...cur, border: nextBorder };
        touchUpsert.push({ row, col, style: map[k] });
      }
    };

    if (!box) return;

    for (const { row, col } of targets) {
      const onTop = row === box.sr;
      const onBottom = row === box.er;
      const onLeft = col === box.sc;
      const onRight = col === box.ec;

      if (!mode) {
        // 전체 보더 제거
        ["top", "bottom", "left", "right"].forEach((e) =>
          clearEdge(row, col, e as keyof CellBorder)
        );
        continue;
      }

      if (mode === "all") {
        ["top", "bottom", "left", "right"].forEach((e) =>
          clearEdge(row, col, e as keyof CellBorder)
        );
      } else if (mode === "outline") {
        if (onTop) clearEdge(row, col, "top");
        if (onBottom) clearEdge(row, col, "bottom");
        if (onLeft) clearEdge(row, col, "left");
        if (onRight) clearEdge(row, col, "right");
      } else if (mode === "inner") {
        if (!onTop) clearEdge(row, col, "top");
        if (!onBottom) clearEdge(row, col, "bottom");
        if (!onLeft) clearEdge(row, col, "left");
        if (!onRight) clearEdge(row, col, "right");
      }
    }

    // 로컬 적용
    set({ stylesByCell: map });

    // 비차단 저장(업서트/삭제 분리)
    void withUserId(async (uid) => {
      const { sheetId } = get();

      if (touchUpsert.length > 0) {
        const rows = touchUpsert.map(({ row, col, style }) => ({
          user_id: uid,
          sheet_id: sheetId,
          row,
          col,
          style_json: style,
          updated_at: new Date().toISOString(),
        }));
        const { error } = await supabase
          .from("cell_styles")
          .upsert(rows, { onConflict: "user_id,sheet_id,row,col" });
        if (error)
          console.error("cell_styles border clear upsert 실패:", error);
      }

      if (touchDelete.length > 0) {
        const orClauses = touchDelete.map(
          ({ row, col }) => `and(row.eq.${row},col.eq.${col})`
        );
        const { error } = await supabase
          .from("cell_styles")
          .delete()
          .eq("user_id", uid)
          .eq("sheet_id", sheetId)
          .or(orClauses.join(","));
        if (error)
          console.error("cell_styles border clear delete 실패:", error);
      }
    });
  },

  // ---- SheetListSlice ----
  sheets: [{ id: "default", name: "Sheet1" }],
  currentSheetId: "default",

  // --- SheetListSlice actions ---
  addSheet: async (name) => {
    await withUserId(async (uid) => {
      const { sheets } = get();
      const id = genId();
      const newName = name ?? nextSheetName(sheets.map((s) => s.name));
      const order = sheets.length ? sheets.length : 0;

      const { error } = await supabase
        .from("sheets_meta")
        .insert({ user_id: uid, sheet_id: id, name: newName, order });
      if (error) {
        console.error("addSheet 실패:", error);
        return;
      }

      const newSheets = [...sheets, { id, name: newName }];
      set({ sheets: newSheets });
      get().setCurrentSheet(id);
    });
  },

  setCurrentSheet: (id) => {
    // 이미 활성화된 시트면 무동작
    const { currentSheetId, sheets } = get();
    if (currentSheetId === id) return;

    // 존재하는 시트만 선택
    const exists = sheets.some((s) => s.id === id);
    if (!exists) return;
    // 1) 현재 시트 아이디 동기화
    set({ currentSheetId: id, sheetId: id });

    // 2) 로컬 초기화
    set({ data: {}, stylesByCell: {} });

    // 3) 시트별 리소스 로드
    void (async () => {
      await Promise.all([
        get().loadLayout(),
        get().loadCellData(),
        get().loadCellStyles(),
      ]);
      get().syncMirrorToFocus();
    })();
  },

  renameSheet: async (id, newName) => {
    if (!newName?.trim()) return;
    await withUserId(async (uid) => {
      const { error } = await supabase
        .from("sheets_meta")
        .update({ name: newName, updated_at: new Date().toISOString() })
        .eq("user_id", uid)
        .eq("sheet_id", id);
      if (error) {
        console.error("renameSheet 실패:", error);
        return;
      }
      set((state) => ({
        sheets: state.sheets.map((s) =>
          s.id === id ? { ...s, name: newName } : s
        ),
      }));
    });
  },

  removeSheet: async (id) => {
    const { sheets } = get();
    if (sheets.length <= 1) return; // 마지막 1개는 보호

    await withUserId(async (uid) => {
      // 1) 서버 메타 삭제
      const { error } = await supabase
        .from("sheets_meta")
        .delete()
        .eq("user_id", uid)
        .eq("sheet_id", id);
      if (error) {
        console.error("removeSheet 실패:", error);
        return;
      }

      // 2) 클라이언트 목록 갱신
      const idxRemoved = sheets.findIndex((s) => s.id === id);
      if (idxRemoved === -1) return;

      const newSheets = sheets.filter((s) => s.id !== id);

      // 3) 다음 current 를 “반드시 string”으로 결정
      //    - 지운 탭의 왼쪽(가능하면) 아니면 첫 탭
      const nextIdx = Math.max(0, idxRemoved - 1);
      const next = newSheets[nextIdx] ?? newSheets[0]; // newSheets는 최소 1개 보장
      const nextId = next.id; // <- string 확정

      set({ sheets: newSheets });
      get().setCurrentSheet(nextId); // ✅ string만 전달
    });
  },

  loadSheetsMeta: async () => {
    await withUserId(async (uid) => {
      const { data, error } = await supabase
        .from("sheets_meta")
        .select("sheet_id,name,order")
        .eq("user_id", uid)
        .order("order", { ascending: true });

      if (error) {
        console.error("sheets_meta load 실패:", error);
        return;
      }

      const sheets = (data ?? []).map((r) => ({
        id: r.sheet_id,
        name: r.name,
      }));
      const final = sheets.length
        ? sheets
        : [{ id: "default", name: "Sheet1" }];

      // final[0]는 존재 보장 → string 확정
      set({ sheets: final, currentSheetId: final[0].id, sheetId: final[0].id });

      await Promise.all([
        get().loadLayout(),
        get().loadCellData(),
        get().loadCellStyles(),
      ]);
      get().syncMirrorToFocus();
    });
  },
}));
