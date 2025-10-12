import styles from "./Sheet.module.css";
import Corner from "./Corner";
import ColHeader from "./ColHeader";
import RowHeader from "./RowHeader";
import Grid from "./Grid";

export default function Sheet() {
  return (
    <div className={styles.container}>
      <Corner />
      <ColHeader />
      <RowHeader />
      <Grid />
    </div>
  );
}
