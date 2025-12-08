import { useState, useEffect, useCallback } from "react";
import styles from "./ToolBar.module.css";
import {
  useSheetStore,
  rectsIntersect,
  normRect,
} from "../sheet/store/useSheetStore";

export default function ToolBar() {
  const applyStyleToSelection = useSheetStore((s) => s.applyStyleToSelection);
  const clearSelectionStyles = useSheetStore((s) => s.clearSelectionStyles);

  const applyBorderToSelection = useSheetStore((s) => s.applyBorderToSelection);
  const clearSelectionBorders = useSheetStore((s) => s.clearSelectionBorders);

  const focus = useSheetStore((s) => s.focus);
  const undo = useSheetStore((s) => s.undo);
  const redo = useSheetStore((s) => s.redo);

  const fontSize = useSheetStore((s) => s.getFontSizeForFocus());
  const setFontSize = useSheetStore((s) => s.setFontSize);

  // 병합 관련 액션
  const mergedRegions = useSheetStore((s) => s.mergedRegions);
  const mergeSelection = useSheetStore((s) => s.mergeSelection);
  const unmergeSelection = useSheetStore((s) => s.unmergeSelection);
  const selection = useSheetStore((s) => s.selection);

  // 자동저장 관련
  const autoSaveEnabled = useSheetStore((s) => s.autoSaveEnabled);
  const setAutoSaveEnabled = useSheetStore((s) => s.setAutoSaveEnabled);
  const saveAll = useSheetStore((s) => s.saveAll);
  const hasUnsavedChanges = useSheetStore((s) => s.hasUnsavedChanges);

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

  //  현재 가로 정렬 상태 (없으면 left)
  const currentAlign = (currentStyle?.textAlign ?? "left") as
    | "left"
    | "center"
    | "right";

  //  현재 세로 정렬 상태 (없으면 bottom)
  const currentVAlign = (currentStyle?.verticalAlign ?? "bottom") as
    | "top"
    | "middle"
    | "bottom";

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
    setTempFontSize(String(n));
  };

  const stepDown = () => apply(fontSize - 1);
  const stepUp = () => apply(fontSize + 1);

  const onInputChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    setTempFontSize(e.target.value);
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter") {
      const raw = tempFontSize.trim();
      if (raw === "") return;
      apply(Number(raw));
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

  // 글자 가로 정렬 핸들러
  const setTextAlign = useCallback(
    (align: "left" | "center" | "right") => {
      applyStyleToSelection({ textAlign: align });
    },
    [applyStyleToSelection]
  );

  // 글자 세로 정렬 핸들러 (top / middle / bottom)
  const setVerticalAlign = useCallback(
    (vAlign: "top" | "middle" | "bottom") => {
      applyStyleToSelection({ verticalAlign: vAlign });
    },
    [applyStyleToSelection]
  );

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
  }, [toggleBold, toggleItalic, toggleUnderline]);

  // ====== 테두리(보더) UI 상태 ======
  const [borderColor, setBorderColor] = useState<string>("#222222");
  const [borderWidth, setBorderWidth] = useState<number>(1);
  const [borderStyle, setBorderStyle] = useState<"solid" | "dashed" | "dotted">(
    "solid"
  );

  const applyBorder = (mode: "outline" | "inner" | "all") => {
    applyBorderToSelection(mode, {
      color: borderColor,
      width: borderWidth,
      style: borderStyle,
    });
  };

  const clearBorder = (mode?: "outline" | "inner" | "all") => {
    clearSelectionBorders(mode);
  };

  const toggleAutoSave = () => {
    setAutoSaveEnabled(!autoSaveEnabled);
  };

  const handleSaveClick = () => {
    void saveAll();
  };

  const rect =
    selection &&
    normRect(
      { row: selection.sr, col: selection.sc },
      { row: selection.er, col: selection.ec }
    );

  const hasOverlap =
    rect && mergedRegions.some((mr) => rectsIntersect(mr, rect));

  const handleMergeToggle = useCallback(() => {
    if (!selection) return;

    // selection 도 normRect 로 정규화해서 쓰자 (스토어에서 쓰는 거랑 통일)

    if (hasOverlap) {
      // 하나라도 걸치면 → 해제
      void unmergeSelection();
    } else {
      // 전혀 안 겹치면 → 새로 병합
      void mergeSelection();
    }
  }, [selection, mergeSelection, unmergeSelection, hasOverlap]);

  return (
    <div className={styles.toolBarConatiner}>
      {/* ===== Undo / Redo ===== */}
      <div className={styles.undoIcon} onClick={undo}>
        <img width="10px" src="/images/undo.png" alt="되돌리기" />
      </div>
      <div className={styles.redoIcon} onClick={redo}>
        <img width="10px" src="/images/redo.png" alt="다시실행" />
      </div>

      <div className={styles.vDivider} />

      {/* ===== 글자 크기 ===== */}
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

      {/* ===== 텍스트 스타일: B / I / U ===== */}
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

      {/* ===== 가로 정렬 ===== */}
      <div className={styles.alignGroup}>
        <button
          type="button"
          className={`${styles.toggleBtn} ${styles.alignBtn} ${
            currentAlign === "left" ? styles.active : ""
          }`}
          onClick={() => setTextAlign("left")}
          title="왼쪽 정렬"
          aria-pressed={currentAlign === "left"}
        >
          <img src="/images/align-left.png" width={15} height={15} />
        </button>
        <button
          type="button"
          className={`${styles.toggleBtn} ${styles.alignBtn} ${
            currentAlign === "center" ? styles.active : ""
          }`}
          onClick={() => setTextAlign("center")}
          title="가운데 정렬"
          aria-pressed={currentAlign === "center"}
        >
          <img src="/images/align-center.png" width={16} height={16} />
        </button>
        <button
          type="button"
          className={`${styles.toggleBtn} ${styles.alignBtn} ${
            currentAlign === "right" ? styles.active : ""
          }`}
          onClick={() => setTextAlign("right")}
          title="오른쪽 정렬"
          aria-pressed={currentAlign === "right"}
        >
          <img src="/images/align-right.png" width={15} height={15} />
        </button>
      </div>

      {/* ===== 세로 정렬 (위 / 중간 / 아래) ===== */}
      <div className={styles.verticalAlignGroup}>
        <button
          type="button"
          className={`${styles.toggleBtn} ${styles.valignBtn} ${
            currentVAlign === "top" ? styles.active : ""
          }`}
          onClick={() => setVerticalAlign("top")}
          title="위쪽 정렬"
          aria-pressed={currentVAlign === "top"}
        >
          <img src="/images/valign-top.png" width={17} height={17} />
        </button>
        <button
          type="button"
          className={`${styles.toggleBtn} ${styles.valignBtn} ${
            currentVAlign === "middle" ? styles.active : ""
          }`}
          onClick={() => setVerticalAlign("middle")}
          title="가운데 정렬"
          aria-pressed={currentVAlign === "middle"}
        >
          <img src="/images/valign-middle.png" width={19} height={19} />
        </button>
        <button
          type="button"
          className={`${styles.toggleBtn} ${styles.valignBtn} ${
            currentVAlign === "bottom" ? styles.active : ""
          }`}
          onClick={() => setVerticalAlign("bottom")}
          title="아래 정렬"
          aria-pressed={currentVAlign === "bottom"}
        >
          <img src="/images/valign-bottom.png" width={13} height={13} />
        </button>
      </div>

      {/* ===== 셀 병합 ===== */}
      <div className={styles.vDivider} />

      <div className={styles.mergeGroup}>
        <button
          onClick={handleMergeToggle}
          className={`${styles.mergeToggleBtn} ${
            hasOverlap ? styles.active : ""
          }`}
        >
          <img src="/images/merge.png" width={13} height={13} />
        </button>
      </div>

      <div className={styles.vDivider} />

      {/* ===== 색상 ===== */}
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

        <div className={styles.vDividerThin} />

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

      <div className={styles.vDivider} />

      {/* ===== 테두리 ===== */}
      <div className={styles.borderGroup}>
        <span className={styles.sectionTitle}>테두리</span>

        <label className={styles.borderField}>
          <input
            type="color"
            value={borderColor}
            onChange={(e) => setBorderColor(e.target.value)}
            title="테두리 색상"
            style={{ width: "30px", height: "25px" }}
          />
        </label>

        <label className={styles.borderField}>
          <span className={styles.sectionTitle}>두께</span>

          <input
            className={styles.borderWidthInput}
            type="number"
            min={0}
            max={8}
            value={borderWidth}
            onChange={(e) => setBorderWidth(Number(e.target.value))}
            title="px"
          />
        </label>

        <label className={styles.borderField}>
          <select
            className={styles.borderStyleSelect}
            value={borderStyle}
            onChange={(e) =>
              setBorderStyle(e.target.value as "solid" | "dashed" | "dotted")
            }
            title="선 스타일"
          >
            <option value="solid">실선</option>
            <option value="dashed">파선</option>
            <option value="dotted">점선</option>
          </select>
        </label>

        <div className={styles.borderButtons}>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={() => applyBorder("outline")}
            title="외곽선 적용"
            aria-label="외곽선 적용"
          >
            <img
              src="/images/border-outline.png"
              alt=""
              width={20}
              height={20}
            />
          </button>

          <button
            type="button"
            className={styles.iconBtn}
            onClick={() => applyBorder("inner")}
            title="내부선 적용"
            aria-label="내부선 적용"
          >
            <img src="/images/border-inner.png" alt="" width={20} height={20} />
          </button>

          <button
            type="button"
            className={styles.iconBtn}
            onClick={() => applyBorder("all")}
            title="전체선 적용"
            aria-label="전체선 적용"
          >
            <img src="/images/border-all.png" alt="" width={20} height={20} />
          </button>

          <div className={styles.vDividerThin} />

          <button
            type="button"
            className={`${styles.iconBtn} ${styles.danger}`}
            onClick={() => clearBorder()}
            title="모든 테두리 지우기"
            aria-label="모든 테두리 지우기"
          >
            <img src="/images/border-none.png" alt="" width={20} height={20} />
          </button>
        </div>
      </div>

      {/* ===== 자동저장 토글 + 수동 저장 ===== */}
      <div className={styles.vDivider} />

      <div className={styles.autoSaveGroup}>
        <span className={styles.sectionTitle}>자동저장</span>

        <button
          type="button"
          className={`${styles.autoSaveToggle} ${
            autoSaveEnabled ? styles.autoSaveOn : styles.autoSaveOff
          }`}
          onClick={toggleAutoSave}
          aria-pressed={autoSaveEnabled}
        >
          <span className={styles.autoSaveLabel}>
            {autoSaveEnabled ? "ON" : "OFF"}
          </span>
          <span className={styles.autoSaveThumb} />
        </button>

        {!autoSaveEnabled && (
          <>
            <button
              type="button"
              className={`${styles.saveBtn} ${
                hasUnsavedChanges ? styles.saveBtnDirty : ""
              }`}
              onClick={handleSaveClick}
            >
              저장
            </button>
            {hasUnsavedChanges && (
              <span className={styles.unsavedLabel}>저장 안 됨</span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
