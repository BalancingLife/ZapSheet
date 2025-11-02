import styles from "./ToolBar.module.css";
export default function ToolBar() {
  return (
    <div className={styles.toolBarConatiner}>
      <div>ctrl Z</div>
      <div>ctrl Y</div>
      <div>글자 크기</div>
      <div>글자 색상</div>
      <div>배경 색상</div>
      <div>테두리</div>
    </div>
  );
}
