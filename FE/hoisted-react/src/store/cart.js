import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Cart store — chỉ giữ courseId + quantity. Course details fetch riêng.
 */
export const useCart = create(
  persist(
    (set, get) => ({
      items: [],            // [{ courseId, addedAt }]

      add: (courseId) => {
        if (get().items.some((i) => i.courseId === courseId)) return;
        set({ items: [...get().items, { courseId, addedAt: Date.now() }] });
      },
      remove: (courseId) => set({ items: get().items.filter((i) => i.courseId !== courseId) }),
      clear: () => set({ items: [] }),

      get count() { return get().items.length; },
    }),
    { name: 'hoisted.cart' },
  ),
);
