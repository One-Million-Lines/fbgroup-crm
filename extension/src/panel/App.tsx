import { useEffect } from 'react';
import { useAuth } from './state/auth.store';
import LoginPage from './pages/LoginPage';
import CurrentGroupPage from './pages/CurrentGroupPage';

export default function App() {
  const { user, loading, bootstrap, doLogout } = useAuth();
  useEffect(() => { bootstrap(); }, []);
  if (loading) return <div className="p-4 text-sm text-slate-500">Loading…</div>;
  if (!user) return <LoginPage />;
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between border-b bg-white px-3 py-2">
        <div className="text-sm font-semibold">FB Group CRM</div>
        <button onClick={() => doLogout()} className="text-xs text-slate-500 hover:underline">Logout {user.email}</button>
      </div>
      <div className="flex-1 overflow-auto">
        <CurrentGroupPage />
      </div>
    </div>
  );
}
