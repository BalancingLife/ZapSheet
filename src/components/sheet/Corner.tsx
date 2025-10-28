import styles from "./Corner.module.css";
import { useSheetStore } from "./store/useSheetStore";

export default function Corner() {
  const selectAll = useSheetStore((s) => s.selectAll);

  return (
    <div
      className={styles.corner}
      role="button"
      tabIndex={0}
      aria-label="Select all"
      onMouseDown={selectAll}
    />
  );
}
