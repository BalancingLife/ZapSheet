import Header from "@/components/header/Header";
import Sheet from "@/components/sheet/Sheet";
import Footer from "@/components/footer/Footer";
import styles from "./Home.module.css";
import SheetBoot from "@/components/sheet/SheetBoot";

export default function Home() {
  return (
    <div className={styles.container}>
      <SheetBoot />
      <Header />
      <Sheet />
      <Footer />
    </div>
  );
}
