// src/components/sheet/MergedCellOverlay.tsx

import { useSheetStore } from "./store/useSheetStore";
import { rectToViewportBox } from "./utils/layoutBox";
import { toDisplayString, DISPLAY_ERROR } from "@/utils/formula";
import { isNumericValue, formatWithComma } from "@/utils/numberFormat";
import { DEFAULT_FONT_SIZE } from "./SheetConstants";

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

        const box = rectToViewportBox(
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
              zIndex: 50,
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
