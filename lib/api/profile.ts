import { apiFetch } from './client';

export interface UserProfile {
  name: string;
  phone: string;
  loyaltyPoints: number;
  avatarUri?: string | null;
  /** ISO date — account creation */
  createdAt?: string | null;
  /** Payments with status VERIFIED for this user */
  completedOrdersCount?: number;
}

export async function fetchUserProfile(): Promise<UserProfile> {
  const res = await apiFetch<{ user: any }>('/auth/me', { method: 'GET' });
  const u = res?.user ?? {};
  const firstName = String(u.firstName ?? '').trim();
  const lastName = String(u.lastName ?? '').trim();
  const fullName = String(u.fullName ?? '').trim() || `${firstName} ${lastName}`.trim();

  const createdRaw = u.createdAt;
  let createdAt: string | null = null;
  if (createdRaw != null && createdRaw !== '') {
    const d = new Date(createdRaw);
    if (Number.isFinite(d.getTime())) createdAt = d.toISOString();
  }

  return {
    name: fullName || String(u.email ?? 'User'),
    phone: String(u.mobileNumber ?? ''),
    loyaltyPoints: Number(u.loyaltyPoints ?? 0),
    avatarUri: (u.avatarUri as string | null | undefined) ?? null,
    createdAt,
    completedOrdersCount: Math.max(0, Math.floor(Number(u.completedOrdersCount ?? 0))),
  };
}
