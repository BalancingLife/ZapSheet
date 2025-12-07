import Header from "@/components/header/Header";
import Sheet from "@/components/sheet/Sheet";
import Footer from "@/components/footer/Footer";
import styles from "./Home.module.css";
import SheetBoot from "@/components/sheet/SheetBoot";

export default function Home() {
  return (
    <div className={styles.container}>
      <SheetBoot /> {/* 이건 오버레이로 빼는 게 더 좋고 */}
      <Header />
      <div className={styles.main}>
        <Sheet />
      </div>
      <Footer />
    </div>
  );
}
