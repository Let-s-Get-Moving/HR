import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';

// Get saved language from localStorage
const savedLanguage = localStorage.getItem('user_language') || 'en';

/**
 * Humanize a translation key to a readable label.
 * e.g. 'settings.save' → 'Save', 'nav.dashboard' → 'Dashboard'
 */
function humanizeKey(key) {
  // Get last segment (e.g. 'save' from 'settings.save')
  const lastSegment = key.split('.').pop() || key;
  
  // Replace underscores/dashes with spaces, then Title Case
  return lastSegment
    .replace(/[_-]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase to spaces
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Log missing translation keys in development.
 * In production, we silently humanize — the CI gate ensures coverage.
 */
function handleMissingKey(lngs, ns, key, fallbackValue, updateMissing, options) {
  const isDev = import.meta.env.DEV;
  if (isDev) {
    console.warn(`[i18n] Missing translation key: "${key}" (lng: ${lngs}, ns: ${ns})`);
  }
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
      fr: { translation: fr }
    },
    lng: savedLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // React already escapes
    },
    // When a key is missing, return a humanized label instead of the raw key
    parseMissingKeyHandler: (key) => humanizeKey(key),
    // Log missing keys in dev mode
    missingKeyHandler: handleMissingKey,
    // Don't save missing keys to resources (we handle it ourselves)
    saveMissing: false
  });

export default i18n;

