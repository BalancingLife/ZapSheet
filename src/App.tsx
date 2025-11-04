import Home from "@/pages/Home";
import { useSession } from "@/hooks/useSession";
import Login from "@/components/Login";

function App() {
  const { session, loading } = useSession();

  if (loading) return null; // 초기 세션 확인 중
  if (!session) return <Login />;
  return <Home />;
}
export default App;
