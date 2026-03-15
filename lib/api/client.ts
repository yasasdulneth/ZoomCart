import { API_BASE_URL } from './config';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ApiError = {
  status?: number;
  message: string;
};

async function parseError(res: Response): Promise<ApiError> {
  let message = `Request failed (${res.status})`;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json();
    if (data && typeof data.message === 'string') message = data.message;
    const detail =
      data && typeof data.detail === 'string'
        ? data.detail
        : data && typeof data.error === 'string'
          ? data.error
          : undefined;
    if (detail) message = `${message}: ${detail}`;
  } catch {
    // ignore
  }
  return { status: res.status, message };
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit & { json?: unknown },
): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error('[API] API base URL missing. Check EXPO_PUBLIC_API_BASE_URL in .env.');
  }

  const url = `${API_BASE_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options?.headers as any),
  };

  // Attach JWT token automatically (if present) unless caller already set Authorization.
  if (!('Authorization' in headers) && !('authorization' in headers)) {
    const token = await AsyncStorage.getItem('zoomcart.auth.token');
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let body = options?.body;
  if (options && 'json' in options) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify((options as any).json ?? {});
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      body,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      signal: controller.signal as any,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const err = await parseError(res);
      throw new Error(err.message);
    }

    // handle empty 204
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection.');
    }
    throw error;
  }
}

