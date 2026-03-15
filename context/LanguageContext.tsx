import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import type { AppLocale } from '../constants/languages';
import { isAppLocale } from '../constants/languages';

const STORAGE_KEY = '@zoomcart_language';

function normalizeLocale(code: string): string {
  return code.split('-')[0]?.toLowerCase() ?? 'en';
}

type LanguageContextValue = {
  language: AppLocale;
  setLanguage: (lng: AppLocale) => Promise<void>;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();

  useEffect(() => {
    void (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        const normalizedSaved = saved ? normalizeLocale(saved) : '';
        if (normalizedSaved && isAppLocale(normalizedSaved)) {
          await i18n.changeLanguage(normalizedSaved);
          return;
        }
        const device = normalizeLocale(Localization.getLocales()[0]?.languageCode ?? 'en');
        if (isAppLocale(device)) await i18n.changeLanguage(device);
      } catch {
        /* ignore */
      }
    })();
  }, [i18n]);

  const setLanguage = useCallback(
    async (lng: AppLocale) => {
      await AsyncStorage.setItem(STORAGE_KEY, lng);
      await i18n.changeLanguage(lng);
    },
    [i18n],
  );

  const language = useMemo(() => {
    const raw = normalizeLocale(i18n.language);
    return isAppLocale(raw) ? raw : 'en';
  }, [i18n.language]);

  const value = useMemo(() => ({ language, setLanguage }), [language, setLanguage]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useAppLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useAppLanguage must be used within LanguageProvider');
  return ctx;
}
