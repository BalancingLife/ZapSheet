import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Session } from "@supabase/supabase-js";
import { useSheetStore } from "@/components/sheet/store/useSheetStore";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const clearData = useSheetStore((s) => s.clearData);
  const clearDataRef = useRef(clearData);
  clearDataRef.current = clearData; // useEffect안에서 React Hooks를 쓰고 싶어서 ref로 감싸줌 (그냥 Hooks을 쓰면 eslint 에러)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      clearDataRef.current();
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, loading };
}
