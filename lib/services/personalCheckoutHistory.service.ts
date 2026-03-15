import AsyncStorage from '@react-native-async-storage/async-storage';
import { listAllSessions, type SharedSession } from './sharedSession.service';

const STORAGE_KEY = 'zoomcart.personalCheckoutHistory.v1';
const MAX_RECORDS = 120;

/** Payment flows that originate from the shared cart use this title — do not log as personal. */
export const SHARED_SESSION_PAYMENT_TITLE = 'Shared Session Total';

/** Line items captured at checkout (for receipts / history view). */
export type PersonalCheckoutLineItem = {
  name: string;
  price: number;
  quantity: number;
};

export type PersonalCheckoutRecord = {
  id: string;
  createdAt: string;
  totalAmount: number;
  /** Sum of line quantities */
  itemCount: number;
  title: string;
  paymentId?: string;
  userId?: string;
  /** Product lines saved with this checkout (older records may omit). */
  items?: PersonalCheckoutLineItem[];
};

function roundMoney(n: number): number {
  return Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
}

function safeParseRecords(raw: string | null): PersonalCheckoutRecord[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r): r is PersonalCheckoutRecord =>
        !!r &&
        typeof r === 'object' &&
        typeof (r as PersonalCheckoutRecord).id === 'string' &&
        typeof (r as PersonalCheckoutRecord).createdAt === 'string',
    );
  } catch {
    return [];
  }
}

async function loadRecords(): Promise<PersonalCheckoutRecord[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return safeParseRecords(raw);
}

export async function appendPersonalCheckoutRecord(input: {
  paymentId?: string | null;
  userId?: string;
  totalAmount: number;
  itemCount: number;
  title?: string;
  items?: PersonalCheckoutLineItem[];
}): Promise<void> {
  if (input.title === SHARED_SESSION_PAYMENT_TITLE) return;

  const list = await loadRecords();
  if (input.paymentId && list.some((r) => r.paymentId === input.paymentId)) return;

  const record: PersonalCheckoutRecord = {
    id: `pco_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    createdAt: new Date().toISOString(),
    totalAmount: roundMoney(input.totalAmount),
    itemCount: Math.max(0, Math.floor(input.itemCount)),
    title: (input.title?.trim() || 'Checkout').slice(0, 80),
  };
  if (input.paymentId) record.paymentId = input.paymentId;
  if (input.userId) record.userId = input.userId;
  if (input.items?.length) {
    record.items = input.items.map((it) => ({
      name: String(it.name ?? '').slice(0, 200),
      price: roundMoney(Number(it.price)),
      quantity: Math.max(1, Math.floor(Number(it.quantity))),
    }));
  }

  const next = [record, ...list.filter((r) => r.id !== record.id)].slice(0, MAX_RECORDS);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export async function listPersonalCheckoutRecords(userId?: string): Promise<PersonalCheckoutRecord[]> {
  const list = await loadRecords();
  if (!userId) return list;
  return list.filter((r) => !r.userId || r.userId === userId);
}

export async function removePersonalCheckoutRecord(id: string): Promise<void> {
  const list = await loadRecords();
  const next = list.filter((r) => r.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export type UnifiedShoppingRow =
  | { kind: 'shared'; session: SharedSession; sortAt: number }
  | { kind: 'personal'; record: PersonalCheckoutRecord; sortAt: number };

export async function listUnifiedShoppingActivity(userId?: string): Promise<UnifiedShoppingRow[]> {
  const [shared, personal] = await Promise.all([listAllSessions(userId), listPersonalCheckoutRecords(userId)]);

  const rows: UnifiedShoppingRow[] = [
    ...shared.map((session) => ({
      kind: 'shared' as const,
      session,
      sortAt: Date.parse(session.createdAt) || 0,
    })),
    ...personal.map((record) => ({
      kind: 'personal' as const,
      record,
      sortAt: Date.parse(record.createdAt) || 0,
    })),
  ];

  rows.sort((a, b) => b.sortAt - a.sortAt);
  return rows;
}
