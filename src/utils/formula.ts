type Token = { type: "num" | "op" | "lp" | "rp"; v: string };

const OP_PRI: Record<string, number> = { "+": 1, "-": 1, "*": 2, "/": 2 };
export const DISPLAY_ERROR = "#ERROR";

// Arithmetic = 산수의
// 문자열이 "="으로 시작하면 “수식”으로 간주 => true
export function isArithmeticFormula(input: string | null | undefined): boolean {
  if (!input) return false;
  return input.trim().startsWith("=");
}
/** "= 1 + 2" 형태에서 앞의 "="를 떼고 사칙연산만 평가. 실패 시 null 반환 */
export function evaluateFormulaStrict(input: string): number | null {
  const expr = input.trim().replace(/^=/, "").replace(/\s+/g, "");
  if (!isValidChars(expr)) return null;

  const tokens = tokenize(expr);
  if (!tokens) return null;

  // rpn = Reverse Polish Notation, 후위 표기식
  const rpn = toRPN(tokens);
  if (!rpn) return null;

  const out = evalRPN(rpn);
  if (out == null || !isFinite(out)) return null;

  // 소수점 과도한 자리수 방지
  const rounded = roundSmart(out);
  return rounded;
}

function isValidChars(expr: string): boolean {
  // 문자열 전체가 숫자, +, -, *, /, (, ), 공백으로만 이루어졌으면 통과
  return /^[0-9+\-*/().]+$/.test(expr);
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

    if ((ch >= "0" && ch <= "9") || ch === ".") {
      // number
      let j = i + 1;

      while (j < expr.length && /[0-9.]/.test(expr[j])) j++;
      const num = expr.slice(i, j);
      if (!/^\d*\.?\d+$/.test(num)) return null; // ".." 같은 케이스 방지
      tokens.push({ type: "num", v: num });
      i = j;
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
    if (t.type === "num") {
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

function evalRPN(rpn: Token[]): number | null {
  const st: number[] = [];
  for (const t of rpn) {
    if (t.type === "num") {
      st.push(parseFloat(t.v));
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

export function toDisplayString(raw: string | null | undefined): string {
  if (raw == null) return "";
  const s = String(raw);

  if (!isArithmeticFormula(s.trim())) return s;

  const v = evaluateFormulaStrict(s);
  if (v === null) return DISPLAY_ERROR;

  // 보기 좋게 문자열화
  const str = String(v);
  // 끝이 ".0"이면 정수로 표시
  return str.endsWith(".0") ? String(Math.round(v)) : str;
}
