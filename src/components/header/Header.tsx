import styles from "./Header.module.css";
import { supabase } from "@/lib/supabaseClient";

export default function Header() {
  return (
    <div className={styles.container}>
      <div className={styles.rowContainer}>
        <div className={styles.left}>
          <div className={styles.logo}>
            <img width="40px" src="./images/vite.svg" alt="Zap Sheet Logo" />
          </div>
          <div className={styles.fileName}>Zap Sheet</div>
        </div>
        <div className={styles.right}>
          <button
            className={styles.logOutBtn}
            onClick={() => supabase.auth.signOut()}
          >
            로그아웃
          </button>
        </div>
      </div>

      <div>Toolbar 영역</div>
      <div>NameBox 영역</div>
    </div>
  );
}
