import React from "react";
import { create } from "zustand";
import { supabase } from "@/lib/supabaseClient";
import { a1ToPos } from "@/utils/a1Utils";
import { evaluateFormulaStrict } from "@/utils/formula";

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

// 마우스로 열·행을 드래그해서 넓이/높이를 바꾸는 동안의 상태/로직을 담당하는 Slice
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
  head: Pos | null; // 반대쪽 끝점
  selection: Rect | null; // Rect 형태로 정규화된 영역 (sr,sc,er,ec)

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

  fillSelectionTo: (target: Rect) => Promise<void> | void;
};

type EditSlice = {
  editing: Pos | null; // 편집 중인 셀 좌표. null → 편집 모드 아님, 이걸 기반으로 Cell.tsx에서 <input> or <div> 렌더
  // 편집 모드의 출처를 구분해서 selection,focus 충돌 등을 막기 위한 필드
  editingSource: "cell" | "formula" | null;
  // cell → 셀을 더블클릭하거나 Enter 눌러서 편집하기 시작한 경우
  // formula → 포뮬라바(FormilaInput)에서 편집을 시작했을 때
  // null → 편집 중 아님
  startEdit: (pos: Pos, source?: "cell" | "formula") => void; // 해당 셀 편집 모드를 시작한다.ㄴ
  cancelEdit: () => void;
  commitEdit: (value: string) => void;
};

type DataSlice = {
  // 모든 셀의 값을 메모리로 들고 있는 객체
  data: Record<string, string>; // key = `${row}:${col}`
  // 잠깐 Record<K, T> 란
  // “K라는 key를 가진 객체이며, 그 value는 T 타입이다.” 라는 의미
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
  historyLimit: number; // 최대 Undo 기록 개수
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
  resolveCellNumeric: (a1: string, depth?: number) => number | null;

  formulaCaret: number; // formulaInput 내 커서 위치
  /** caret 갱신 */
  setFormulaCaret: (pos: number) => void;
  /**
   * 현재 caret 위치에 A1 또는 A1:B5 같은 참조를 삽입
   * commaSmart: 괄호 안 인자 사이에 있을 때 자동으로 콤마를 적절히 보정
   */
  insertRefAtCaret: (ref: string, opts?: { commaSmart?: boolean }) => void;
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

type SaveSlice = {
  autoSaveEnabled: boolean;
  setAutoSaveEnabled: (enabled: boolean) => void;

  hasUnsavedChanges: boolean; // 수동 모드 일 때, 저장 안 된 변경이 있는 지
  lastSavedData: Record<string, string>;
  lastSavedStyles: Record<string, CellStyle>;

  saveAll: () => Promise<void>;
  loadUserSettings: () => Promise<void>;
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
  SheetListSlice &
  SaveSlice;

// =====================
// Helpers (공통 유틸)
// =====================

// 현재 로그인 유저 id 추출
// 모든 DB I/O는 user_id가 필요하다. 매번 인증 객체에서 uid를 꺼내는 중복을 없애고, “인증 안 됨” 케이스를 한 곳에서 표준화하기 위함.
async function getCurrentUserId(): Promise<string | null> {
  // Prmoise<string |null> : “비동기로 동작하고, 끝나면 유저 id(문자열) 또는 null을 돌려줄 거야” 라는 선언.
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(); //supabase.auth.getUser(): Supabase 클라이언트가 현재 세션의 유저를 가져옴.
  if (error || !user) return null;
  return user.id;
}

// "로그인 안 되어 있으면 조용히 빠지고,
// 되어 있으면 uid 넣어서 네 콜백 실행시켜줄게"
// 라는 안전한 비동기 헬퍼 함수
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

// keyOf(3,2) => 3:2 반환
const keyOf = (r: number, c: number) => `${r}:${c}`;

// 지정된 범위를 벗어나지 않게 보정
// 수치를 [lo, hi] 범위로 제한
const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

// 행 인덱스를 시트 높이 범위로 제한
const clampRow = (r: number) => clamp(r, 0, ROW_COUNT - 1);
// 열 인덱스를 시트 너비 범위로 제한
const clampCol = (c: number) => clamp(c, 0, COLUMN_COUNT - 1);

// 마우스로 아래→위 방향으로 드래그하면,
// 시작점보다 끝점의 좌표가 더 작을 수 있다.
// 시작: (5, 2)
// 끝: (2, 4)
// 이걸 그대로 쓰면 selection 계산이 꼬인다.
// 그래서 무조건 “좌상단 → 우하단” 순서로 정규화(normalize) 해야 한다.
// 그걸 담당하는 것이 normRect
function normRect(a: Pos, b: Pos): Rect {
  const sr = Math.min(a.row, b.row); // → 두 좌표 중 더 위쪽 행을 sr(start row)로 지정
  const er = Math.max(a.row, b.row); // → 두 좌표 중 더 아래쪽 행을 er(end row)로 지정
  const sc = Math.min(a.col, b.col); // 열도 동일
  const ec = Math.max(a.col, b.col); // 열도 동일
  return { sr, sc, er, ec }; // 즉, a와 b 순서에 상관없이 항상 sr ≤ er, sc ≤ ec 가 보장
}

// DIR : 방향 델타 상수 (상수 컨벤션: 대문자)
// 모든 방향에 대해 dr(행 변화량)과 dc(열 변화량)을 매핑해둔 딕셔너리
// 이걸 이용해 이동 계산을 간결하게 표현할 수 있다
// row += dr;
// col += dc;
const DIR: Record<Dir, { dr: number; dc: number }> = {
  up: { dr: -1, dc: 0 },
  down: { dr: 1, dc: 0 },
  left: { dr: 0, dc: -1 },
  right: { dr: 0, dc: 1 },
};

// step1(p,dir)) p에서 dir 방향으로 한 칸 이동 함수
const step1 = (p: Pos, dir: Dir): Pos => {
  const { dr, dc } = DIR[dir]; // DIR 을 이용하여 행/열 이동 방향량을 가져옴
  return { row: clampRow(p.row + dr), col: clampCol(p.col + dc) }; // 새로운 객체 Pos (row,col) 를 반환
};

// toEdge() 경계로 점프하는 함수 (Ctrl + 화살표)
const toEdge = (p: Pos, dir: Dir): Pos => {
  if (dir === "up") return { row: 0, col: p.col };
  if (dir === "down") return { row: ROW_COUNT - 1, col: p.col };
  if (dir === "left") return { row: p.row, col: 0 };
  // dir === "right"
  return { row: p.row, col: COLUMN_COUNT - 1 };
};

// padTo(arr, len, fill) 배열을 정확히 len 길이로 맞추는 함수
// 모자라면 fill 값으로 뒤를 채움, 넘치면 뒤를 잘라냄
// padTo([1,2], 5, 0) → [1,2,0,0,0]
// padTo([1,2,3,4], 3, 9) → [1,2,3]
// padTo([], 3, 'x') → ['x','x','x']
// 핵심: 입력 배열을 건드리지 않고(불변) 지정 길이로 정규화.
// loadLayout() 로딩 시 사용
const padTo = <T>(arr: T[], len: number, fill: T) =>
  [...arr, ...Array(Math.max(0, len - arr.length)).fill(fill)].slice(0, len);

// rectToCells(sel) 사각형 영역을 개별 셀 목록(배열인데 Pos 타입이 들어있는 배열) 으로 풀기

// ex) rectToCells({ sr: 1, sc: 2, er: 2, ec: 3 });
// [ { row: 1, col: 2 }, { row: 1, col: 3 }, { row: 2, col: 2 }, { row: 2, col: 3 } ] 로 반환
function rectToCells(sel: Rect): Array<Pos> {
  const cells: Pos[] = [];
  for (let r = sel.sr; r <= sel.er; r++) {
    for (let c = sel.sc; c <= sel.ec; c++) cells.push({ row: r, col: c });
  }
  return cells;
}

// setFocusAsSingleSelection(set, pos) : 지금 클릭된 셀 하나만 focus & selection으로 만드는 함수
function setFocusAsSingleSelection(
  set: (p: Partial<SheetState>) => void, // zustand set 함수
  pos: Pos
) {
  set({
    focus: pos, // pos를 focus
    selection: { sr: pos.row, sc: pos.col, er: pos.row, ec: pos.col }, // selection 한칸으로 만듦
    isSelecting: false, // 드래그 중 아님
    anchor: null,
    head: null,
  });

  useSheetStore.getState().syncMirrorToFocus(); // syncMirrorToFocus() : 현재 focus 셀의 값을 포뮬라 입력창에 복사하는 함수
}

// prepareAnchorHead({focus, anchor, head, selection}) 현재 상태(포커스/앵커/헤드/선택)를 바탕으로 확장 시작점과 끝점을 표준화하는 함수
function prepareAnchorHead(args: {
  focus: Pos | null;
  anchor: Pos | null;
  head: Pos | null;
  selection: Rect | null;
}): { a: Pos; h: Pos } | null {
  const { focus, anchor, head, selection } = args;
  if (!focus) return null;

  const a = anchor ?? { row: focus.row, col: focus.col }; // a에 기존 anchor가 있으면 그대로 사용, 없다면 현재 focus를 anchor로 사용
  if (head) return { a, h: { ...head } }; // head가 이미 있으면 위 a와 기존 head 그대로 반환

  // head가 없고 selection이 있을 때
  if (selection) {
    // anchor가 selection의 네 모서리 중 어디냐에 따라 반대편 모서리를 head로 세팅
    // 현재 anchor를 고정한 채 selection의 반대편이 head가 되도록 초기화
    const s = selection;
    const tl: Pos = { row: s.sr, col: s.sc };
    const br: Pos = { row: s.er, col: s.ec };
    if (a.row === s.sr && a.col === s.sc) return { a, h: br };
    if (a.row === s.er && a.col === s.ec) return { a, h: tl };
    if (a.row === s.sr && a.col === s.ec)
      return { a, h: { row: s.er, col: s.sc } };
    return { a, h: { row: s.sr, col: s.ec } };
  }
  // selection도 없으면(단일 셀 상태) h를 focus셀로
  return { a, h: { row: focus.row, col: focus.col } };
}

// updateSelectionFrom(anchor, head) 선택 범위를 (anchor, head)로 확정하고, selection 객체를 업데이트하는 함수
const updateSelectionFrom = (a: Pos, h: Pos) => ({
  anchor: a,
  head: h,
  selection: normRect(a, h),
  isSelecting: false,
});

// extendSelectionWith(get(), set(), Dir, strategy)
// extendSelectionByArrow,extendSelectionByCtrlEdge 와 이어짐
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

  // strategy가 "step" 이냐 "edge"냐에 따라서 step1(), toEdge() 함수 호출
  const moveHead = strategy === "step" ? step1 : toEdge;
  h = moveHead(h, dir);

  set(updateSelectionFrom(a, h));
}

// 이 변수는 함수가 여러 번 불려도 계속 기억되어야 함
// const -> 값 재할당 불가
// let -> 다음 호출 때 새로운 타이머 ID로 덮어 써야 함
// __ 의 의미 : private / 내부용 이라는 의미. 컨벤션

//“연속 호출이 발생하면 타이머를 계속 밀어서,
// 마지막 호출 후 ms 밀리초 뒤에만 실행된다.”
let __layoutSaveTimer: ReturnType<typeof setTimeout> | null = null;
function debounceLayoutSave(fn: () => void, ms = 500) {
  if (__layoutSaveTimer) clearTimeout(__layoutSaveTimer);
  __layoutSaveTimer = setTimeout(fn, ms);
}

// 선택 영역 가로/세로 크기 계산
const rectW = (r: Rect) => r.ec - r.sc + 1;
const rectH = (r: Rect) => r.er - r.sr + 1;

// 선택된 셀 값들을 2D 배열 형태로 추출
// DB나 클립보드로 내보내기 전에 “표 모양 그대로” 가져오는 역할.
function get2DGrid(sel: Rect): string[][] {
  const { getValue } = useSheetStore.getState();
  const h = rectH(sel);
  const w = rectW(sel);

  // 빈 2D 배열 초기화:
  // h=3, w=4 → [['','','',''], ['','','',''], ['','','','']]
  const grid: string[][] = Array.from({ length: h }, () =>
    Array<string>(w).fill("")
  );

  //루프 돌며 실제 값 채우기:
  // [['a','b','c','d'], ['e','f','g','h'], ['h','i','j','k']]
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      grid[r][c] = getValue(sel.sr + r, sel.sc + c) ?? ""; // undefined면 "" 로 초기화
    }
  }
  return grid;
}

// 스프레드시트에서 “복사 → 붙여넣기” 할 때
// 실제로 브라우저 클립보드에는 TSV(Tab-Separated Values) 형태로 저장됨
// JS에서도 동일 포맷으로 변환해줘야 엑셀, 구글시트, ZapSheet끼리 서로 호환되는 복사/붙여넣기가 가능
// 2D 배열 → TSV 문자열 (엑셀/시트 호환)
const gridToTSV = (g: string[][]) => g.map((row) => row.join("\t")).join("\n"); // row 를 \t를 포함시켜서 잇고, 행들을 개행문자로 연결함
// 엑셀 등에서 복사해 온 TSV 문자열을 우리 시트 내부 데이터 구조(string[][])로 복원
export function tsvToGrid(tsv: string): string[][] {
  const lines = tsv.replace(/\r/g, "").split("\n"); // 윈도우에서는 줄바꿈이 \r\n 으로 되어 있을 수 있어서 \r 제거
  return lines.map((line) => line.split("\t")); // \n을 다시 행 단위로 나누고, \t을 쪼개 다시 열단위로 만듦
}

// persistDataDiff(oldData,newData)
// 로컬 상태 스냅샷 간 차이만 서버(Supabase)에 반영.
// Undo/Redo 이후 “바뀐 셀만” 업서트/삭제 → 네트워크 최소화.
async function persistDataDiff(
  oldData: Record<string, string>,
  newData: Record<string, string>
) {
  const toUpsert: Array<{ row: number; col: number; value: string }> = [];
  const toDelete: Array<{ row: number; col: number }> = [];

  // oldData, newData의 모든 키를 Set으로 합침 → 비교 대상 완성.
  const keySet = new Set<string>([
    ...Object.keys(oldData),
    ...Object.keys(newData),
  ]);

  //   before !== after일 때만 처리.
  // 키 "r:c"를 분해해 숫자 row, col 추출.
  // after === "" → 삭제 큐(toDelete)
  // 그 외 → 업서트 큐(toUpsert)
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

// 스타일 상태의 diff를 계산해 DB에 배치 업서트/삭제하는 함수
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

// 현재 시트 상태(SheetState)의 주요 부분을 “복사본(snapshot)”으로 만들어 저장.
// undo,redo를 하기 위해 스냅샷을 만들어 놓는 용도
function makeSnapshot(s: SheetState) {
  return {
    data: { ...s.data },
    stylesByCell: { ...s.stylesByCell },
    selection: s.selection ? { ...s.selection } : null,
    focus: s.focus ? { ...s.focus } : null,
  };
}

// 테두리

// normalizeBorderSpec(BorderSpec : color,width,BorderLineStyle)
// 부분적으로만 들어온 BorderSpec(색/두께/스타일 중 일부) → 완전한 스펙으로 채워 정규화해놓음.
function normalizeBorderSpec(b?: BorderSpec): Required<BorderSpec> | null {
  if (!b) return null;
  return {
    color: b.color ?? "#222",
    width: Math.max(0, Math.round(b.width ?? 1)),
    style: b.style ?? "solid",
  };
}

// React style={{ borderTop: ... }}에 바로 꽂아 넣을 문자열이 필요
// normalizeBorderSpec를 활용해 정규화해놓은 객체를 toBorderCss으로 미리 css언어로 만들어놓음
function toBorderCss(b?: BorderSpec): string | undefined {
  const n = normalizeBorderSpec(b);
  return n ? `${n.width}px ${n.style} ${n.color}` : undefined;
}

// 테두리를 모든 셀에 네 변 다 그리면 겹침/이중선 생기기 때문에
// 기본 철학: 항상 위·왼쪽 변만 그린다.
// top 없으면 → 위 셀의 bottom을 가져옴.
// left 없으면 → 왼 셀의 right를 가져옴.
// right,bottom은 마지막 열/행 에서만 그린다.
function resolveBorderEdge(
  row: number,
  col: number,
  edge: "top" | "left" | "right" | "bottom",
  getStyle: (r: number, c: number) => CellStyle | undefined
): BorderSpec | undefined {
  const selfStyle = getStyle(row, col);
  const selfEdge = selfStyle?.border?.[edge];

  // 내가 직접 설정한 보더가 있다면 그걸 우선 적용
  if (selfEdge) return selfEdge;

  // 없을 경우, 위 셀의 bottom 보더를 대신 쓰기
  if (edge === "top" && row > 0) {
    return getStyle(row - 1, col)?.border?.bottom;
  }

  // 위 셀의 bottom right 보더를 대신 쓰기
  if (edge === "left" && col > 0) {
    return getStyle(row, col - 1)?.border?.right;
  }
  return undefined;
}

// 위 border 유틸들이 실제로 렌더링에 적용되는 부분
// React 컴포넌트에서 이렇게 쓰임
// <div style={getBorderCss(row, col)} />
export function getBorderCss(row: number, col: number): React.CSSProperties {
  const s = useSheetStore.getState();
  const getStyle = (r: number, c: number) => s.getCellStyle(r, c);

  // 마지막 행·열 여부
  // 맨 끝일 때만 right/bottom 테두리 직접 그리기 위해
  const isLastCol = col === COLUMN_COUNT - 1;
  const isLastRow = row === ROW_COUNT - 1;

  // 상·좌 보정 처리
  const top = resolveBorderEdge(row, col, "top", getStyle);
  const left = resolveBorderEdge(row, col, "left", getStyle);

  // 하·우는 예외 처리
  const right = isLastCol ? s.getCellStyle(row, col)?.border?.right : undefined;
  const bottom = isLastRow
    ? s.getCellStyle(row, col)?.border?.bottom
    : undefined;

  // CSS 문자열로 변환 후 리턴
  return {
    borderTop: toBorderCss(top),
    borderLeft: toBorderCss(left),
    borderRight: toBorderCss(right),
    borderBottom: toBorderCss(bottom),
  };
}

// Cell 컴포넌트에서 필요한 보더만 최소로 계산해서, 불필요한 리렌더를 줄이기 위함
export function useBorderCss(row: number, col: number): React.CSSProperties {
  const selfStyle = useSheetStore((s) => s.stylesByCell[`${row}:${col}`]);
  const topStyle = useSheetStore((s) =>
    row > 0 ? s.stylesByCell[`${row - 1}:${col}`] : undefined
  );
  const leftStyle = useSheetStore((s) =>
    col > 0 ? s.stylesByCell[`${row}:${col - 1}`] : undefined
  );

  // 마지막 행·열 여부
  // 맨 끝일 때만 right/bottom 테두리 직접 그리기 위해
  const isLastCol = col === COLUMN_COUNT - 1;
  const isLastRow = row === ROW_COUNT - 1;

  return React.useMemo(() => {
    const getStyle = (r: number, c: number) => {
      if (r === row && c === col) return selfStyle;
      if (r === row - 1 && c === col) return topStyle;
      if (r === row && c === col - 1) return leftStyle;
      return undefined;
    };

    const topSpec = resolveBorderEdge(row, col, "top", getStyle);
    const leftSpec = resolveBorderEdge(row, col, "left", getStyle);
    const rightSpec = isLastCol ? selfStyle?.border?.right : undefined;
    const bottomSpec = isLastRow ? selfStyle?.border?.bottom : undefined;

    return {
      borderTop: toBorderCss(topSpec),
      borderLeft: toBorderCss(leftSpec),
      borderRight: toBorderCss(rightSpec),
      borderBottom: toBorderCss(bottomSpec),
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
  // LayoutSlice : 화면 상태 + 즉시 반응 액션
  // 각 열/행의 픽셀 크기를 들고 있는 상태 배열 초기값은 SheetConstants의 디폴트로 꽉 채움.
  columnWidths: Array.from({ length: COLUMN_COUNT }, () => DEFAULT_COL_WIDTH),
  rowHeights: Array.from({ length: ROW_COUNT }, () => DEFAULT_ROW_HEIGHT),

  // 시트가 처음 렌더될 때 columnWidths·rowHeights 배열을 초기값으로 채워주는 액션
  initLayout: (cw, rh) => {
    set({
      columnWidths: Array.from({ length: COLUMN_COUNT }, () => cw),
      rowHeights: Array.from({ length: ROW_COUNT }, () => rh),
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

    const { autoSaveEnabled, saveLayout } = get();

    if (autoSaveEnabled) {
      // (선택) 레이아웃 자동 저장: 0.5초 뒤 Supabase 반영
      debounceLayoutSave(() => {
        saveLayout().catch(console.error);
      }, 500);
    } else {
      // 수동 모드: 변경만 표시
      set({ hasUnsavedChanges: true });
    }
  },

  manualRowFlags: Array.from({ length: ROW_COUNT }, () => false),

  resetManualRowFlags: () => {
    set({
      manualRowFlags: Array.from({ length: ROW_COUNT }, () => false),
    });
  },

  //Layout Persist Slice :시트 컨텍스트 + 서버 동기화
  sheetId: "default",
  setSheetId: (id) => set({ sheetId: id }),
  isLayoutReady: false,

  // saveLayout() : 현재 화면의 행/열 크기를 Supabase에 저장
  saveLayout: async () => {
    await withUserId(async (uid) => {
      const { columnWidths, rowHeights, sheetId } = get();

      const payload = {
        user_id: uid,
        sheet_id: sheetId,
        column_widths: columnWidths.map(Number), // 왜 .map(Number)? 배열 안에 문자열이 들어가도 Supabase에서 문제가 안 생게 강제 숫자화.
        row_heights: rowHeights.map(Number), // 마찬가지
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from("sheet_layouts")
        .upsert(payload, { onConflict: "user_id,sheet_id" }); // user_id + sheet_id 조합이 PK처럼 작동. 있으면 update, 없으면 insert
      if (error) console.error("레이아웃 저장 실패:", error);
    });
  },

  // Supabase에서 이 시트의 저장된 레이아웃을 가져와서 상태를 채운다.
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
        .maybeSingle(); // row 있으면 그 row 반환 , 없으면 data = null
      if (error) {
        console.error("레이아웃 불러오기 실패:", error);
      }
      // data 가 있다면
      if (data) {
        const cw = Array.isArray(data.column_widths) ? data.column_widths : [];
        const rh = Array.isArray(data.row_heights) ? data.row_heights : [];
        set({
          columnWidths: padTo(cw, COLUMN_COUNT, 100),
          rowHeights: padTo(rh, ROW_COUNT, 25),
          // 왜 padTo?
          // cw.length !== COLUMN_COUNT일 수 있다:
          // 예전에 만든 시트는 열/행 개수가 달랐을 수 있다
          // DB에 저장된 배열이 더 짧을 수도 있다
          // 혹은 사람이 실수로 DB를 지웠다가 일부만 남아 있을 수도
          // 그래서 padTo로 길이를 딱 화면에 필요한 길이로 맞춰줌.
          // 신뢰할 수 없는 DB 데이터를 클라이언트에서 안전하게 정규화하는 것.
          isLayoutReady: true,
        });
        // data 가 없다면 디폴트로 초기화
      } else {
        set({
          columnWidths: Array.from(
            { length: COLUMN_COUNT },
            () => DEFAULT_COL_WIDTH
          ),
          rowHeights: Array.from(
            { length: ROW_COUNT },
            () => DEFAULT_ROW_HEIGHT
          ),
          isLayoutReady: true,
        });
      }
    });
  },

  // ResizeSlice : 마우스로 열·행을 드래그해서 넓이/높이를 바꾸는 동안의 상태/로직을 담당하는 Slice

  // 아무 것도 안 드래그 중이면 null
  // 드래그 중이면
  //   {
  //   type: "col" | "row";
  //   index: number;        몇 번째 열/행인지
  //   startClient: number;  드래그 시작 시점의 clientX/clientY
  //   startSize: number;    드래그 시작 시점의 폭/높이
  // }
  resizing: null,

  // startResizeCol(index, clientX) : 열 리사이즈 드래그가 시작될 때, 기준 정보를 저장
  startResizeCol: (index, clientX) => {
    const { columnWidths } = get();
    // 현재 열의 시작 폭(w)을 가져오고,
    const w = columnWidths[index];

    // resizing 상태에 "col", 열 인덱스, 드래그 시작 좌표(clientX), 시작 폭 저장.
    set({
      resizing: { type: "col", index, startClient: clientX, startSize: w },
    });
  },

  // 행 리사이즈 드래그가 시작될 때, 기준 정보를 저장
  startResizeRow: (index, clientY) => {
    const { rowHeights } = get();
    // 현재 행의 초기 높이(h)를 가져오고,
    const h = rowHeights[index];

    // resizing 상태에 "row", 행 인덱스, 시작 좌표(clientY), 시작 높이 저장.
    // index: 몇 번째 열인지 (0-based)
    // clientX: mousedown 이벤트에서 받은 event.clientX
    set({
      resizing: { type: "row", index, startClient: clientY, startSize: h },
    });
  },

  // updateResize(clientXY) : 드래그 중일 때, 마우스 이동에 따라 실시간으로 폭/높이 변경
  // clientXY: 열 리사이즈일 땐 clientX, 행 리사이즈일 땐 clientY
  updateResize: (clientXY) => {
    const { resizing } = get();
    // 드래그중이 아니면 바로 return
    if (!resizing) return;

    // delta = 마우스 이동거리 계산
    // 오른쪽/아래로 끌면 delta > 0
    // 왼쪽/위로 끌면 delta < 0
    const delta = clientXY - resizing.startClient;

    // resizing.type이 col일때
    if (resizing.type === "col") {
      const next = Math.max(
        COL_MIN,
        Math.min(COL_MAX, resizing.startSize + delta)
      );
      const arr = get().columnWidths.slice(); // slice로 배열 복사, 불변성 유지
      arr[resizing.index] = next;
      set({ columnWidths: arr });

      // resizing.type이 row일때
    } else if (resizing.type === "row") {
      const next = Math.max(
        ROW_MIN,
        Math.min(ROW_MAX, resizing.startSize + delta)
      );
      const arr = get().rowHeights.slice(); // slice로 배열 복사, 불변성 유지
      arr[resizing.index] = next;
      set({ rowHeights: arr });
    }
  },

  // 드래그가 끝났을 때, 정리 + 수동 플래그 + 저장 예약
  endResize: () => {
    const { resizing, rowHeights, setRowHeight, autoSaveEnabled, saveLayout } =
      get();

    if (resizing?.type === "row") {
      const currentHeight = rowHeights[resizing.index];
      setRowHeight(resizing.index, currentHeight, true); // 이 행은 사용자가 직접 만진 행이므로 manualRowFlags[index] = true.
    }

    set({ resizing: null });

    if (autoSaveEnabled) {
      // 열/행 리사이즈 후 손 떼면 0.5초 이후에 DB 저장
      debounceLayoutSave(() => {
        saveLayout().catch(console.error);
      }, 500);
    } else {
      set({ hasUnsavedChanges: true });
    }
  },

  // FocusSlice

  // focus :현재 포커스된 셀 위치.
  focus: { row: 0, col: 0 },

  setFocus: (pos) => {
    set({ focus: pos });

    if (pos) {
      const { syncMirrorToFocus } = get();
      syncMirrorToFocus(); // 현재 focus 셀의 값을 읽어서 formulaMirror에 동기화.
    } else {
      set({ formulaMirror: "" });
    }
  },

  clearFocus: () => {
    set({ focus: null });
    set({ formulaMirror: "" });
  },

  // move(dir) : ↑↓←→ 키로 한 칸씩 포커스를 옮길 때 쓰는 함수
  move: (dir) => {
    const { focus } = get();
    if (!focus) return;

    // step1(focus, dir) : dir 방향으로 한 칸 이동 + 시트 경계(clamp) 안으로 제한.
    const nextPos = step1(focus, dir);

    //setFocusAsSingleSelection(set, nextPos) : focus를 새 위치로 바꾸고, selection도 그 한 셀만 선택된 상태로 맞추고, isSelecting, anchor, head 초기화, 마지막에 syncMirrorToFocus()까지 호출.
    setFocusAsSingleSelection(set, nextPos);
  },

  // 해당 방향 끝(엣지)로 점프하는 이동
  moveCtrlEdge: (dir) => {
    const { focus } = get();
    if (!focus) return;

    setFocusAsSingleSelection(set, toEdge(focus, dir)); // step1 대신 toEdge 사용
  },

  // SelectionSlice

  // 앱 첫 진입 시 기본 선택은 (0,0) 한 칸짜리 영역.
  isSelecting: false,
  anchor: null,
  head: null,
  selection: { sr: 0, sc: 0, er: 0, ec: 0 },

  // startSelection: (pos, extend = false) : 마우스로 셀을 클릭/드래그 시작할 때, selection 초기화
  // extend = Shift 누른 상태인지 여부
  startSelection: (pos, extend = false) => {
    const { focus, setFocus, editingSource } = get();
    const isFormulaEditing = editingSource === "formula";

    // base : anchor 후보
    // 포뮬라 편집 중이면:
    // anchor = 그냥 pos (지금 찍은 그 셀 기준으로 드래그)
    // 그 외:
    // extend === true 이고 focus가 있다 → anchor = focus
    // 아니면 anchor = pos (일반 클릭/드래그)
    const base = isFormulaEditing ? pos : extend && focus ? focus : pos;

    set({
      isSelecting: true,
      anchor: base,
      head: pos,
      selection: normRect(base, pos),
    });
    // 포뮬라 편집 중엔 절대 setFocus 금지 (mirror가 덮여씌워지는 문제 방지)
    if (!extend && !isFormulaEditing) {
      setFocus(base);
    }
  },

  // 마우스를 드래그하는 동안, 선택 영역을 계속 업데이트.
  updateSelection: (pos) => {
    const { anchor, isSelecting } = get();

    // 드래그 중이 아니거나 anchor가 없다면 return
    if (!isSelecting || !anchor) return;

    set({ head: pos, selection: normRect(anchor, pos) });
  },

  endSelection: () => {
    set({ isSelecting: false, anchor: null }); // selection은 유지해서 하이라이트 남김
  },

  // 열 헤더 클릭/Shift+클릭 시 열 전체 선택.
  selectColumn: (col, extend = false) => {
    const { focus, setFocus, editingSource } = get();
    const isFormulaEditing = editingSource === "formula";

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
    if (!isFormulaEditing) setFocus({ row: 0, col: c });
  },

  // Row 전체 선택
  selectRow: (row, extend = false) => {
    const { focus, setFocus, editingSource } = get();
    const isFormulaEditing = editingSource === "formula";

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
    if (!isFormulaEditing) setFocus({ row: r, col: 0 });
  },

  // 전체 범위 Rect를 selection으로 설정.
  selectAll: () => {
    const { setFocus, editingSource } = get();

    const isFormulaEditing = editingSource === "formula";

    const rect: Rect = {
      sr: 0,
      sc: 0,
      er: ROW_COUNT - 1,
      ec: COLUMN_COUNT - 1,
    };
    set({ selection: rect, isSelecting: false, anchor: null });
    if (!isFormulaEditing) setFocus({ row: 0, col: 0 });
  },

  // isSelected(r,c) : 이 셀(r,c)이 현재 selection 영역 안에 있는가?
  isSelected: (r, c) => {
    const { selection } = get();

    if (!selection) return false;

    const count =
      (selection.er - selection.sr + 1) * (selection.ec - selection.sc + 1); // count = 행 개수 * 열 개수 = 선택된 셀의 총 개수, 이 로직을 통해 선택된 셀들이 2개 이상일 때만 isSelected 적용
    if (count < 2) return false; // 단일 셀은 하이라이트 X

    return (
      r >= selection.sr &&
      r <= selection.er &&
      c >= selection.sc &&
      c <= selection.ec
    );
  },

  clearSelection: () =>
    set({ selection: null, isSelecting: false, anchor: null }),

  //  Shift+방향키 한 칸 확장
  extendSelectionByArrow: (dir) => {
    extendSelectionWith(get, set, dir, "step");
  },

  // Shift+Ctrl+방향키로 끝까지 확장
  extendSelectionByCtrlEdge: (dir) => {
    extendSelectionWith(get, set, dir, "edge");
  },

  // 자동 채우기 구조, 현재 selection을 target 영역에 반복 채우기. (패턴은 아직)
  fillSelectionTo: async (target) => {
    const { selection, data, stylesByCell, autoSaveEnabled, pushHistory } =
      get();

    if (!selection) return;

    const src = selection;
    const srcH = rectH(src);
    const srcW = rectW(src);
    if (srcH <= 0 || srcW <= 0) return;

    // target도 시트 안으로 클램프
    const tgt: Rect = {
      sr: clampRow(target.sr),
      sc: clampCol(target.sc),
      er: clampRow(target.er),
      ec: clampCol(target.ec),
    };

    // Undo 스냅샷
    pushHistory();
    const prevData = data;
    const prevStyles = stylesByCell;
    const nextData: Record<string, string> = { ...prevData };
    const nextStyles: Record<string, CellStyle> = { ...prevStyles };
    // source 패턴을 target 전체에 타일링
    for (let r = tgt.sr; r <= tgt.er; r++) {
      for (let c = tgt.sc; c <= tgt.ec; c++) {
        // source rect 안의 상대 위치 계산 (주기적으로 반복)
        const relRow = (((r - src.sr) % srcH) + srcH) % srcH;
        const relCol = (((c - src.sc) % srcW) + srcW) % srcW;
        const srcR = src.sr + relRow;
        const srcC = src.sc + relCol;

        const srcKey = keyOf(srcR, srcC);
        const dstKey = keyOf(r, c);

        const v = prevData[srcKey] ?? "";
        if (!v) {
          delete nextData[dstKey];
        } else {
          nextData[dstKey] = v;
        }

        const s = prevStyles[srcKey];
        if (!s) {
          delete nextStyles[dstKey];
        } else {
          nextStyles[dstKey] = s;
        }
      }
    }

    // 상태 반영 + selection을 채워진 target으로 갱신
    set({
      data: nextData,
      stylesByCell: nextStyles,
      selection: tgt,
      isSelecting: false,
      anchor: null,
      head: null,
    });

    if (autoSaveEnabled) {
      await persistDataDiff(prevData, nextData);
      await persistStyleDiff(prevStyles, nextStyles);
    } else {
      set({ hasUnsavedChanges: true });
    }
  },

  // EditSlice
  editing: null,
  editingSource: null,

  // 해당 셀 편집 모드를 시작한다
  startEdit: (pos, source = "cell") => {
    set({ editing: pos, editingSource: source });
  },

  // Esc 등으로 편집 취소
  cancelEdit: () => set({ editing: null }),

  commitEdit: async (value) => {
    const { editing, clearSelection, sheetId, pushHistory, autoSaveEnabled } =
      get();

    // editing : 편집중인 셀 좌표
    // 편집 중인 셀 좌표가 없거나, sheetId가 없다면 return
    if (!editing || !sheetId) return;

    pushHistory();

    const { row, col } = editing; // 편집중인 셀의 좌표

    // 로컬 상태 업데이트
    set((s) => ({
      data: { ...s.data, [keyOf(row, col)]: value }, // 시트 데이터에 새로운 문자열 넣음
      editing: null, // 편집모드 종료
      editingSource: null, // 편집모드 종료
    }));
    clearSelection(); // selection 영역 초기화

    if (autoSaveEnabled) {
      // 자동저장 모드일 때만 즉시 DB 반영

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
    } else {
      // 수동 모드: 더티 플래그만
      set({ hasUnsavedChanges: true });
    }
  },

  // DataSlice
  data: {},
  getValue: (row, col) => get().data[keyOf(row, col)] ?? "",

  //  셀 값을 로컬 상태에 저장
  // DB 저장하지 않고, redo undo push도 하지. 않음

  setValue: (row, col, value) => {
    const key = keyOf(row, col);
    set((s) => {
      return { data: { ...s.data, [key]: value } };
    });

    const { autoSaveEnabled } = get();
    if (!autoSaveEnabled) {
      set({ hasUnsavedChanges: true });
    }
  },

  // Supabase의 cells 테이블을 조회해서 현재 시트의 모든 셀 값을 로딩
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
        console.error("loadCellData 오류", error);
        return;
      }

      //  빈 배열일 때 굳이 {}로 덮어쓰고 깜빡임 유발할 필요가 없으면 early return
      if (!data || data.length === 0) {
        // 로딩은 했지만 비어있는 시트 → "저장된 스냅샷도 비어있다"라고 맞춰줌
        set({
          data: {},
          lastSavedData: {},
          hasUnsavedChanges: false,
        });
        return;
      }

      // Supabase의 각 행(row,col,value) 을  key: `${row}:${col}` 형태로 변환
      const next: Record<string, string> = {};
      for (const cell of data ?? [])
        next[`${cell.row}:${cell.col}`] = cell.value ?? "";

      // Zustand 상태에 반영
      set({ data: next, lastSavedData: next, hasUnsavedChanges: false });
    });
  },

  // 선택된 영역(여러 칸) 을 'Delete' 키로 지우는 기능
  clearSelectionCells: async () => {
    const { selection, pushHistory, data, autoSaveEnabled } = get();
    if (!selection) return;

    pushHistory(); // ctrl z 하기 위해 히스토리에 추가

    // 1) 로컬 상태 변경
    const draft = { ...data };
    const targets = rectToCells(selection);

    for (const { row, col } of targets) {
      draft[keyOf(row, col)] = "";
    }

    set({ data: draft });

    if (autoSaveEnabled) {
      await withUserId(async (uid) => {
        const { sheetId } = get();
        if (!sheetId) return;

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
    } else {
      set({ hasUnsavedChanges: true });
    }
  },

  // ClipboardSlice
  clipboard: null,

  // 선택된 영역을 복사 형식(TSV) 으로 만듦
  copySelectionToTSV: () => {
    const { selection } = get();

    if (!selection) return "";

    const grid = get2DGrid(selection);

    set({ clipboard: grid });

    return gridToTSV(grid);
  },

  pasteGridFromSelection: async (grid) => {
    // 선택 영역 확인
    const { selection, pushHistory, data, autoSaveEnabled } = get();
    if (!selection) return;

    pushHistory();

    const prev = data; // 기존 로컬 데이터
    const next = { ...prev }; // 붙여넣기 후의 새로운 데이터

    const h = grid.length; // 행 개수
    const w = Math.max(...grid.map((r) => r.length)); // 열 개수

    // grid 값을 selection의 좌상단부터 채워넣기
    for (let rr = 0; rr < h; rr++) {
      for (let cc = 0; cc < w; cc++) {
        const r = clampRow(selection.sr + rr);
        const c = clampCol(selection.sc + cc);
        const v = grid[rr][cc] ?? "";
        next[keyOf(r, c)] = v; // "2:3": "A" 이런 식으로 값 기록
      }
    }

    // 상태 업데이트 (UI 반영)
    set({
      data: next,
      selection: {
        sr: selection.sr,
        sc: selection.sc,
        er: clampRow(selection.sr + h - 1),
        ec: clampCol(selection.sc + w - 1),
      },
      isSelecting: false,
      anchor: null,
      head: null,
    });

    if (autoSaveEnabled) {
      await persistDataDiff(prev, next);
    } else {
      set({ hasUnsavedChanges: true });
    }
  },

  // HistorySlice
  historyLimit: 50,
  historyPast: [],
  historyFuture: [],

  pushHistory: () => {
    const { historyPast, historyLimit } = get();
    const snap = makeSnapshot(get());
    const nextPast = [...historyPast, snap];

    // 과거 스택 50개 넘으면 앞에서 하나 제거
    if (nextPast.length > historyLimit) nextPast.shift();

    set({ historyPast: nextPast, historyFuture: [] });
  },

  // 한 단계 과거 스냅샷으로 되돌리기
  undo: async () => {
    const {
      historyPast,
      historyFuture,
      data,
      stylesByCell,
      syncMirrorToFocus,
      autoSaveEnabled,
    } = get();
    if (historyPast.length === 0) return;

    // 되돌리기 전 상태 저장
    const prevData = data;
    const prevStyles = stylesByCell;

    // 되돌릴 스냅샷 가져오기
    const last = historyPast[historyPast.length - 1]; // 복원할 스냅샷

    // redo도 생각해서 지금 상태 스냅샷
    const nowSnap = makeSnapshot(get());

    set({
      data: last.data,
      stylesByCell: last.stylesByCell,
      selection: last.selection,
      focus: last.focus ?? null,
      isSelecting: false,
      anchor: null,
      head: null,
      editing: null,

      //마지막 스냅샷(지금 되돌아온 그 스냅샷)을 제거
      historyPast: historyPast.slice(0, historyPast.length - 1),

      // historyFuture에 현재(nowSnap) 넣기
      historyFuture: [...historyFuture, nowSnap],
    });

    if (autoSaveEnabled) {
      await persistDataDiff(prevData, last.data);
      await persistStyleDiff(prevStyles, last.stylesByCell);
    } else {
      set({ hasUnsavedChanges: true });
    }
    syncMirrorToFocus();
  },

  // 되돌린 것을 다시 되돌리기
  redo: async () => {
    const {
      historyPast,
      historyFuture,
      data,
      stylesByCell,
      syncMirrorToFocus,
      autoSaveEnabled,
    } = get();
    if (historyFuture.length === 0) return;

    const prevData = data; // DB diff용
    const prevStyles = stylesByCell;
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

    if (autoSaveEnabled) {
      await persistDataDiff(prevData, next.data);
      await persistStyleDiff(prevStyles, next.stylesByCell);
    } else {
      set({ hasUnsavedChanges: true });
    }
    syncMirrorToFocus();
  },

  // FormulaSlice
  formulaMirror: "",

  //포뮬라 입력창의 텍스트를 업데이트하는데, 동일한 값이면 다시 렌더링하지 않음
  setFormulaInput: (v) =>
    set((s) => (s.formulaMirror === v ? {} : { formulaMirror: v })),

  // 포커스 셀 -> 포뮬라 창 동기화
  syncMirrorToFocus: () => {
    const { focus, getValue } = get();
    if (!focus) return;
    const v = getValue(focus.row, focus.col) ?? "";
    set((s) => (s.formulaMirror === v ? {} : { formulaMirror: v })); // 다를 때만 → { formulaMirror: v }로 변경
  },

  //셀 찾아가서 → 그 셀 값이 수식이면 재귀로 평가 → 결과가 숫자면 number, 아니면 null을 돌려주는 함수
  resolveCellNumeric: (a1: string, depth: number = 0): number | null => {
    const { getValue, resolveCellNumeric } = get();
    if (depth > 50) return null; // 순환 가드

    const pos = a1ToPos(a1); // A1 -> (0,0)
    if (!pos) return null;

    const rawStr = getValue(pos.row, pos.col) ?? "";
    if (!rawStr) return null;

    // =으로 시작하면 수식으로 판단
    if (rawStr.trim().startsWith("=")) {
      // ealuateFormulaStrict : "= 1 + 2" 형태에서 앞의 "="를 떼고 사칙연산만 평가. 실패 시 null 반환
      const v = evaluateFormulaStrict(rawStr, {
        resolveCell: (innerA1: string): number | null =>
          resolveCellNumeric(innerA1, depth + 1),
      });
      return v == null || !isFinite(v) ? null : v;
    }

    const n = Number(rawStr);
    return isFinite(n) ? n : null;
  },

  // 포뮬라 입력창(FormulaInput)의 커서 위치를 저장하는 숫자.
  formulaCaret: 0,

  setFormulaCaret: (pos) => set({ formulaCaret: Math.max(0, pos) }),

  // 현재 캐럿 위치에 ref(A1, A1:B5 등) 삽입
  insertRefAtCaret: (ref, opts) => {
    const s = get();
    const src = s.formulaMirror ?? "";
    let caret = s.formulaCaret ?? 0;
    caret = Math.max(0, Math.min(src.length, caret));

    // 스마트 콤마: "..., " 보정
    let ins = ref;
    if (opts?.commaSmart) {
      const left = src.slice(0, caret);
      const right = src.slice(caret);

      // 왼쪽 끝 문자를 보고 콤마 필요 여부 판단
      const leftCh = left.trimEnd().slice(-1); // '(' or ',' or other
      const needCommaLeft = left.length > 0 && leftCh !== "(" && leftCh !== ",";

      // 오른쪽 시작이 ')'가 아니고, 오른쪽이 비어있지 않으며 앞에 콤마가 없다면 뒤쪽에도 콤마 필요할 수 있음
      const rightCh = right.trimStart()[0];
      const needCommaRight =
        right.length > 0 && rightCh && rightCh !== ")" && rightCh !== ",";

      if (needCommaLeft) ins = "," + ins;
      // 뒤쪽에 바로 다른 인자가 있다면 ",ref," 형태로 정돈
      if (needCommaRight) ins = ins + ",";
    }

    const next = src.slice(0, caret) + ins + src.slice(caret);
    const nextCaret = caret + ins.length;

    // 미러와 caret 동기
    set((st) =>
      st.formulaMirror === next && st.formulaCaret === nextCaret
        ? {}
        : { formulaMirror: next, formulaCaret: nextCaret }
    );
  },

  // ----StyleSlice----
  stylesByCell: {},

  getCellStyle: (row, col) => {
    return get().stylesByCell[keyOf(row, col)];
  },

  // 선택된 영역에 style 적용
  applyStyleToSelection: async (patch) => {
    const { pushHistory, selection, focus, stylesByCell, autoSaveEnabled } =
      get();
    pushHistory();

    const targets = selection ? rectToCells(selection) : focus ? [focus] : [];
    if (targets.length === 0) return;

    // 1) 로컬 상태 즉시 업데이트
    const nextMap = { ...stylesByCell };
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
    if (autoSaveEnabled) {
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
    } else {
      set({ hasUnsavedChanges: true });
    }
  },

  clearSelectionStyles: async (keys) => {
    const { pushHistory, selection, focus, stylesByCell, autoSaveEnabled } =
      get();
    pushHistory();

    const targets = selection ? rectToCells(selection) : focus ? [focus] : [];
    if (targets.length === 0) return;

    // 1) 로컬 상태 갱신
    const prevMap = stylesByCell;
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
    if (autoSaveEnabled) {
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
    } else {
      set({ hasUnsavedChanges: true });
    }
  },

  getFontSize: (row, col) => {
    const key = keyOf(row, col);
    const style = get().stylesByCell[key];
    return style?.fontSize ?? DEFAULT_FONT_SIZE;
  },

  getFontSizeForFocus: () => {
    const { focus, getFontSize } = get();

    if (!focus) return DEFAULT_FONT_SIZE;
    return getFontSize(focus.row, focus.col);
  },

  setFontSize: (next) => {
    const { pushHistory, selection, focus, stylesByCell, autoSaveEnabled } =
      get();

    pushHistory();
    const n = Math.round(clamp(next, 0, 72));

    const sel = selection;
    const targets = sel ? rectToCells(sel) : focus ? [focus] : [];
    if (targets.length === 0) return;

    // 1) stylesByCell 즉시 갱신 (동기)
    const map = { ...stylesByCell };
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
    if (autoSaveEnabled) {
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
    } else {
      set({ hasUnsavedChanges: true });
    }
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
      set({
        stylesByCell: map,
        lastSavedStyles: map,
        hasUnsavedChanges: false,
      });
    });
  },

  applyBorderToSelection: async (mode, spec) => {
    const { pushHistory, selection, focus, stylesByCell, autoSaveEnabled } =
      get();
    pushHistory();

    const targets = selection ? rectToCells(selection) : focus ? [focus] : [];
    if (targets.length === 0) return;

    const map = { ...stylesByCell };

    // 선택 박스 경계(있으면) 계산
    const box: Rect | null = selection
      ? { ...selection }
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
    if (autoSaveEnabled) {
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
    } else {
      set({ hasUnsavedChanges: true });
    }
  },

  clearSelectionBorders: async (mode) => {
    const { pushHistory, selection, focus, autoSaveEnabled, stylesByCell } =
      get();

    pushHistory();

    const targets = selection ? rectToCells(selection) : focus ? [focus] : [];
    if (targets.length === 0) return;

    const mapPrev = stylesByCell;
    const map: Record<string, CellStyle> = { ...mapPrev };

    const box: Rect | null = selection
      ? { ...selection }
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
    if (autoSaveEnabled) {
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
    } else {
      set({ hasUnsavedChanges: true });
    }
  },

  // ---- SheetListSlice ----
  sheets: [{ id: "default", name: "Sheet1" }],
  currentSheetId: "default",

  // --- SheetListSlice actions ---
  addSheet: async (name) => {
    await withUserId(async (uid) => {
      const { sheets, setCurrentSheet } = get();

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
      setCurrentSheet(id);
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
        get().loadUserSettings(),
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
      get().setCurrentSheet(nextId); //
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
        get().loadUserSettings(),
        get().loadCellData(),
        get().loadCellStyles(),
      ]);
      get().syncMirrorToFocus();
    });
  },

  // SaveSlice
  autoSaveEnabled: true,
  setAutoSaveEnabled: async (enabled) => {
    set({ autoSaveEnabled: enabled });

    await withUserId(async (uid) => {
      const { error } = await supabase.from("user_settings").upsert(
        {
          user_id: uid,
          auto_save_enabled: enabled,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

      if (error) {
        console.error("user_settings upsert 실패:", error);
      }
    });
  },
  hasUnsavedChanges: false,
  lastSavedData: {},
  lastSavedStyles: {},

  // 전체 저장 함수
  saveAll: async () => {
    const { lastSavedData, lastSavedStyles, data, stylesByCell, saveLayout } =
      get();

    // 1) 셀 값 diff 저장
    await persistDataDiff(lastSavedData, data);

    // 2) 스타일 diff 저장
    await persistStyleDiff(lastSavedStyles, stylesByCell);

    // 3) 레이아웃 저장 (sheet_layouts 전체 upsert)
    await saveLayout();

    // 4) "방금 상태"를 새 스냅샷으로 기록 + 더티 플래그 초기화
    set({
      lastSavedData: { ...data },
      lastSavedStyles: { ...stylesByCell },
      hasUnsavedChanges: false,
    });
  },

  loadUserSettings: async () => {
    await withUserId(async (uid) => {
      const { data, error } = await supabase
        .from("user_settings")
        .select("auto_save_enabled")
        .eq("user_id", uid)
        .maybeSingle();

      if (error) {
        console.error("user_settings load 실패:", error);
        return;
      }

      set({
        autoSaveEnabled: data?.auto_save_enabled ?? true,
      });
    });
  },
}));
