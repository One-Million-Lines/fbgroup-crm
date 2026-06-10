import { api, setToken } from './client';

export async function login(email: string, password: string) {
  const res = await api<{ token: string; user: { id: string; email: string }; workspaceId: string }>(
    '/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }
  );
  await setToken(res.token);
  return res;
}

export async function register(email: string, password: string, workspaceName: string) {
  const res = await api<{ token: string; user: { id: string; email: string }; workspaceId: string }>(
    '/auth/register',
    { method: 'POST', body: JSON.stringify({ email, password, workspaceName }) }
  );
  await setToken(res.token);
  return res;
}

export async function logout() {
  await setToken(null);
}

export async function me() {
  return api<{ user: { id: string; email: string }; workspaceId: string }>('/auth/me');
}
