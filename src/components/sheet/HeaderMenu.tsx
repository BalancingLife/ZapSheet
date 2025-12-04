// HeaderMenu.tsx
import { useEffect } from "react";
import { useSheetStore } from "./store/useSheetStore";
import { ROW_COUNT, COLUMN_COUNT } from "./SheetConstants";
import styles from "./HeaderMenu.module.css";

export default function HeaderMenu() {
  const headerMenu = useSheetStore((s) => s.headerMenu);
  const closeHeaderMenu = useSheetStore((s) => s.closeHeaderMenu);

  const insertRowAt = useSheetStore((s) => s.insertRowAt);
  const deleteRowAt = useSheetStore((s) => s.deleteRowAt);
  const insertColAt = useSheetStore((s) => s.insertColAt);
  const deleteColAt = useSheetStore((s) => s.deleteColAt);

  const deleteSelectedRows = useSheetStore((s) => s.deleteSelectedRows);
  const deleteSelectedCols = useSheetStore((s) => s.deleteSelectedCols);
  const selection = useSheetStore((s) => s.selection);

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

  const isRowMultiSelection =
    type === "row" &&
    selection &&
    selection.sc === 0 &&
    selection.ec === COLUMN_COUNT - 1 &&
    Math.abs(selection.er - selection.sr) >= 1;

  const isColMultiSelection =
    type === "col" &&
    selection &&
    selection.sr === 0 &&
    selection.er === ROW_COUNT - 1 &&
    Math.abs(selection.ec - selection.sc) >= 1;

  return (
    <div
      className={styles.menu}
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
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
              deleteRowAt(index); // 단일 행 삭제
              closeHeaderMenu();
            }}
          >
            행 삭제
          </button>

          {isRowMultiSelection && (
            <button
              className={styles.itemDanger}
              onClick={async () => {
                await deleteSelectedRows();
                closeHeaderMenu();
              }}
            >
              선택된 행 모두 삭제
            </button>
          )}
        </>
      )}

      {type === "col" && (
        <>
          <button
            className={styles.item}
            onClick={() => {
              insertColAt(index); // 왼쪽에 삽입
              closeHeaderMenu();
            }}
          >
            왼쪽에 열 삽입
          </button>
          <button
            className={styles.item}
            onClick={() => {
              insertColAt(index + 1); // 오른쪽에 삽입
              closeHeaderMenu();
            }}
          >
            오른쪽에 열 삽입
          </button>

          <hr className={styles.divider} />

          <button
            className={styles.itemDanger}
            onClick={() => {
              deleteColAt(index); // 단일 열 삭제
              closeHeaderMenu();
            }}
          >
            열 삭제
          </button>

          {isColMultiSelection && (
            <button
              className={styles.itemDanger}
              onClick={async () => {
                await deleteSelectedCols();
                closeHeaderMenu();
              }}
            >
              선택된 열 모두 삭제
            </button>
          )}
        </>
      )}
    </div>
  );
}
