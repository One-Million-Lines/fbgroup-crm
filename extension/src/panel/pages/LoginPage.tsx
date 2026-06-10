import { useState } from 'react';
import { useAuth } from '../state/auth.store';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ws, setWs] = useState('My workspace');
  const { doLogin, doRegister, error, loading } = useAuth();

  return (
    <div className="p-4 space-y-3 max-w-sm">
      <h1 className="text-lg font-semibold">Facebook Group CRM</h1>
      <div className="flex gap-2 text-sm">
        <button onClick={() => setMode('login')} className={mode === 'login' ? 'font-bold' : ''}>Login</button>
        <button onClick={() => setMode('register')} className={mode === 'register' ? 'font-bold' : ''}>Register</button>
      </div>
      <input className="border rounded px-2 py-1 w-full" placeholder="email" value={email} onChange={e => setEmail(e.target.value)} />
      <input className="border rounded px-2 py-1 w-full" placeholder="password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
      {mode === 'register' && (
        <input className="border rounded px-2 py-1 w-full" placeholder="workspace name" value={ws} onChange={e => setWs(e.target.value)} />
      )}
      {error && <div className="text-red-600 text-xs">{error}</div>}
      <button
        disabled={loading}
        className="bg-blue-600 disabled:opacity-50 text-white px-3 py-1.5 rounded w-full"
        onClick={() => mode === 'login' ? doLogin(email, password) : doRegister(email, password, ws)}
      >
        {mode === 'login' ? 'Login' : 'Register'}
      </button>
    </div>
  );
}
