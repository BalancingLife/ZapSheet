import { useState, useEffect, useCallback } from "react";
import styles from "./ToolBar.module.css";
import { useSheetStore } from "../sheet/store/useSheetStore";

export default function ToolBar() {
  const applyStyleToSelection = useSheetStore((s) => s.applyStyleToSelection);
  const clearSelectionStyles = useSheetStore((s) => s.clearSelectionStyles);

  const focus = useSheetStore((s) => s.focus);
  const undo = useSheetStore((s) => s.undo);
  const redo = useSheetStore((s) => s.redo);

  const fontSize = useSheetStore((s) => s.getFontSizeForFocus());
  const setFontSize = useSheetStore((s) => s.setFontSize);

  // 로컬 상태로 입력 중인 값 관리
  const [tempFontSize, setTempFontSize] = useState<string>(String(fontSize));

  const currentStyle = useSheetStore((s) =>
    focus ? s.stylesByCell[`${focus.row}:${focus.col}`] : undefined
  );

  const currentTextColor = currentStyle?.textColor ?? "#000000";
  const currentBgColor = currentStyle?.bgColor ?? "#ffffff";

  const isBold = !!currentStyle?.bold;
  const isItalic = !!currentStyle?.italic;
  const isUnderline = !!currentStyle?.underline;

  const handleTextColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    applyStyleToSelection({ textColor: color });
  };
  const handleBgColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    applyStyleToSelection({ bgColor: color });
  };

  const resetTextColor = () => clearSelectionStyles(["textColor"]);
  const resetBgColor = () => clearSelectionStyles(["bgColor"]);

  useEffect(() => {
    setTempFontSize(String(fontSize));
  }, [fontSize]);

  const apply = (next: number) => {
    const n = Number(next);
    if (Number.isNaN(n)) return;
    setFontSize(n);
    // 적용 후 input도 반영 (useEffect로도 동기화되지만 즉시 반영해 깜빡임 방지)
    setTempFontSize(String(n));
  };

  const stepDown = () => apply(fontSize - 1);
  const stepUp = () => apply(fontSize + 1);

  const onInputChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    setTempFontSize(e.target.value); // 입력만 저장
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter") {
      const raw = tempFontSize.trim();
      if (raw === "") return; // 빈 값은 무시
      apply(Number(raw)); // 엔터로 확정 적용
    }
  };

  const toggleBold = useCallback(() => {
    applyStyleToSelection({ bold: !isBold });
  }, [applyStyleToSelection, isBold]);
  const toggleItalic = useCallback(() => {
    applyStyleToSelection({ italic: !isItalic });
  }, [applyStyleToSelection, isItalic]);
  const toggleUnderline = useCallback(() => {
    applyStyleToSelection({ underline: !isUnderline });
  }, [applyStyleToSelection, isUnderline]);

  useEffect(() => {
    const onHotkey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      if (e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleBold();
      } else if (e.key.toLowerCase() === "i") {
        e.preventDefault();
        toggleItalic();
      } else if (e.key.toLowerCase() === "u") {
        e.preventDefault();
        toggleUnderline();
      }
    };
    window.addEventListener("keydown", onHotkey);
    return () => window.removeEventListener("keydown", onHotkey);
  }, [
    isBold,
    isItalic,
    isUnderline,
    toggleBold,
    toggleItalic,
    toggleUnderline,
  ]);

  return (
    <div className={styles.toolBarConatiner}>
      <div className={styles.undoIcon} onClick={undo}>
        <img width="10px" src="/images/undo.png" alt="되돌리기" />
      </div>
      <div className={styles.redoIcon} onClick={redo}>
        <img width="10px" src="/images/redo.png" alt="다시실행" />
      </div>

      <div className={styles.vDivider} />

      {/* 글자 크기 */}
      <div className={styles.group}>
        <button className={styles.fontSizeBtn} onClick={stepDown} title="작게">
          –
        </button>
        <input
          className={styles.sizeInput}
          value={tempFontSize}
          onChange={onInputChange}
          onKeyDown={onKeyDown}
        />
        <button className={styles.fontSizeBtn} onClick={stepUp} title="크게">
          +
        </button>
      </div>

      <div className={styles.vDivider} />

      {/* ✅ 텍스트 스타일: B I U */}
      <div className={styles.textStyleGroup}>
        <button
          className={`${styles.toggleBtn} ${isBold ? styles.active : ""} ${
            styles.boldBtn
          }`}
          onClick={toggleBold}
          title="굵게 (Ctrl/Cmd+B)"
          aria-pressed={isBold}
        >
          B
        </button>
        <button
          className={`${styles.toggleBtn} ${isItalic ? styles.active : ""} ${
            styles.italicBtn
          }`}
          onClick={toggleItalic}
          title="기울임 (Ctrl/Cmd+I)"
          aria-pressed={isItalic}
        >
          I
        </button>
        <button
          className={`${styles.toggleBtn} ${isUnderline ? styles.active : ""} ${
            styles.underlineBtn
          }`}
          onClick={toggleUnderline}
          title="밑줄 (Ctrl/Cmd+U)"
          aria-pressed={isUnderline}
        >
          U
        </button>
      </div>

      <div className={styles.vDivider} />

      <div className={styles.colorControls}>
        {/* 글자색 */}
        <label>
          Text
          <input
            type="color"
            value={currentTextColor}
            onChange={handleTextColorChange}
          />
        </label>
        <button onClick={resetTextColor}>Reset</button>

        <div className={styles.vDivider} />

        {/* 배경색 */}
        <label>
          BG
          <input
            type="color"
            value={currentBgColor}
            onChange={handleBgColorChange}
          />
        </label>
        <button onClick={resetBgColor}>Reset</button>
      </div>

      <div>테두리</div>
    </div>
  );
}
