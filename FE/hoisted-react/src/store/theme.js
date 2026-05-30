import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Theme store — flip <html class="dark"> globally. */
export const useTheme = create(
  persist(
    (set, get) => ({
      mode: 'dark',         // 'dark' | 'light'
      toggle: () => {
        const next = get().mode === 'dark' ? 'light' : 'dark';
        document.documentElement.classList.toggle('dark', next === 'dark');
        set({ mode: next });
      },
    }),
    {
      name: 'hoisted.theme',
      onRehydrateStorage: () => (s) => {
        if (s) document.documentElement.classList.toggle('dark', s.mode === 'dark');
      },
    },
  ),
);
