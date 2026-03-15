import { apiFetch } from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type RegisterUserInput = {
  firstName: string;
  lastName: string;
  mobileNumber: string;
  email: string;
  password: string;
};

export type UserProfile = {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  mobileNumber: string;
  loyaltyPoints: number;
  isActive: boolean;
  createdAt: string;
  completedOrdersCount?: number;
};

export type AuthUser = { id: string; email: string };

export type LoginResponse = {
  user: AuthUser;
  token: string;
  profile?: UserProfile;
};

const MIN_PASSWORD_LENGTH = 6;
const AUTH_TOKEN_KEY = 'zoomcart.auth.token';
const AUTH_USER_KEY = 'zoomcart.auth.user';

type AuthStateListener = (user: AuthUser | null) => void;
const listeners = new Set<AuthStateListener>();

function emitAuthState(user: AuthUser | null) {
  for (const cb of listeners) {
    try {
      cb(user);
    } catch {
      // ignore listener errors
    }
  }
}

async function persistAuth(res: LoginResponse): Promise<void> {
  await AsyncStorage.multiSet([
    [AUTH_TOKEN_KEY, res.token],
    [AUTH_USER_KEY, JSON.stringify(res.user)],
  ]);
  emitAuthState(res.user);
}

async function clearAuth(): Promise<void> {
  await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, AUTH_USER_KEY]);
  emitAuthState(null);
}

export async function getAuthToken(): Promise<string | null> {
  return AsyncStorage.getItem(AUTH_TOKEN_KEY);
}

export async function getStoredAuthUser(): Promise<AuthUser | null> {
  const raw = await AsyncStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.id === 'string' && typeof parsed.email === 'string') {
      return parsed as AuthUser;
    }
  } catch {
    // ignore
  }
  return null;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function validateRegisterInput(data: RegisterUserInput) {
  if (!data.firstName?.trim()) throw new Error('First name is required.');
  if (!data.lastName?.trim()) throw new Error('Last name is required.');
  if (!data.mobileNumber?.trim()) throw new Error('Mobile number is required.');
  if (!data.email?.trim()) throw new Error('Email is required.');
  if (!/^\S+@\S+\.\S+$/.test(data.email.trim())) throw new Error('Please enter a valid email.');
  if (!data.password) throw new Error('Password is required.');
  if (data.password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
}

export async function registerUser(data: RegisterUserInput): Promise<LoginResponse> {
  validateRegisterInput(data);

  const res = await apiFetch<LoginResponse>('/auth/register', {
    method: 'POST',
    json: {
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      mobileNumber: data.mobileNumber.trim(),
      email: normalizeEmail(data.email),
      password: data.password,
    },
  });
  await persistAuth(res);
  return res;
}

export async function loginUser(identifier: string, password: string): Promise<LoginResponse> {
  const raw = identifier.trim();
  if (!raw) throw new Error('Email or mobile number is required.');
  if (!password) throw new Error('Password is required.');
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }

  const res = await apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    json: { identifier: raw, password },
  });
  await persistAuth(res);
  return res;
}

export async function logoutUser(): Promise<void> {
  // Always clear local auth even if network/API call fails.
  try {
    await apiFetch<void>('/auth/logout', { method: 'POST' });
  } catch {
    // ignore
  } finally {
    await clearAuth();
  }
}

export async function getUserById(id: string): Promise<UserProfile | null> {
  // Backend currently exposes "me" endpoint, not /users/:id
  try {
    const res = await Promise.race([
      apiFetch<{ user: any }>('/auth/me', { method: 'GET' }),
      new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('Profile lookup timed out')), 5000)
      ),
    ]);
    const u = (res as any)?.user;
    if (!u) return null;
    return {
      id: String(u.id ?? id),
      firstName: String(u.firstName ?? ''),
      lastName: String(u.lastName ?? ''),
      fullName: String(u.fullName ?? '').trim() || `${String(u.firstName ?? '')} ${String(u.lastName ?? '')}`.trim(),
      email: String(u.email ?? ''),
      mobileNumber: String(u.mobileNumber ?? ''),
      loyaltyPoints: Number(u.loyaltyPoints ?? 0),
      isActive: Boolean(u.isActive ?? true),
      createdAt: String(u.createdAt ?? new Date().toISOString()),
      completedOrdersCount: Math.max(0, Math.floor(Number(u.completedOrdersCount ?? 0))),
    };
  } catch {
    return null;
  }
}

export async function addLoyaltyPoints(earnedPoints: number): Promise<UserProfile> {
  const points = Math.floor(Number(earnedPoints ?? 0));
  if (!Number.isFinite(points) || points < 0) throw new Error('Invalid loyalty points');

  const res = await apiFetch<{ user: any }>('/auth/loyalty/add', {
    method: 'POST',
    json: { earnedPoints: points },
  });

  const u = res?.user;
  if (!u) throw new Error('Failed to update loyalty points');
  return {
    id: String(u.id ?? ''),
    firstName: String(u.firstName ?? ''),
    lastName: String(u.lastName ?? ''),
    fullName: String(u.fullName ?? '').trim() || `${String(u.firstName ?? '')} ${String(u.lastName ?? '')}`.trim(),
    email: String(u.email ?? ''),
    mobileNumber: String(u.mobileNumber ?? ''),
    loyaltyPoints: Number(u.loyaltyPoints ?? 0),
    isActive: Boolean(u.isActive ?? true),
    createdAt: String(u.createdAt ?? new Date().toISOString()),
    completedOrdersCount: Math.max(0, Math.floor(Number(u.completedOrdersCount ?? 0))),
  };
}

export function subscribeToAuthState(callback: (user: AuthUser | null) => void): () => void {
  listeners.add(callback);

  // Fire immediately with whatever we have, then hydrate from storage.
  callback(null);
  void getStoredAuthUser().then((user) => callback(user));

  return () => {
    listeners.delete(callback);
  };
}
