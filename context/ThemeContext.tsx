import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Appearance, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkColors, LightColors } from '../constants/theme';

const STORAGE_KEY = 'zoomcart_theme_v1';

export type ThemePreference = 'dark' | 'light' | 'auto';
export type ResolvedTheme = 'dark' | 'light';

interface ThemeContextValue {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (p: ThemePreference) => Promise<void>;
  colors: typeof DarkColors;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

async function loadPreference(): Promise<ThemePreference> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw === 'dark' || raw === 'light' || raw === 'auto') return raw;
  } catch {
    // ignore
  }
  return 'auto';
}

async function savePreference(preference: ThemePreference): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // ignore
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const deviceScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('auto');

  useEffect(() => {
    loadPreference().then(setPreferenceState);
  }, []);

  // Keep React Native's color scheme in sync with the in-app preference so
  // `useColorScheme()` (BlurView, GlassCard, screens, etc.) matches Dark / Light / System.
  useEffect(() => {
    try {
      if (preference === 'auto') {
        Appearance.setColorScheme(null);
      } else {
        Appearance.setColorScheme(preference);
      }
    } catch {
      // Some runtimes may not support forcing appearance
    }
  }, [preference]);

  const resolvedTheme: ResolvedTheme = useMemo(() => {
    if (preference === 'dark') return 'dark';
    if (preference === 'light') return 'light';
    return deviceScheme === 'light' ? 'light' : 'dark';
  }, [preference, deviceScheme]);

  const setPreference = useCallback(async (p: ThemePreference) => {
    setPreferenceState(p);
    await savePreference(p);
  }, []);

  const colors = resolvedTheme === 'dark' ? DarkColors : LightColors;

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      resolvedTheme,
      setPreference,
      colors,
    }),
    [preference, resolvedTheme, setPreference, colors]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}

/** Use instead of `useColorScheme()` for UI so screens match Settings (Light / Dark / System). */
export function useResolvedTheme(): {
  resolvedTheme: ResolvedTheme;
  isDark: boolean;
  colors: typeof DarkColors;
} {
  const { resolvedTheme, colors } = useTheme();
  return {
    resolvedTheme,
    isDark: resolvedTheme === 'dark',
    colors,
  };
}

export function useThemeOptional() {
  return useContext(ThemeContext);
}
