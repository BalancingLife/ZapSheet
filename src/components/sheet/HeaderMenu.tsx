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

  // 메뉴 열렸을 때 바깥 클릭하면 닫기
  useEffect(() => {
    if (!headerMenu) return;

    const onClickOutside = () => {
      closeHeaderMenu();
    };

    window.addEventListener("click", onClickOutside);
    return () => {
      window.removeEventListener("click", onClickOutside);
    };
  }, [headerMenu, closeHeaderMenu]);

  if (!headerMenu) return null;

  const { x, y } = headerMenu;

  return (
    <div
      className={styles.menu}
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()} // 자기 자신 클릭은 바깥으로 안 나가게
    >
      {headerMenu.type === "row" && (
        <>
          <button
            className={styles.item}
            onClick={() => {
              insertRowAt(headerMenu.index);
              closeHeaderMenu();
            }}
          >
            행 삽입
          </button>
          <button
            className={styles.itemDanger}
            onClick={() => {
              deleteRowAt(headerMenu.index);
              closeHeaderMenu();
            }}
          >
            행 삭제
          </button>
        </>
      )}

      {headerMenu.type === "col" && (
        <>
          <button
            className={styles.item}
            onClick={() => {
              insertColAt(headerMenu.index);
              closeHeaderMenu();
            }}
          >
            열 삽입
          </button>
          <button
            className={styles.itemDanger}
            onClick={() => {
              deleteColAt(headerMenu.index);
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
