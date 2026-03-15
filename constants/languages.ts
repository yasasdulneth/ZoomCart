export const APP_LOCALES = ['en', 'es', 'fr', 'de', 'si', 'ta'] as const;

export type AppLocale = (typeof APP_LOCALES)[number];

export function isAppLocale(code: string): code is AppLocale {
  return (APP_LOCALES as readonly string[]).includes(code);
}

export const LANGUAGE_OPTIONS: {
  code: AppLocale;
  /** English name for accessibility */
  label: string;
  /** Display name in that language */
  nativeLabel: string;
}[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español' },
  { code: 'fr', label: 'French', nativeLabel: 'Français' },
  { code: 'de', label: 'German', nativeLabel: 'Deutsch' },
  { code: 'si', label: 'Sinhala', nativeLabel: 'සිංහල' },
  { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்' },
];
