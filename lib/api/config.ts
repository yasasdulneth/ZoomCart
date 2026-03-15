import Constants from 'expo-constants';

function readApiBaseUrl(): string {
  const extra = (Constants.expoConfig?.extra ?? Constants.manifest2?.extra ?? {}) as any;
  const baseUrl = String(extra?.api?.baseUrl ?? '').trim();
  if (!baseUrl) {
    // eslint-disable-next-line no-console
    console.error(
      '[API] API base URL missing. Check EXPO_PUBLIC_API_BASE_URL in the root .env and restart Expo.',
    );
  }
  return baseUrl;
}

export const API_BASE_URL = readApiBaseUrl();

