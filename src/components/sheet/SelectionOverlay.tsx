import React, { useRef } from "react";
import styles from "./SelectionOverlay.module.css";
import { useSheetStore, type Rect } from "./store/useSheetStore";
import { clientPointToCell } from "@/utils/clientPointToCell";

type Props = {
  columnWidths: number[];
  rowHeights: number[];
  gridRef: React.RefObject<HTMLDivElement | null>;
};

// src, hit(row,col) -> fill 대상 Rect 계산
function computeFillTarget(
  src: Rect,
  hit: { row: number; col: number }
): Rect | null {
  const { sr, sc, er, ec } = src;

  const inside =
    hit.row >= sr && hit.row <= er && hit.col >= sc && hit.col <= ec;
  if (inside) return null;

  const rowDiff = hit.row < sr ? hit.row - sr : hit.row > er ? hit.row - er : 0;
  const colDiff = hit.col < sc ? hit.col - sc : hit.col > ec ? hit.col - ec : 0;

  const absRow = Math.abs(rowDiff);
  const absCol = Math.abs(colDiff);

  // 세로/가로 중 더 멀리 벗어난 방향으로 결정
  if (absRow >= absCol) {
    // 수직 확장
    if (hit.row > er) {
      return { sr, sc, er: hit.row, ec };
    }
    if (hit.row < sr) {
      return { sr: hit.row, sc, er, ec };
    }
  } else {
    // 수평 확장
    if (hit.col > ec) {
      return { sr, sc, er, ec: hit.col };
    }
    if (hit.col < sc) {
      return { sr, sc: hit.col, er, ec };
    }
  }
  return null;
}

// Rect -> px box(left/top/width/height)
function rectToBox(rect: Rect, columnWidths: number[], rowHeights: number[]) {
  const sumRange = (arr: number[], l: number, r: number) => {
    if (l > r) return 0;
    let acc = 0;
    for (let i = l; i <= r; i++) acc += arr[i];
    return acc;
  };

  const left = sumRange(columnWidths, 0, rect.sc - 1);
  const top = sumRange(rowHeights, 0, rect.sr - 1);
  const width = sumRange(columnWidths, rect.sc, rect.ec);
  const height = sumRange(rowHeights, rect.sr, rect.er);

  return { left, top, width, height };
}

export default function SelectionOverlay({
  columnWidths,
  rowHeights,
  gridRef,
}: Props) {
  const selection = useSheetStore((s) => s.selection);
  const isSelecting = useSheetStore((s) => s.isSelecting);
  const fillPreview = useSheetStore((s) => s.fillPreview);
  const setFillPreview = useSheetStore((s) => s.setFillPreview);

  // fill handle 드래그 중인지
  const isFillingRef = useRef(false);
  const baseSelectionRef = useRef<Rect | null>(null);

  if (!selection) return null;

  const count =
    (selection.er - selection.sr + 1) * (selection.ec - selection.sc + 1);

  const showOverlay = !isSelecting && count >= 2; // 기존처럼: 2칸 이상일 때만 파란 영역
  const showHandle = !isSelecting && !!selection; // ✅ 한 칸이어도 핸들은 항상 노출

  const mainBox = rectToBox(selection, columnWidths, rowHeights);
  const previewBox =
    fillPreview && rectToBox(fillPreview, columnWidths, rowHeights);

  const handleFillMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (!gridRef.current || !selection) return;

    isFillingRef.current = true;
    baseSelectionRef.current = selection;
    setFillPreview(null);

    const onMove = (ev: MouseEvent) => {
      if (!isFillingRef.current || !baseSelectionRef.current) return;
      const hit = clientPointToCell({
        clientX: ev.clientX,
        clientY: ev.clientY,
        gridEl: gridRef.current,
        columnWidths,
        rowHeights,
      });
      if (!hit) {
        setFillPreview(null);
        return;
      }
      const target = computeFillTarget(baseSelectionRef.current, hit);
      setFillPreview(target);
    };

    const onUp = () => {
      if (!isFillingRef.current) return;
      isFillingRef.current = false;
      document.removeEventListener("mousemove", onMove);

      const state = useSheetStore.getState();
      const preview = state.fillPreview;
      if (preview) {
        void state.fillSelectionTo(preview);
      }
      state.setFillPreview(null);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp, { once: true });
  };

  return (
    <>
      {showOverlay && (
        <div className={styles.selectionOverlay} style={mainBox} />
      )}

      {previewBox && <div className={styles.fillPreview} style={previewBox} />}

      {showHandle && (
        <div
          className={styles.fillHandle}
          style={{
            left: mainBox.left + mainBox.width - 4,
            top: mainBox.top + mainBox.height - 4,
          }}
          onMouseDown={handleFillMouseDown}
        />
      )}
    </>
  );
}
