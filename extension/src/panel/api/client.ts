const DEFAULT_BASE = 'http://localhost:5321';

export async function getApiBase(): Promise<string> {
  const stored = await chrome.storage.local.get('apiBase');
  return stored.apiBase || DEFAULT_BASE;
}

export async function setApiBase(base: string) {
  await chrome.storage.local.set({ apiBase: base });
}

async function getToken(): Promise<string | null> {
  const s = await chrome.storage.local.get('token');
  return s.token ?? null;
}

export async function setToken(token: string | null) {
  if (token) await chrome.storage.local.set({ token });
  else await chrome.storage.local.remove('token');
}

export async function api<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const base = await getApiBase();
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${base}${path}`, { ...init, headers });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(json?.error || `HTTP ${res.status}`);
  }
  return json as T;
}
