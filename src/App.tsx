import Home from "@/pages/Home";
import { useEffect } from "react";
import { useSession } from "@/hooks/useSession";
import Login from "@/components/Login";
import { useSheetStore } from "@/components/sheet/store/useSheetStore";

function App() {
  const { session, loading } = useSession();
  const loadCellData = useSheetStore((s) => s.loadCellData);

  useEffect(() => {
    if (session) loadCellData(); // 로그인된 이후에만 로딩
  }, [session, loadCellData]);

  if (loading) return null; // 초기 세션 확인 중

  if (!session) return <Login />;

  return <Home />;
}
export default App;
