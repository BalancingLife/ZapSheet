import Header from "@/component/header/Header";
import Sheet from "@/component/sheet/Sheet";
import Footer from "@/component/footer/Footer";
import styles from "./Home.module.css";

export default function Home() {
  return (
    <div className={styles.container}>
      <Header />
      <Sheet />
      <Footer />
    </div>
  );
}
