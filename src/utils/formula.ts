import { a1ToPos, a1ToRect, colToLabel } from "./a1Utils";

type Token =
  | { type: "num"; v: string }
  | { type: "op"; v: string }
  | { type: "lp"; v: string }
  | { type: "rp"; v: string }
  | { type: "cell"; v: string };

const OP_PRI: Record<string, number> = { "+": 1, "-": 1, "*": 2, "/": 2 };
export const DISPLAY_ERROR = "#ERROR";

// Arithmetic = 산수의
// 문자열이 "="으로 시작하면 “수식”으로 간주 => true
export function isArithmeticFormula(input: string | null | undefined): boolean {
  if (!input) return false;
  return input.trim().startsWith("=");
}
/** "= 1 + 2" 형태에서 앞의 "="를 떼고 사칙연산만 평가. 실패 시 null 반환 */
export function evaluateFormulaStrict(
  input: string,
  opts?: { resolveCell?: (a1: string) => number | null }
): number | null {
  const expr = input.trim().replace(/^=/, "").replace(/\s+/g, "");
  if (!isValidChars(expr)) return null;

  const tokens = tokenize(expr);
  if (!tokens) return null;

  // rpn = Reverse Polish Notation, 후위 표기식
  const rpn = toRPN(tokens);
  if (!rpn) return null;

  const out = evalRPN(rpn, opts?.resolveCell);
  if (out == null || !isFinite(out)) return null;

  // 소수점 과도한 자리수 방지
  const rounded = roundSmart(out);
  return rounded;
}

function isValidChars(expr: string): boolean {
  // 문자열 전체가 숫자, +, -, *, /, (, ),알파벳, 공백으로만 이루어졌으면 통과
  return /^[0-9A-Za-z+\-*/().]+$/.test(expr);
  // test() : 문자열이 정규식 패턴과 일치하면 true, 아니면 false
}

function tokenize(expr: string): Token[] | null {
  const tokens: Token[] = [];
  let i = 0;

  while (i < expr.length) {
    const ch = expr[i];

    if (ch === " " || ch === "\t") {
      i++;
      continue;
    }

    // number
    if ((ch >= "0" && ch <= "9") || ch === ".") {
      let j = i + 1;
      while (j < expr.length && /[0-9.]/.test(expr[j])) j++;
      const num = expr.slice(i, j);
      if (!/^\d*\.?\d+$/.test(num)) return null; // ".." 같은 케이스 방지
      tokens.push({ type: "num", v: num });
      i = j;
      continue;
    }
    // cell: 알파벳+숫자 (예: A1, AA12)
    if (/[A-Za-z]/.test(ch)) {
      let j = i;
      while (j < expr.length && /[A-Za-z]/.test(expr[j])) j++;
      let k = j;
      while (k < expr.length && /[0-9]/.test(expr[k])) k++;
      if (k === j) return null; // 알파벳 뒤에 숫자 필수
      const a1 = expr.slice(i, k);
      tokens.push({ type: "cell", v: a1.toUpperCase() });
      i = k;
      continue;
    }

    if (ch === "+" || ch === "-" || ch === "*" || ch === "/") {
      tokens.push({ type: "op", v: ch });
      i++;
      continue;
    }

    if (ch === "(") {
      tokens.push({ type: "lp", v: ch });
      i++;
      continue;
    }
    if (ch === ")") {
      tokens.push({ type: "rp", v: ch });
      i++;
      continue;
    }

    return null; // 허용 안 되는 문자
  }

  return tokens;
}

function toRPN(tokens: Token[]): Token[] | null {
  const out: Token[] = [];
  const stack: Token[] = [];

  for (const t of tokens) {
    if (t.type === "num" || t.type === "cell") {
      out.push(t);
    } else if (t.type === "op") {
      while (
        stack.length &&
        stack[stack.length - 1].type === "op" &&
        OP_PRI[stack[stack.length - 1].v] >= OP_PRI[t.v]
      ) {
        out.push(stack.pop()!);
      }
      stack.push(t);
    } else if (t.type === "lp") {
      stack.push(t);
    } else if (t.type === "rp") {
      // '(' 가 나올 때까지 pop
      let found = false;
      while (stack.length) {
        const top = stack.pop()!;
        if (top.type === "lp") {
          found = true;
          break;
        }
        out.push(top);
      }
      if (!found) return null; // 괄호 불일치
    }
  }

  while (stack.length) {
    const top = stack.pop()!;
    if (top.type === "lp" || top.type === "rp") return null; // 괄호 불일치
    out.push(top);
  }

  return out;
}

function evalRPN(
  rpn: Token[],
  resolveCell?: (a1: string) => number | null
): number | null {
  const st: number[] = [];
  for (const t of rpn) {
    if (t.type === "num") {
      st.push(parseFloat(t.v));
    } else if (t.type === "cell") {
      if (!resolveCell) return null; // resolver 없으면 아직 지원 안함
      const v = resolveCell(t.v);
      if (v == null || !isFinite(v)) return null;
      st.push(v);
    } else if (t.type === "op") {
      if (st.length < 2) return null;
      const b = st.pop()!;
      const a = st.pop()!;
      switch (t.v) {
        case "+":
          st.push(a + b);
          break;
        case "-":
          st.push(a - b);
          break;
        case "*":
          st.push(a * b);
          break;
        case "/":
          st.push(b === 0 ? NaN : a / b);
          break;
        default:
          return null;
      }
    }
  }
  return st.length === 1 ? st[0] : null;
}

function roundSmart(v: number): number {
  // 12자리 정도까지 반올림 (표시용 안정화)
  const s = v.toString();
  if (s.includes("e") || s.length > 15) {
    return parseFloat(v.toFixed(10));
  }
  return v;
}

// ======================================
// 1) 함수 수식 감지/파싱 유틸
// ======================================
function parseFuncCall(src: string): { name: string; args: string } | null {
  const t = src.trim();
  // =FUNC( ... )
  const m = /^=([A-Za-z]+)\((.*)\)$/.exec(t);
  if (!m) return null;

  const [, name, args] = m;
  return { name: name.toUpperCase(), args: args.trim() };
}

function isSupportedFunc(
  name: string
): name is "SUM" | "AVERAGE" | "MIN" | "MAX" | "COUNT" | "PRODUCT" {
  const n = name.toUpperCase();
  return (
    n === "SUM" ||
    n === "AVERAGE" ||
    n === "MIN" ||
    n === "MAX" ||
    n === "COUNT" ||
    n === "PRODUCT"
  );
}

// ======================================
// 2) 인자 수집기 (숫자만 모아서 배열로 반환)
// - 숫자 리터럴, 단일 셀(A1), 범위(A1:B5)
// - 비숫자는 무시
// ======================================
function collectNumericArgs(
  argsStr: string,
  resolveCell?: (a1: string) => number | null
): number[] | null {
  if (!resolveCell) return null;

  // 아주 단순 콤마 split (이번 라운드: 중첩/문자열 미지원)
  const args = argsStr
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const out: number[] = [];

  for (const arg of args) {
    // 1) 범위?
    const rect = a1ToRect(arg);
    if (rect) {
      for (let r = rect.sr; r <= rect.er; r++) {
        for (let c = rect.sc; c <= rect.ec; c++) {
          const a1 = `${colToLabel(c)}${r + 1}`;
          const v = resolveCell(a1);
          if (v != null && isFinite(v)) out.push(v);
        }
      }
      continue;
    }

    // 2) 단일 셀?
    const pos = a1ToPos(arg);
    if (pos) {
      const a1 = `${colToLabel(pos.col)}${pos.row + 1}`;
      const v = resolveCell(a1);
      if (v != null && isFinite(v)) out.push(v);
      continue;
    }

    // 3) 숫자 리터럴?
    const n = Number(arg);
    if (isFinite(n)) {
      out.push(n);
      continue;
    }

    // 4) 그 외는 무시
  }

  return out;
}

// ======================================
// 3) 집계기 (SUM/AVERAGE/MIN/MAX/COUNT)
// - 대상이 0개면: AVERAGE/MIN/MAX => null, COUNT => 0
// ======================================

// Aggregate = 소프트웨어 개발에서 관련된 객체들의 집합

function evalAggregate(
  name: "SUM" | "AVERAGE" | "MIN" | "MAX" | "COUNT" | "PRODUCT",
  argsStr: string,
  resolveCell?: (a1: string) => number | null
): number | null {
  const nums = collectNumericArgs(argsStr, resolveCell);
  if (nums == null) return null;

  const n = nums.length;

  switch (name) {
    case "SUM": {
      const s = nums.reduce((acc, v) => acc + v, 0);
      return roundSmart(s);
    }
    case "AVERAGE": {
      if (n === 0) return null;
      const s = nums.reduce((acc, v) => acc + v, 0);
      return roundSmart(s / n);
    }
    case "MIN": {
      if (n === 0) return null;
      let m = nums[0];
      for (let i = 1; i < n; i++) if (nums[i] < m) m = nums[i];
      return roundSmart(m);
    }
    case "MAX": {
      if (n === 0) return null;
      let m = nums[0];
      for (let i = 1; i < n; i++) if (nums[i] > m) m = nums[i];
      return roundSmart(m);
    }
    case "COUNT": {
      return n; // 대상 0개면 0
    }

    case "PRODUCT": {
      if (n === 0) return null;
      let p = 1;
      for (let i = 0; i < n; i++) p *= nums[i];
      return roundSmart(p);
    }
  }
}

// ======================================
// 4) 기존 SUM 전용 분기를 "제너릭 디스패처"로 교체
//    (기존 isSumFormula/evalSUM는 남겨도 되지만, 아래가 우선 적용됨)
// ======================================

export function toDisplayString(
  raw: string | null | undefined,
  opts?: { resolveCell?: (a1: string) => number | null }
): string {
  if (raw == null) return "";
  const s = String(raw).trim();

  // 4-1) 함수 수식 디스패치 (SUM/AVERAGE/MIN/MAX/COUNT)
  const fc = parseFuncCall(s);
  if (fc && isSupportedFunc(fc.name)) {
    const v = evalAggregate(fc.name, fc.args, opts?.resolveCell);
    if (v == null || !isFinite(v)) return DISPLAY_ERROR;
    const str = String(v);
    return str.endsWith(".0") ? String(Math.round(v)) : str;
  }

  // 4-2) 사칙연산 (=1+2, =A1+B2*3 ...)
  if (!isArithmeticFormula(s)) return s;
  const v = evaluateFormulaStrict(s, opts);
  if (v === null) return DISPLAY_ERROR;

  const str = String(v);
  return str.endsWith(".0") ? String(Math.round(v)) : str;
}
