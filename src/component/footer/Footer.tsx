import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <div className={styles.container}>
      <div className={styles.plus}>
        <img width="20px" src="./images/plus.svg" alt="plus icon" />
      </div>
      <div className={styles.hamburger}>
        <img width="20px" src="./images/hamburger.svg" alt="hamburger icon" />
      </div>
      <div className={styles.sheet}></div>
    </div>
  );
}
