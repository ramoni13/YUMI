// ============================================================
// YUMI — Hook useT()
// Retourne l'objet de traductions selon la langue active
// ============================================================

import { useLangStore } from '../store/langStore';
import { fr, en } from '../i18n';
import type { Translations } from '../i18n';

const translations: Record<string, Translations> = { fr, en };

export function useT(): Translations {
  const lang = useLangStore(s => s.lang);
  return translations[lang] ?? fr;
}
