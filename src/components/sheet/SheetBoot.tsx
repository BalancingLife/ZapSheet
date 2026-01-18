import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useSheetStore } from "@/components/sheet/store/useSheetStore";

export default function SheetBoot() {
  const loadSheetsMeta = useSheetStore((s) => s.loadSheetsMeta);
  const didInit = useRef(false);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    // 최초(또는 세션 복구) 1회 시트 메타 로드
    loadSheetsMeta?.();

    // 로그인 감지: 로그인 완료 시 메타 로드
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") loadSheetsMeta?.();
    });

    return () => {
      sub?.subscription?.unsubscribe();
    };
  }, [loadSheetsMeta]);

  return null;
}
