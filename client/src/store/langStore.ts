// ============================================================
// YUMI — Store de langue (Zustand)
// Persiste le choix FR / EN dans le localStorage
// ============================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Lang = 'fr' | 'en';

interface LangStore {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
}

export const useLangStore = create<LangStore>()(
  persist(
    (set, get) => ({
      lang: 'fr',
      setLang: (lang) => set({ lang }),
      toggleLang: () => set({ lang: get().lang === 'fr' ? 'en' : 'fr' }),
    }),
    {
      name: 'yumi-lang', // clé localStorage
    }
  )
);
