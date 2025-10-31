// Intl.NumberFormat은 브라우저 내장 객체로, 숫자를 “지역화된” 형태(1,234 등)로 바꿔주는 포맷터
const nf = new Intl.NumberFormat("ko-KR");

// 문자열에서 콤마만 제거하고 양끝 공백 제거
export const stripComma = (s: string) => s.replaceAll(",", "").trim();

// 렌더링용: 숫자로 해석 가능하면 콤마 포맷, 아니면 원문 유지
export const formatWithComma = (s: string) => {
  const t = stripComma(s);
  // 편집 중일 수 있는 형태들은 손대지 않음
  if (t === "" || t === "-" || t === "." || t === "-.") return s;
  const n = Number(t);
  return Number.isFinite(n) ? nf.format(n) : s;
};
