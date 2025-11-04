// Footer.tsx
import { useEffect, useRef, useState } from "react";
import styles from "./Footer.module.css";
import { useSheetStore } from "../sheet/store/useSheetStore";

type ContextMenuState = {
  open: boolean;
  x: number;
  y: number;
  sheetId: string | null;
};

export default function Footer() {
  // --- 상태 개별 구독 ---
  const sheets = useSheetStore((s) => s.sheets);
  const currentSheetId = useSheetStore((s) => s.currentSheetId);

  // --- 액션 개별 구독 ---
  const addSheet = useSheetStore((s) => s.addSheet);
  const setCurrentSheet = useSheetStore((s) => s.setCurrentSheet);
  const renameSheet = useSheetStore((s) => s.renameSheet);
  const removeSheet = useSheetStore((s) => s.removeSheet);

  // 인라인 리네임 상태
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  // 컨텍스트 메뉴 상태
  const [menu, setMenu] = useState<ContextMenuState>({
    open: false,
    x: 0,
    y: 0,
    sheetId: null,
  });

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  useEffect(() => {
    const onGlobalClick = () => setMenu((m) => ({ ...m, open: false }));
    window.addEventListener("click", onGlobalClick);
    return () => window.removeEventListener("click", onGlobalClick);
  }, []);

  const startRename = (id: string, currentName: string) => {
    setEditingId(id);
    setEditingValue(currentName);
  };

  const commitRename = () => {
    if (!editingId) return;
    const trimmed = editingValue.trim();
    if (trimmed) renameSheet(editingId, trimmed);
    setEditingId(null);
  };

  const cancelRename = () => setEditingId(null);

  const onTabContextMenu = (
    e: React.MouseEvent<HTMLDivElement>,
    sheetId: string
  ) => {
    e.preventDefault();
    setMenu({
      open: true,
      x: e.clientX,
      y: e.clientY,
      sheetId,
    });
  };

  const onClickDelete = () => {
    if (!menu.sheetId) return;
    removeSheet(menu.sheetId);
    setMenu({ open: false, x: 0, y: 0, sheetId: null });
  };

  const onClickRename = () => {
    if (!menu.sheetId) return;
    const target = sheets.find((s) => s.id === menu.sheetId);
    if (!target) return;
    startRename(target.id, target.name);
    setMenu({ open: false, x: 0, y: 0, sheetId: null });
  };

  return (
    <div className={styles.container}>
      <button
        className={styles.iconBtn}
        aria-label="Add sheet"
        onClick={() => addSheet()}
      >
        <img width="20" height="20" src="./images/plus.svg" alt="plus icon" />
      </button>

      <button
        className={styles.iconBtn}
        aria-label="Open sheet menu"
        onClick={(e) => {
          if (!currentSheetId) return;
          const rect = (e.target as HTMLElement).getBoundingClientRect();
          setMenu({
            open: true,
            x: rect.left,
            y: rect.top - 8,
            sheetId: currentSheetId,
          });
        }}
      >
        <img width="20" height="20" src="./images/hamburger.svg" alt="menu" />
      </button>

      <div className={styles.sheetList} role="tablist" aria-label="Sheets">
        {sheets.map((sheet) => {
          const active = sheet.id === currentSheetId;
          const isEditing = editingId === sheet.id;

          return (
            <div
              key={sheet.id}
              role="tab"
              aria-selected={active}
              className={`${styles.sheetItem} ${active ? styles.active : ""}`}
              onClick={() => setCurrentSheet(sheet.id)}
              onDoubleClick={() => startRename(sheet.id, sheet.name)}
              onContextMenu={(e) => onTabContextMenu(e, sheet.id)}
              title={sheet.name}
            >
              {isEditing ? (
                <input
                  ref={inputRef}
                  className={styles.renameInput}
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename();
                    if (e.key === "Escape") cancelRename();
                  }}
                />
              ) : (
                <span className={styles.sheetName}>{sheet.name}</span>
              )}
            </div>
          );
        })}
      </div>

      {menu.open && (
        <div
          className={styles.ctxMenu}
          style={{ left: menu.x, top: menu.y }}
          role="menu"
        >
          <button className={styles.ctxItem} onClick={onClickRename}>
            이름 바꾸기
          </button>
          <button className={styles.ctxItemDanger} onClick={onClickDelete}>
            시트 삭제
          </button>
        </div>
      )}
    </div>
  );
}
