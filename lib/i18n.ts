import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { en } from '../locales/en';
import { es } from '../locales/es';
import { fr } from '../locales/fr';
import { de } from '../locales/de';
import { si } from '../locales/si';
import { ta } from '../locales/ta';
import { moreEn } from '../locales/moreEn';
import { mergeLocales } from './mergeLocales';

const enFull = mergeLocales(en, moreEn);

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: enFull },
    es: { translation: es },
    fr: { translation: fr },
    de: { translation: de },
    si: { translation: si },
    ta: { translation: ta },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v4',
});

export default i18n;
