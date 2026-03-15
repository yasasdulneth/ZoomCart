import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Friend } from './friends.service';

export type SharedCartItem = {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  addedBy: string;
  addedByName: string;
};

export type SharedSessionStatus = 'ACTIVE' | 'ENDED';

export type ParticipantRole = 'HOST' | 'MEMBER';

export type Participant = {
  userId: string;
  name: string;
  phoneNumber: string;
  avatar?: string;
  role: ParticipantRole;
  allocatedBudget: number;
  spentAmount: number;
  remainingBudget: number;
  joinedAt: string;
};

export type SharedSession = {
  id: string;
  hostId: string;
  participants: Participant[];
  items: SharedCartItem[];
  totalAmount: number;
  status: SharedSessionStatus;
  createdAt: string;
};

type Subscriber = (session: SharedSession) => void;

const SESSIONS_KEY = 'zoomcart.sharedSessions.v1';
/** Session IDs we've finished locally; Home / cart affordances never treat these as active again. */
const LIVE_UI_SUPPRESSED_IDS_KEY = 'zoomcart.sharedSessionLiveSuppressedIds.v1';
/** Session the user explicitly opened as \"live\"; Home never guesses from orphaned ACTIVE rows after restart. */
const FOREGROUND_SHARED_SESSION_KEY = 'zoomcart.sharedSessionForegroundId.v1';
const subscribersBySessionId = new Map<string, Set<Subscriber>>();

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function nowIso() {
  return new Date().toISOString();
}

function newId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function roundMoney(n: number) {
  // Avoid long floating point tails while still keeping decimals if needed.
  return Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
}

function isUnlimitedBudget(p: Pick<Participant, 'allocatedBudget'>) {
  // Budget <= 0 means "no budget limit" for this participant.
  return !(p.allocatedBudget > 0);
}

function validateParticipantBudgets(participants: Participant[]) {
  if (!participants.length) throw new Error('Participants are required.');

  for (const p of participants) {
    if (!p.userId) throw new Error('Participant userId is required.');
    if (!p.name?.trim()) throw new Error('Participant name is required.');

    const b = Number(p.allocatedBudget);
    if (!Number.isFinite(b) || b < 0) {
      throw new Error(`Invalid budget for ${p.name}.`);
    }
    // Members may be unlimited (budget = 0) or limited (> 0).
  }
}

function recalculateSession(session: SharedSession): SharedSession {
  const spentByUser = new Map<string, number>();
  let total = 0;

  for (const it of session.items) {
    const line = roundMoney(it.price * it.quantity);
    total += line;
    spentByUser.set(it.addedBy, roundMoney((spentByUser.get(it.addedBy) ?? 0) + line));
  }

  const participants = session.participants.map((p) => {
    const spent = roundMoney(spentByUser.get(p.userId) ?? 0);
    const unlimited = isUnlimitedBudget(p);
    const remaining = unlimited ? Number.POSITIVE_INFINITY : roundMoney(Math.max(0, p.allocatedBudget - spent));
    return {
      ...p,
      spentAmount: spent,
      remainingBudget: remaining,
    };
  });

  const status: SharedSessionStatus =
    typeof session.status === 'string' && session.status.toUpperCase() === 'ENDED' ? 'ENDED' : 'ACTIVE';
  return { ...session, status, participants, totalAmount: roundMoney(total) };
}

function getParticipant(session: SharedSession, userId: string): Participant | undefined {
  return session.participants.find((p) => p.userId === userId);
}

async function loadAll(): Promise<Record<string, SharedSession>> {
  const raw = await AsyncStorage.getItem(SESSIONS_KEY);
  const parsed = safeJsonParse<Record<string, SharedSession>>(raw);
  return parsed && typeof parsed === 'object' ? parsed : {};
}

async function saveAll(map: Record<string, SharedSession>): Promise<void> {
  await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(map));
}

function emit(session: SharedSession) {
  const subs = subscribersBySessionId.get(session.id);
  if (!subs || subs.size === 0) return;
  for (const cb of subs) {
    try {
      cb(session);
    } catch {
      // ignore subscriber errors
    }
  }
}

async function persistLiveUiSuppressId(sessionId: string): Promise<void> {
  if (!sessionId) return;
  const raw = await AsyncStorage.getItem(LIVE_UI_SUPPRESSED_IDS_KEY);
  const ids = safeJsonParse<string[]>(raw) ?? [];
  if (ids.includes(sessionId)) return;
  const next = [sessionId, ...ids].slice(0, 160);
  await AsyncStorage.setItem(LIVE_UI_SUPPRESSED_IDS_KEY, JSON.stringify(next));
}

async function forgetLiveUiSuppressId(sessionId: string): Promise<void> {
  const raw = await AsyncStorage.getItem(LIVE_UI_SUPPRESSED_IDS_KEY);
  const ids = safeJsonParse<string[]>(raw) ?? [];
  const next = ids.filter((id) => id !== sessionId);
  if (next.length === ids.length) return;
  await AsyncStorage.setItem(LIVE_UI_SUPPRESSED_IDS_KEY, JSON.stringify(next));
}

/** IDs that finished on this device — never advertise as \"live\" on Home or resume into ActiveSharedSession. */
export async function getSharedSessionsSuppressedFromLiveUi(): Promise<ReadonlySet<string>> {
  const raw = await AsyncStorage.getItem(LIVE_UI_SUPPRESSED_IDS_KEY);
  const ids = safeJsonParse<string[]>(raw) ?? [];
  return new Set(ids);
}

/**
 * Caller is inside `ActiveSharedSession` — registers this session as the only one eligible for \"live\" on Home.
 */
export async function setSharedSessionForegroundParticipation(sessionId: string): Promise<void> {
  if (!sessionId) return;
  await AsyncStorage.setItem(FOREGROUND_SHARED_SESSION_KEY, sessionId);
}

export async function getSharedSessionForegroundParticipation(): Promise<string | null> {
  return AsyncStorage.getItem(FOREGROUND_SHARED_SESSION_KEY);
}

/**
 * Clear stored foreground participation. Pass `sessionId` to remove only when it matches (avoids wiping a newer session).
 */
export async function clearSharedSessionForegroundParticipation(sessionId?: string): Promise<void> {
  const cur = await AsyncStorage.getItem(FOREGROUND_SHARED_SESSION_KEY);
  if (sessionId !== undefined && cur !== sessionId) return;
  await AsyncStorage.removeItem(FOREGROUND_SHARED_SESSION_KEY);
}

/** Call when the shared session checkout flow completes (SessionReceipt etc.) — Home never resumes this id as live. */
export async function suppressSharedSessionForLiveUi(sessionId: string): Promise<void> {
  await persistLiveUiSuppressId(sessionId);
  await clearSharedSessionForegroundParticipation(sessionId);
}

/**
 * Persist ENDED + emit for any suppressed id that somehow still reads ACTIVE on disk (repairs phantom \"live\").
 */
async function healStoredSharedSessionsAgainstSuppressList(): Promise<void> {
  try {
    const suppressed = await getSharedSessionsSuppressedFromLiveUi();
    if (suppressed.size === 0) return;
    const all = await loadAll();
    let dirty = false;
    const changedIds: string[] = [];
    for (const id of suppressed) {
      const s = all[id];
      if (!s) continue;
      if (s.status === 'ENDED') continue;
      all[id] = recalculateSession({ ...s, status: 'ENDED' });
      dirty = true;
      changedIds.push(id);
    }
    if (!dirty) return;
    await saveAll(all);
    for (const id of changedIds) {
      const s = all[id];
      if (s) emit(recalculateSession(s));
    }
  } catch {
    // ignore persistence errors
  }
}

export async function createSharedSession(input: {
  hostId: string;
  participants: Participant[];
}): Promise<SharedSession> {
  validateParticipantBudgets(input.participants);

  const createdAt = nowIso();
  const id = newId('session');
  const base: SharedSession = {
    id,
    hostId: input.hostId,
    participants: input.participants,
    items: [],
    totalAmount: 0,
    status: 'ACTIVE',
    createdAt,
  };
  const session = recalculateSession(base);
  const all = await loadAll();
  all[id] = session;
  await saveAll(all);
  emit(session);
  return session;
}

export async function getSharedSession(sessionId: string): Promise<SharedSession> {
  await healStoredSharedSessionsAgainstSuppressList();
  const all = await loadAll();
  const session = all[sessionId];
  if (!session) {
    throw new Error('Shared session not found.');
  }
  return recalculateSession(session);
}

async function updateSession(
  sessionId: string,
  updater: (s: SharedSession) => SharedSession,
): Promise<SharedSession> {
  const all = await loadAll();
  const current = all[sessionId];
  if (!current) throw new Error('Shared session not found.');
  const base = recalculateSession(current);
  if (base.status === 'ENDED') {
    throw new Error('This shared session has already ended.');
  }
  const updated = recalculateSession(updater(base));
  all[sessionId] = updated;
  await saveAll(all);
  emit(updated);
  return updated;
}

export async function addItemToSharedSession(
  sessionId: string,
  product: Omit<SharedCartItem, 'id'>,
): Promise<SharedCartItem> {
  const item: SharedCartItem = { ...product, id: newId('item') };
  await updateSession(sessionId, (s) => {
    const p = getParticipant(s, item.addedBy);
    if (!p) throw new Error('Participant not found in this session.');

    const cost = roundMoney(item.price * item.quantity);
    if (!isUnlimitedBudget(p) && p.remainingBudget < cost) {
      throw new Error(`Budget limit exceeded for ${p.name}`);
    }

    return { ...s, items: [item, ...s.items] };
  });
  return item;
}

export async function removeItemFromSharedSession(sessionId: string, itemId: string): Promise<void> {
  await updateSession(sessionId, (s) => ({
    ...s,
    items: s.items.filter((i) => i.id !== itemId),
  }));
}

export async function updateSharedItemQuantity(
  sessionId: string,
  itemId: string,
  quantity: number,
): Promise<void> {
  const q = Math.max(1, Math.min(99, Math.floor(quantity)));
  await updateSession(sessionId, (s) => {
    const current = s.items.find((i) => i.id === itemId);
    if (!current) return s;

    const delta = roundMoney(current.price * (q - current.quantity));
    if (delta > 0) {
      const p = getParticipant(s, current.addedBy);
      if (!p) throw new Error('Participant not found in this session.');
      if (!isUnlimitedBudget(p) && p.remainingBudget < delta) {
        throw new Error(`Budget limit exceeded for ${p.name}`);
      }
    }

    return {
      ...s,
      items: s.items.map((i) => (i.id === itemId ? { ...i, quantity: q } : i)),
    };
  });
}

/**
 * Marks a session ENDED in local storage if it exists (idempotent).
 * Use when ending from this device **or** when receiving `session:ended` remote —
 * ensures Home / list views do not treat the session as still ACTIVE.
 */
export async function markSharedSessionEndedLocally(sessionId: string): Promise<SharedSession | null> {
  try {
    const all = await loadAll();
    const current = all[sessionId];
    if (!current) return null;
    const recalculated = recalculateSession(current);
    if (recalculated.status === 'ENDED') {
      emit(recalculated);
      return recalculated;
    }
    const ended = recalculateSession({ ...recalculated, status: 'ENDED' });
    all[sessionId] = ended;
    await saveAll(all);
    emit(ended);
    return ended;
  } finally {
    await persistLiveUiSuppressId(sessionId);
    await clearSharedSessionForegroundParticipation(sessionId);
  }
}

export async function endSharedSession(sessionId: string): Promise<void> {
  const ended = await markSharedSessionEndedLocally(sessionId);
  if (!ended) throw new Error('Shared session not found.');
}

export async function updateParticipantBudget(input: {
  sessionId: string;
  participantUserId: string;
  budget: number;
  actorUserId: string;
}): Promise<SharedSession> {
  const b = roundMoney(Number(input.budget));
  if (!Number.isFinite(b) || b < 0) throw new Error('Budget must be a positive number.');

  return updateSession(input.sessionId, (s) => {
    if (input.actorUserId !== s.hostId) throw new Error('Only the host can update budgets.');

    const nextParticipants = s.participants.map((p) =>
      p.userId === input.participantUserId
        ? {
            ...p,
            allocatedBudget: b,
          }
        : p,
    );

    validateParticipantBudgets(nextParticipants);
    return { ...s, participants: nextParticipants };
  });
}

/**
 * Removes a session from local storage (e.g. dismiss from Recent activity).
 */
export async function removeSharedSession(sessionId: string): Promise<void> {
  const all = await loadAll();
  delete all[sessionId];
  await saveAll(all);
  subscribersBySessionId.delete(sessionId);
  await forgetLiveUiSuppressId(sessionId);
  await clearSharedSessionForegroundParticipation(sessionId);
}

/**
 * Returns all shared sessions sorted newest-first.
 * Optionally pass a userId to filter only sessions the user participated in.
 */
export async function listAllSessions(userId?: string): Promise<SharedSession[]> {
  await healStoredSharedSessionsAgainstSuppressList();
  const all = await loadAll();
  let sessions = Object.values(all).map((s) => recalculateSession(s));
  if (userId) {
    sessions = sessions.filter(
      (s) =>
        s.hostId === userId ||
        s.participants.some((p) => p.userId === userId),
    );
  }
  return sessions.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

/**
 * Saves (or overwrites) a session received from another device via socket invite.
 * This lets an invited member persist the host's session in their own AsyncStorage.
 *
 * Once a session is ENDED locally, refuse any non-ENDED socket snapshot (including
 * payloads with missing `status`, which would otherwise overwrite ENDED and revive \"active\" UI).
 */
export async function importSharedSession(session: SharedSession): Promise<void> {
  const suppressed = await getSharedSessionsSuppressedFromLiveUi();
  if (suppressed.has(session.id)) {
    const all = await loadAll();
    const existing = all[session.id];
    if (existing && existing.status === 'ACTIVE') {
      const healed = recalculateSession({ ...existing, status: 'ENDED' });
      all[session.id] = healed;
      await saveAll(all);
      emit(healed);
    } else if (existing) {
      emit(recalculateSession(existing));
    }
    return;
  }

  const all = await loadAll();
  const existing = all[session.id];
  const next = recalculateSession(session);

  if (existing?.status === 'ENDED') {
    if (next.status === 'ENDED') {
      all[session.id] = next;
      await saveAll(all);
      emit(next);
      return;
    }
    emit(recalculateSession(existing));
    return;
  }

  all[session.id] = next;
  await saveAll(all);
  emit(next);
}

export function subscribeToSharedSession(sessionId: string, callback: Subscriber): () => void {
  const set = subscribersBySessionId.get(sessionId) ?? new Set<Subscriber>();
  set.add(callback);
  subscribersBySessionId.set(sessionId, set);

  void getSharedSession(sessionId).then((s) => callback(s)).catch(() => {});

  return () => {
    const current = subscribersBySessionId.get(sessionId);
    if (!current) return;
    current.delete(callback);
    if (current.size === 0) subscribersBySessionId.delete(sessionId);
  };
}

