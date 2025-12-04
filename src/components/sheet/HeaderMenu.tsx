// HeaderMenu.tsx
import { useEffect } from "react";
import { useSheetStore } from "./store/useSheetStore";
import styles from "./HeaderMenu.module.css";

export default function HeaderMenu() {
  const headerMenu = useSheetStore((s) => s.headerMenu);
  const closeHeaderMenu = useSheetStore((s) => s.closeHeaderMenu);

  const selectRow = useSheetStore((s) => s.selectRow);
  const selectColumn = useSheetStore((s) => s.selectColumn);
  const clearSelectionCells = useSheetStore((s) => s.clearSelectionCells);

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

  const { type, index, x, y } = headerMenu;

  const handleSelectAll = () => {
    if (type === "row") {
      selectRow(index, false);
    } else {
      selectColumn(index, false);
    }
    closeHeaderMenu();
  };

  const handleClearContents = () => {
    if (type === "row") {
      selectRow(index, false);
    } else {
      selectColumn(index, false);
    }
    clearSelectionCells();
    closeHeaderMenu();
  };

  return (
    <div
      className={styles.menu}
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()} // 자기 자신 클릭은 바깥으로 안 나가게
    >
      <button className={styles.item} onClick={handleSelectAll}>
        {type === "row" ? "이 행 전체 선택" : "이 열 전체 선택"}
      </button>
      <button className={styles.item} onClick={handleClearContents}>
        {type === "row" ? "이 행 내용 지우기" : "이 열 내용 지우기"}
      </button>
    </div>
  );
}
