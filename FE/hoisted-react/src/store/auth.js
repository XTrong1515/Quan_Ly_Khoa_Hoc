import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Auth store — giả lập, replace bằng API thật.
 * Roles: 'guest' | 'user' | 'admin'
 */
export const useAuth = create(
  persist(
    (set) => ({
      user: null,           // { id, name, email, avatar, role }
      role: 'guest',
      token: null,

      login: async ({ email }) => {
        // TODO: POST /auth/login → { user, token }
        const fakeUser = {
          id: 'u1', name: 'Phạm Khang', email, avatar: 'KP',
          role: email.includes('admin') ? 'admin' : 'user',
        };
        set({ user: fakeUser, role: fakeUser.role, token: 'fake-jwt' });
        return fakeUser;
      },
      logout: () => set({ user: null, role: 'guest', token: null }),
    }),
    { name: 'hoisted.auth' },
  ),
);
