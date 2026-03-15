import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Friend {
  id: string;
  name: string;
  phone: string;
  avatar: string; // uri or emoji
}

interface FriendContextValue {
  friends: Friend[];
  loading: boolean;
  addFriend: (friend: Omit<Friend, 'id'> & { id?: string }) => Promise<Friend>;
  removeFriend: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
  getOrCreateMe: () => Promise<MeProfile>;
}

const STORAGE_KEY = 'zoomcart_friends_v2';
const ME_STORAGE_KEY = 'zoomcart_me_v1';

export interface MeProfile {
  id: string;
  name: string;
  phone: string;
}

const FriendContext = createContext<FriendContextValue | null>(null);

async function loadMe(): Promise<MeProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(ME_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.id === 'string') return parsed;
    return null;
  } catch {
    return null;
  }
}

async function saveMe(me: MeProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(ME_STORAGE_KEY, JSON.stringify(me));
  } catch {
    // ignore
  }
}

/** Returns the current user profile for "Add Me" QR. Unique per account/install. */
export async function getOrCreateMe(): Promise<MeProfile> {
  const existing = await loadMe();
  if (existing) return existing;
  const me: MeProfile = {
    id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
    name: 'Me',
    phone: '',
  };
  await saveMe(me);
  return me;
}

async function loadFriends(): Promise<Friend[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

async function saveFriends(friends: Friend[]) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(friends));
  } catch {
    // ignore
  }
}

export const FriendProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const loaded = await loadFriends();
    setFriends(loaded);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addFriend = useCallback(
    async (friend: Omit<Friend, 'id'> & { id?: string }) => {
      const id = friend.id ?? `friend_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const next: Friend = {
        id,
        name: friend.name,
        phone: friend.phone,
        avatar: friend.avatar,
      };
      setFriends((prev) => {
        const updated = [...prev, next];
        void saveFriends(updated);
        return updated;
      });
      return next;
    },
    []
  );

  const removeFriend = useCallback(async (id: string) => {
    setFriends((prev) => {
      const updated = prev.filter((f) => f.id !== id);
      void saveFriends(updated);
      return updated;
    });
  }, []);

  const value = useMemo<FriendContextValue>(
    () => ({
      friends,
      loading,
      addFriend,
      removeFriend,
      refresh,
      getOrCreateMe,
    }),
    [friends, loading, addFriend, removeFriend, refresh]
  );

  return <FriendContext.Provider value={value}>{children}</FriendContext.Provider>;
};

export function useFriends() {
  const ctx = useContext(FriendContext);
  if (!ctx) {
    throw new Error('useFriends must be used within FriendProvider');
  }
  return ctx;
}

