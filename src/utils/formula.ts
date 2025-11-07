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

export function toDisplayString(
  raw: string | null | undefined,
  opts?: { resolveCell?: (a1: string) => number | null }
): string {
  if (raw == null) return "";
  const s = String(raw);

  //  SUM 우선 처리
  if (isSumFormula(s)) {
    const v = evalSUM(s, opts);
    return v == null
      ? DISPLAY_ERROR
      : String(v).endsWith(".0")
      ? String(Math.round(v))
      : String(v);
  }

  if (!isArithmeticFormula(s.trim())) return s;

  const v = evaluateFormulaStrict(s, opts);
  if (v === null) return DISPLAY_ERROR;

  // 보기 좋게 문자열화
  const str = String(v);
  // 끝이 ".0"이면 정수로 표시
  return str.endsWith(".0") ? String(Math.round(v)) : str;
}

// --- SUM 포맷 감지

// 이거 동작원리 이해
// 이거 동작원리 이해
// 이거 동작원리 이해
// 이거 동작원리 이해
function isSumFormula(s: string): boolean {
  const t = s.trim();
  return /^=SUM\(/i.test(t) && t.endsWith(")");
}
// 이거 동작원리 이해
// 이거 동작원리 이해
// 이거 동작원리 이해
// 이거 동작원리 이해

// --- SUM 본체 평가 : 숫자 | A1 | A1:B5 만 지원
function evalSUM(
  src: string,
  opts?: { resolveCell?: (a1: string) => number | null }
): number | null {
  if (!opts?.resolveCell) return null;
  const inner = src.trim().slice(1).trim(); // "=SUM(...)" -> "SUM(...)"
  const body = inner.replace(/^SUM\(/i, "").slice(0, -1); // 괄호 안

  // 콤마 분할
  const args = body
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  let acc = 0;
  for (const arg of args) {
    // 1) 범위?
    const rect = a1ToRect(arg);
    if (rect) {
      for (let r = rect.sr; r <= rect.er; r++) {
        for (let c = rect.sc; c <= rect.ec; c++) {
          const a1 = `${colToLabel(c)}${r + 1}`;
          const v = opts.resolveCell(a1);
          if (v != null && isFinite(v)) acc += v;
        }
      }
      continue;
    }

    // 2) 단일 셀?
    const pos = a1ToPos(arg);
    if (pos) {
      const a1 = `${colToLabel(pos.col)}${pos.row + 1}`;
      const v = opts.resolveCell(a1);
      if (v != null && isFinite(v)) acc += v;
      continue;
    }

    // 3) 숫자 리터럴?
    const n = Number(arg);
    if (isFinite(n)) {
      acc += n;
      continue;
    }

    // 그 외는 0 취급(엑셀과 유사하게 비숫자 무시)
  }

  return roundSmart(acc);
}
