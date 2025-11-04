import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useSheetStore } from "@/components/sheet/store/useSheetStore";

export default function SheetBoot() {
  const loadSheetsMeta = useSheetStore((s) => s.loadSheetsMeta);
  const loadCellData = useSheetStore((s) => s.loadCellData);
  const loadCellStyles = useSheetStore((s) => s.loadCellStyles);
  const didInit = useRef(false);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    // 최초·로그인 시 시트 메타 로드 → 내부에서 setCurrentSheet가 값/스타일 로드
    loadSheetsMeta?.();

    // 로그인/로그아웃 감지
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") loadSheetsMeta?.();
      if (event === "SIGNED_OUT") {
        // 여기서는 resetSheetState() 쓰는 게 이상적(이미 안내했음)
      }
    });

    // 탭 복귀 시 현재 sheetId로 값/스타일만 다시 땡겨오기 (초기화 X)
    const onVis = () => {
      if (document.visibilityState === "visible") {
        loadCellData?.();
        loadCellStyles?.();
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      sub?.subscription?.unsubscribe();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [loadSheetsMeta, loadCellData, loadCellStyles]);

  return null;
}
