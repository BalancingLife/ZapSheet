import AddressInput from "./AddressInput";
import FormulaInput from "./FormulaInput";
import styles from "./NameBox.module.css";

export default function NameBox() {
  return (
    <div className={styles.NameBoxContainer}>
      <AddressInput />
      <FormulaInput />
    </div>
  );
}
