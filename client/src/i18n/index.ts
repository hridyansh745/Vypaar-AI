import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en';
import hi from './locales/hi';
import bho from './locales/bho';
import awa from './locales/awa';
import ur from './locales/ur';

export type LanguageCode = 'en' | 'hi' | 'bho' | 'awa' | 'ur';

/** Exactly five languages are exposed in the UI. */
export const LANGUAGES: { code: LanguageCode; nativeName: string; dir: 'ltr' | 'rtl' }[] = [
  { code: 'en', nativeName: 'English', dir: 'ltr' },
  { code: 'hi', nativeName: 'हिन्दी', dir: 'ltr' },
  { code: 'bho', nativeName: 'भोजपुरी', dir: 'ltr' },
  { code: 'awa', nativeName: 'अवधी', dir: 'ltr' },
  { code: 'ur', nativeName: 'اُردُو', dir: 'rtl' },
];

export const DEFAULT_LANGUAGE: LanguageCode = 'hi';
const STORAGE_KEY = 'vyaparai_lang';

export function getLanguageDir(code: string): 'ltr' | 'rtl' {
  return LANGUAGES.find((l) => l.code === code)?.dir ?? 'ltr';
}

export function isSupportedLanguage(code: unknown): code is LanguageCode {
  return LANGUAGES.some((l) => l.code === code);
}

function readStoredLanguage(): LanguageCode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isSupportedLanguage(stored)) return stored;
  } catch {
    /* storage unavailable — fall back to default */
  }
  return DEFAULT_LANGUAGE;
}

export function applyDocumentLanguage(code: LanguageCode) {
  const root = document.documentElement;
  root.lang = code;
  root.dir = getLanguageDir(code);
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi },
    bho: { translation: bho },
    awa: { translation: awa },
    ur: { translation: ur },
  },
  lng: readStoredLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: LANGUAGES.map((l) => l.code),
  defaultNS: 'translation',
  interpolation: { escapeValue: false },
  returnEmptyString: false,
  parseMissingKeyHandler: (key) => {
    // Never render raw keys to users: show the Hindi fallback text if possible.
    const parts = key.split('.');
    let value: unknown = hi;
    for (const part of parts) {
      value = (value as Record<string, unknown> | undefined)?.[part];
      if (value === undefined) break;
    }
    return typeof value === 'string' ? value : key;
  },
});

applyDocumentLanguage(i18n.language as LanguageCode);

i18n.on('languageChanged', (lng) => {
  if (isSupportedLanguage(lng)) applyDocumentLanguage(lng);
});

export async function changeLanguage(code: LanguageCode) {
  await i18n.changeLanguage(code);
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    /* ignore */
  }
}

export default i18n;
