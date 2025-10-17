import styles from "./SelectionOverlay.module.css";
import { useSheetStore } from "./store/useSheetStore";

export default function SelectionOverlay({
  cellWidth,
  cellHeight,
}: {
  cellWidth: number;
  cellHeight: number;
}) {
  const selection = useSheetStore((s) => s.selection);
  const isSelecting = useSheetStore((s) => s.isSelecting);

  if (!selection) return null;

  const count =
    (selection.er - selection.sr + 1) * (selection.ec - selection.sc + 1);

  const show = count >= 2 && !isSelecting;

  if (!show) return null;

  const style = {
    left: selection.sc * cellWidth,
    top: selection.sr * cellHeight,
    width: (selection.ec - selection.sc + 1) * cellWidth,
    height: (selection.er - selection.sr + 1) * cellHeight,
  } as const;

  return <div className={styles.selectionOverlay} style={style} />;
}
