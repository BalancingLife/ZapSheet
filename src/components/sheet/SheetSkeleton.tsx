import styles from "./SheetSkeleton.module.css";

type Props = {
  rowHeaderWidth: number;
  colHeaderHeight: number;
};

export default function SheetSkeleton({
  rowHeaderWidth,
  colHeaderHeight,
}: Props) {
  return (
    <div className={styles.container}>
      {/* 좌상단 코너 */}
      <div
        className={styles.corner}
        style={{ width: rowHeaderWidth, height: colHeaderHeight }}
      />

      {/* 상단 컬럼 헤더 바 */}
      <div
        className={styles.colHeader}
        style={{ height: colHeaderHeight, marginLeft: rowHeaderWidth }}
      >
        <div className={styles.colBlock} />
        <div className={styles.colBlock} />
        <div className={styles.colBlock} />
        <div className={styles.colBlock} />
        <div className={styles.colBlock} />
      </div>

      {/* 좌측 로우 헤더 바 */}
      <div
        className={styles.rowHeader}
        style={{ width: rowHeaderWidth, marginTop: colHeaderHeight }}
      >
        <div className={styles.rowBlock} />
        <div className={styles.rowBlock} />
        <div className={styles.rowBlock} />
        <div className={styles.rowBlock} />
        <div className={styles.rowBlock} />
        <div className={styles.rowBlock} />
        <div className={styles.rowBlock} />
        <div className={styles.rowBlock} />
        <div className={styles.rowBlock} />
        <div className={styles.rowBlock} />
        <div className={styles.rowBlock} />

        <div className={styles.rowBlock} />
        <div className={styles.rowBlock} />
        <div className={styles.rowBlock} />
        <div className={styles.rowBlock} />
        <div className={styles.rowBlock} />
        <div className={styles.rowBlock} />
        <div className={styles.rowBlock} />
        <div className={styles.rowBlock} />
        <div className={styles.rowBlock} />
        <div className={styles.rowBlock} />
        <div className={styles.rowBlock} />
        <div className={styles.rowBlock} />
        <div className={styles.rowBlock} />
        <div className={styles.rowBlock} />
        <div className={styles.rowBlock} />
      </div>

      {/* 본문 그리드 영역 */}
      <div
        className={styles.grid}
        style={{ marginLeft: rowHeaderWidth, marginTop: colHeaderHeight }}
      >
        {/* 타일 몇 개만 깔아 심리적 로딩감 주기 */}
        {Array.from({ length: 108 }).map((_, i) => (
          <div key={i} className={styles.cell} />
        ))}
      </div>
    </div>
  );
}
