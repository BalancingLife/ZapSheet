import type { BorderSpec, CellStyle } from "../types";

type BorderEdge = "top" | "left" | "right" | "bottom";

export function normalizeBorderSpec(
  border?: BorderSpec,
): Required<BorderSpec> | null {
  if (!border) return null;
  return {
    color: border.color ?? "#222",
    width: Math.max(0, Math.round(border.width ?? 1)),
    style: border.style ?? "solid",
  };
}

export function toBorderCss(border?: BorderSpec): string | undefined {
  const normalized = normalizeBorderSpec(border);
  return normalized
    ? `${normalized.width}px ${normalized.style} ${normalized.color}`
    : undefined;
}

export function resolveBorderEdge(
  row: number,
  col: number,
  edge: BorderEdge,
  getStyle: (row: number, col: number) => CellStyle | undefined,
): BorderSpec | undefined {
  const selfStyle = getStyle(row, col);
  const selfEdge = selfStyle?.border?.[edge];

  if (selfEdge) return selfEdge;

  if (edge === "top" && row > 0) {
    return getStyle(row - 1, col)?.border?.bottom;
  }

  if (edge === "left" && col > 0) {
    return getStyle(row, col - 1)?.border?.right;
  }

  return undefined;
}
