import styles from "./Header.module.css";

export default function Header() {
  return (
    <div className={styles.container}>
      <div className={styles.headerContainer}>
        <div className={styles.logo}>
          <img width="40px" src="./images/vite.svg" alt="Zap Sheet Logo" />
        </div>
        <div className={styles.fileName}>Zap Sheet</div>
      </div>

      <div>Toolbar 영역</div>
      <div>NameBox 영역</div>
    </div>
  );
}
