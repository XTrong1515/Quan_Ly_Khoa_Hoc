import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api, setToken, registerLogout } from '@/lib/api';

export const useAuth = create(
  persist(
    (set, get) => ({
      user: null,         // { id, name, email, avatar, role }
      role: 'guest',      // 'guest' | 'user' | 'admin'
      token: null,
      refreshToken: null,

      login: async ({ email, password }) => {
        const { data } = await api.post('/api/auth/login', { email, password });
        const role = data.user.role.toLowerCase(); // BE returns 'USER'/'ADMIN'
        setToken(data.accessToken);
        set({ user: data.user, role, token: data.accessToken, refreshToken: data.refreshToken });
        return data.user;
      },

      register: async ({ name, email, password }) => {
        const { data } = await api.post('/api/auth/register', { name, email, password });
        const role = data.user.role.toLowerCase();
        setToken(data.accessToken);
        set({ user: data.user, role, token: data.accessToken, refreshToken: data.refreshToken });
        return data.user;
      },

      updateUser: (updatedUser) => {
        const role = updatedUser.role?.toLowerCase() ?? get().role;
        set({ user: { ...get().user, ...updatedUser }, role });
      },

      logout: () => {
        const { refreshToken } = get();
        if (refreshToken) api.post('/api/auth/logout', { refreshToken }).catch(() => {});
        setToken(null);
        set({ user: null, role: 'guest', token: null, refreshToken: null });
      },
    }),
    {
      name: 'hoisted.auth',
      // Restore in-memory token after page refresh
      onRehydrateStorage: () => (state) => {
        if (state?.token) setToken(state.token);
      },
    },
  ),
);

// Wire logout callback so the 401 interceptor can force-logout
registerLogout(useAuth.getState().logout);
