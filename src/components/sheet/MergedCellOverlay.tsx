// src/components/sheet/MergedCellOverlay.tsx

import { useSheetStore } from "./store/useSheetStore";
import type { Rect } from "./store/useSheetStore";
import { toDisplayString, DISPLAY_ERROR } from "@/utils/formula";
import { isNumericValue, formatWithComma } from "@/utils/numberFormat";
import { DEFAULT_FONT_SIZE } from "./SheetConstants";

// EditOverlay에 있는 거랑 거의 동일한 rectToBox
function rectToBox(
  rect: Rect,
  columnWidths: number[],
  rowHeights: number[],
  rowHeaderWidth: number,
  colHeaderHeight: number,
  scrollX: number,
  scrollY: number
) {
  const sum = (arr: number[], s: number, e: number) => {
    let acc = 0;
    for (let i = s; i <= e; i++) acc += arr[i];
    return acc;
  };

  const top = colHeaderHeight + sum(rowHeights, 0, rect.sr - 1) - scrollY;
  const left = rowHeaderWidth + sum(columnWidths, 0, rect.sc - 1) - scrollX;
  const width = sum(columnWidths, rect.sc, rect.ec);
  const height = sum(rowHeights, rect.sr, rect.er);

  return { top, left, width, height };
}

type Props = {
  columnWidths: number[];
  rowHeights: number[];
  rowHeaderWidth: number;
  colHeaderHeight: number;
  scrollX: number;
  scrollY: number;
};

export default function MergedCellOverlay({
  columnWidths,
  rowHeights,
  rowHeaderWidth,
  colHeaderHeight,
  scrollX,
  scrollY,
}: Props) {
  const mergedRegions = useSheetStore((s) => s.mergedRegions);
  const data = useSheetStore((s) => s.data);
  const stylesByCell = useSheetStore((s) => s.stylesByCell);
  const resolveCell = useSheetStore((s) => s.resolveCellNumeric);

  if (!mergedRegions.length) return null;

  return (
    <>
      {mergedRegions.map((rect, idx) => {
        const masterKey = `${rect.sr}:${rect.sc}`;
        const raw = data[masterKey] ?? "";

        // 수식 평가
        const display = toDisplayString(raw, { resolveCell });
        const isErr = display === DISPLAY_ERROR;

        const style = stylesByCell[masterKey];
        const fontSize = style?.fontSize ?? DEFAULT_FONT_SIZE;

        const isNumeric = isNumericValue(display);

        // 가로 정렬: 스타일 우선, 없으면 숫자는 right / 나머지는 left
        const hAlign: "left" | "center" | "right" =
          style?.textAlign ?? (isNumeric ? "right" : "left");

        // ✅ 세로 정렬: 스타일 없으면 bottom 기본
        const vAlign: "top" | "middle" | "bottom" =
          style?.verticalAlign ?? "bottom";

        const box = rectToBox(
          rect,
          columnWidths,
          rowHeights,
          rowHeaderWidth,
          colHeaderHeight,
          scrollX,
          scrollY
        );

        const justifyContent =
          hAlign === "center"
            ? "center"
            : hAlign === "right"
            ? "flex-end"
            : "flex-start";

        // ✅ verticalAlign → flex alignItems 매핑
        const alignItems =
          vAlign === "top"
            ? "flex-start"
            : vAlign === "middle"
            ? "center"
            : "flex-end";

        return (
          <div
            key={idx}
            style={{
              position: "absolute",
              top: box.top,
              left: box.left,
              width: box.width,
              height: box.height,
              // 셀 위에 떠 있는 레이어이지만, 클릭 막으면 안 되니까 none
              pointerEvents: "none",
              display: "flex",
              alignItems, //  세로 정렬 반영
              justifyContent, // 가로 정렬
              boxSizing: "border-box",
              padding: "0 4px 2px 4px",
              overflow: "hidden",
              whiteSpace: "nowrap",
              zIndex: 3000, // 셀 위, EditOverlay(5000) 아래 정도
              color: isErr ? "#d93025" : style?.textColor,
              fontSize: `${fontSize}px`,
              fontWeight: style?.bold ? "bold" : "normal",
              fontStyle: style?.italic ? "italic" : "normal",
              textDecoration: style?.underline ? "underline" : "none",
              background: "transparent",
            }}
          >
            {isErr ? display : isNumeric ? formatWithComma(display) : display}
          </div>
        );
      })}
    </>
  );
}
