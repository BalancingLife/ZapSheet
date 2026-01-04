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
  const reorderSheets = useSheetStore((s) => s.reorderSheets);
  const persistSheetOrder = useSheetStore((s) => s.persistSheetOrder);

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

  // 시트 피커 드롭다운(햄버거)
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerPos, setPickerPos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [pickerIndex, setPickerIndex] = useState<number>(-1); // 키보드 탐색용
  const hamburgerBtnRef = useRef<HTMLButtonElement | null>(null);
  const pickerRef = useRef<HTMLDivElement | null>(null);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  // 바깥 클릭 시 닫기(컨텍스트 메뉴 + 시트 피커)
  useEffect(() => {
    const onGlobalClick = (e: MouseEvent) => {
      // 피커 내부 클릭은 무시
      if (pickerRef.current && pickerRef.current.contains(e.target as Node))
        return;
      if (
        hamburgerBtnRef.current &&
        hamburgerBtnRef.current.contains(e.target as Node)
      )
        return;
      setMenu((m) => ({ ...m, open: false }));
      setPickerOpen(false);
    };
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

  const openPickerFromButton = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!currentSheetId) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const idx = sheets.findIndex((s) => s.id === currentSheetId);
    const safeIndex = idx >= 0 ? idx : 0;

    setPickerPos({ x: rect.left, y: rect.top });

    setPickerOpen((prevOpen) => {
      const nextOpen = !prevOpen;

      // 열리는 순간에만 인덱스 세팅
      if (nextOpen) {
        setPickerIndex(safeIndex);
      }
      return nextOpen;
    });

    // 컨텍스트 메뉴는 닫기
    setMenu((m) => ({ ...m, open: false }));
  };

  // 피커에서 선택
  const selectSheet = (id: string) => {
    if (id === currentSheetId) {
      setPickerOpen(false);
      return;
    }
    setCurrentSheet(id);
    setPickerOpen(false);
  };

  // 키보드 내비게이션
  const onPickerKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!pickerOpen) return;
    if (e.key === "Escape") {
      setPickerOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setPickerIndex((i) => Math.min(i + 1, sheets.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setPickerIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = sheets[pickerIndex];
      if (target) selectSheet(target.id);
    }
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
        ref={hamburgerBtnRef}
        className={styles.iconBtn}
        aria-label="Open sheet list"
        onClick={openPickerFromButton}
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
              className={`${styles.sheetItem} ${active ? styles.active : ""} ${
                dragOverId === sheet.id && draggingId !== sheet.id
                  ? styles.dragOver
                  : ""
              }`}
              draggable={!isEditing}
              onDragStart={(e) => {
                if (isEditing) return;
                e.dataTransfer.effectAllowed = "move";
                // 일부 브라우저에서 필요: 드래그 데이터 세팅
                e.dataTransfer.setData("text/plain", sheet.id);

                setDraggingId(sheet.id);
              }}
              onDragOver={(e) => {
                if (!draggingId) return;
                if (draggingId === sheet.id) return;
                e.preventDefault(); // ✅ drop 가능하게
                setDragOverId(sheet.id);
              }}
              onDragLeave={() => {
                // 지나가다 떠날 때 너무 깜빡이면 UX 구려서
                // 단순히 null 처리만
                setDragOverId((prev) => (prev === sheet.id ? null : prev));
              }}
              onDrop={async (e) => {
                e.preventDefault();
                e.stopPropagation();

                // dragId는 state에서 가져오되, 혹시 state가 꼬였으면 dataTransfer fallback
                const dragId =
                  draggingId ?? e.dataTransfer.getData("text/plain");
                const overId = sheet.id;

                if (!dragId || dragId === overId) {
                  setDraggingId(null);
                  setDragOverId(null);
                  return;
                }

                reorderSheets(dragId, overId);
                await persistSheetOrder();

                setDraggingId(null);
                setDragOverId(null);
              }}
              onDragEnd={() => {
                setDraggingId(null);
                setDragOverId(null);
              }}
              onClick={() => setCurrentSheet(sheet.id)}
              onDoubleClick={() => startRename(sheet.id, sheet.name)}
              onContextMenu={(e) => onTabContextMenu(e, sheet.id)} // onContexstMenu <= 우클릭 이벤트
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

      {/* 시트 피커 드롭다운 */}
      {pickerOpen && (
        <div
          ref={pickerRef}
          className={`${styles.sheetPicker} ${styles.dropAbove}`}
          style={{ left: pickerPos.x, top: pickerPos.y }}
          role="menu"
          aria-label="시트 선택"
          tabIndex={-1}
          onKeyDown={onPickerKeyDown}
        >
          {sheets.map((s, idx) => {
            const active = s.id === currentSheetId;
            const highlighted = idx === pickerIndex;
            return (
              <button
                key={s.id}
                role="menuitemradio"
                aria-checked={active}
                className={`${styles.sheetPickItem} ${
                  highlighted ? styles.sheetPickHover : ""
                }`}
                onMouseEnter={() => setPickerIndex(idx)}
                onClick={() => selectSheet(s.id)}
                title={s.name}
              >
                <span
                  className={`${styles.checkArea} ${
                    active ? styles.checked : ""
                  }`}
                />
                <span className={styles.sheetPickName}>{s.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {menu.open && (
        <div
          className={`${styles.ctxMenu} ${styles.dropAbove}`}
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
