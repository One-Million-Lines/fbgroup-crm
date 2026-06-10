import { create } from 'zustand';
import { me, login, register, logout } from '../api/auth';

type AuthUser = { id: string; email: string };
type AuthState = {
  user: AuthUser | null;
  workspaceId: string | null;
  loading: boolean;
  error: string | null;
  bootstrap: () => Promise<void>;
  doLogin: (email: string, password: string) => Promise<void>;
  doRegister: (email: string, password: string, ws: string) => Promise<void>;
  doLogout: () => Promise<void>;
};

export const useAuth = create<AuthState>((set) => ({
  user: null,
  workspaceId: null,
  loading: true,
  error: null,
  bootstrap: async () => {
    set({ loading: true, error: null });
    try {
      const r = await me();
      set({ user: r.user, workspaceId: r.workspaceId, loading: false });
    } catch {
      set({ user: null, workspaceId: null, loading: false });
    }
  },
  doLogin: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const r = await login(email, password);
      set({ user: r.user, workspaceId: r.workspaceId, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },
  doRegister: async (email, password, ws) => {
    set({ loading: true, error: null });
    try {
      const r = await register(email, password, ws);
      set({ user: r.user, workspaceId: r.workspaceId, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },
  doLogout: async () => {
    await logout();
    set({ user: null, workspaceId: null });
  },
}));
