import AsyncStorage from '@react-native-async-storage/async-storage';

export type Friend = {
  id: string;
  name: string;
  phoneNumber: string;
  avatar?: string;
};

const STORAGE_KEY = 'zoomcart.friends.v3';

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function normalizeFriend(input: Friend): Friend {
  return {
    id: String(input.id),
    name: String(input.name ?? '').trim() || 'Friend',
    phoneNumber: String(input.phoneNumber ?? '').trim(),
    avatar: input.avatar ? String(input.avatar) : undefined,
  };
}

export async function getSavedFriends(): Promise<Friend[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const parsed = safeJsonParse<unknown>(raw);
  if (!Array.isArray(parsed)) return [];
  const friends: Friend[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== 'object') continue;
    const anyItem = item as any;
    if (typeof anyItem.id !== 'string') continue;
    friends.push(
      normalizeFriend({
        id: anyItem.id,
        name: anyItem.name,
        phoneNumber: anyItem.phoneNumber ?? anyItem.phone ?? '',
        avatar: anyItem.avatar,
      }),
    );
  }
  return friends;
}

async function saveFriends(friends: Friend[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(friends));
}

export async function addFriend(friend: Friend): Promise<Friend> {
  const normalized = normalizeFriend(friend);
  const existing = await getSavedFriends();
  const withoutDup = existing.filter((f) => f.id !== normalized.id);
  const next = [normalized, ...withoutDup];
  await saveFriends(next);
  return normalized;
}

export async function removeFriend(friendId: string): Promise<void> {
  const existing = await getSavedFriends();
  const next = existing.filter((f) => f.id !== friendId);
  await saveFriends(next);
}

