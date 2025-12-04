// HeaderMenu.tsx
import { useEffect } from "react";
import { useSheetStore } from "./store/useSheetStore";
import styles from "./HeaderMenu.module.css";

export default function HeaderMenu() {
  const headerMenu = useSheetStore((s) => s.headerMenu);
  const closeHeaderMenu = useSheetStore((s) => s.closeHeaderMenu);

  const insertRowAt = useSheetStore((s) => s.insertRowAt);
  const deleteRowAt = useSheetStore((s) => s.deleteRowAt);
  const insertColAt = useSheetStore((s) => s.insertColAt);
  const deleteColAt = useSheetStore((s) => s.deleteColAt);

  // 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    if (!headerMenu) return;

    const onClickOutside = () => closeHeaderMenu();

    window.addEventListener("click", onClickOutside);
    return () => window.removeEventListener("click", onClickOutside);
  }, [headerMenu, closeHeaderMenu]);

  if (!headerMenu) return null;

  const { type, index, x, y } = headerMenu;

  return (
    <div
      className={styles.menu}
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* ------------------------------ */}
      {/* 행 메뉴: 위/아래 삽입 + 삭제 */}
      {/* ------------------------------ */}
      {type === "row" && (
        <>
          <button
            className={styles.item}
            onClick={() => {
              insertRowAt(index); // 위에 삽입
              closeHeaderMenu();
            }}
          >
            위에 행 삽입
          </button>

          <button
            className={styles.item}
            onClick={() => {
              insertRowAt(index + 1); // 아래에 삽입
              closeHeaderMenu();
            }}
          >
            아래에 행 삽입
          </button>

          <hr className={styles.divider} />

          <button
            className={styles.itemDanger}
            onClick={() => {
              deleteRowAt(index);
              closeHeaderMenu();
            }}
          >
            행 삭제
          </button>
        </>
      )}

      {/* ------------------------------ */}
      {/* 열 메뉴: 왼/오 삽입 + 삭제 */}
      {/* ------------------------------ */}
      {type === "col" && (
        <>
          <button
            className={styles.item}
            onClick={() => {
              insertColAt(index); // 왼쪽 삽입
              closeHeaderMenu();
            }}
          >
            왼쪽에 열 삽입
          </button>

          <button
            className={styles.item}
            onClick={() => {
              insertColAt(index + 1); // 오른쪽 삽입
              closeHeaderMenu();
            }}
          >
            오른쪽에 열 삽입
          </button>

          <hr className={styles.divider} />

          <button
            className={styles.itemDanger}
            onClick={() => {
              deleteColAt(index);
              closeHeaderMenu();
            }}
          >
            열 삭제
          </button>
        </>
      )}
    </div>
  );
}
