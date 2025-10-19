import styles from "./SelectionOverlay.module.css";
import { useSheetStore } from "./store/useSheetStore";

export default function SelectionOverlay({
  columnWidths,
  rowHeights,
}: {
  columnWidths: number[];
  rowHeights: number[];
}) {
  const selection = useSheetStore((s) => s.selection);
  const isSelecting = useSheetStore((s) => s.isSelecting);
  if (!selection) return null;

  const count =
    (selection.er - selection.sr + 1) * (selection.ec - selection.sc + 1);
  const show = count >= 2 && !isSelecting;
  if (!show) return null;

  const sumRange = (arr: number[], l: number, r: number) => {
    if (l > r) return 0;
    let acc = 0;
    for (let i = l; i <= r; i++) acc += arr[i];
    return acc;
  };

  const left = sumRange(columnWidths, 0, selection.sc - 1);
  const top = sumRange(rowHeights, 0, selection.sr - 1);
  const width = sumRange(columnWidths, selection.sc, selection.ec);
  const height = sumRange(rowHeights, selection.sr, selection.er);

  return (
    <div
      className={styles.selectionOverlay}
      style={{ left, top, width, height }}
    />
  );
}
