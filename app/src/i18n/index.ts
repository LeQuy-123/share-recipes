// UI translations (i18next). Interface text lives in vi.json / en.json; recipe data has
// name_vi / name_en columns and is picked with displayName(). Recipe descriptions and steps
// exist in Vietnamese only for now.
import i18n from 'i18next'
import { initReactI18next, useTranslation } from 'react-i18next'
import en from './en.json'
import vi from './vi.json'

export type Lang = 'vi' | 'en'
export const LANGS: Lang[] = ['vi', 'en']

/** The browser's language, used until the person picks one. */
export function detectLang(): Lang {
  return typeof navigator !== 'undefined' && !navigator.language.toLowerCase().startsWith('vi') ? 'en' : 'vi'
}

export function initI18n(lang: Lang) {
  if (!i18n.isInitialized) {
    i18n.use(initReactI18next).init({
      resources: { vi: { translation: vi }, en: { translation: en } },
      lng: lang,
      fallbackLng: 'vi',
      interpolation: { escapeValue: false }, // React escapes
    })
  } else if (i18n.language !== lang) {
    i18n.changeLanguage(lang)
  }
  if (typeof document !== 'undefined') document.documentElement.lang = lang
}

export const currentLang = (): Lang => (i18n.language === 'en' ? 'en' : 'vi')

/** Translate outside React (formatting helpers). Components use useT(). */
export const t = (key: string, options?: Record<string, unknown>): string => i18n.t(key, options) as string

/** useTranslation, also re-rendering when the language changes. */
export function useT() {
  const { t: tr, i18n: inst } = useTranslation()
  return { t: tr, lang: (inst.language === 'en' ? 'en' : 'vi') as Lang }
}

/** name_en in English when there is one, otherwise the Vietnamese name. */
export function displayName(item: { name_vi?: string | null; name_en?: string | null } | null | undefined): string {
  if (!item) return ''
  return (currentLang() === 'en' && item.name_en) || item.name_vi || item.name_en || ''
}

export default i18n
