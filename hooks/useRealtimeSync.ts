import { useState, useEffect, useCallback, useRef } from 'react';
import type { SyncStatus } from '../lib/sharedCart/types';

const MOCK_SYNC_INTERVAL_MS = 4000;
const MOCK_ACTIVITY_INTERVAL_MS = 8000;

export interface SyncState {
  status: SyncStatus;
  lastSyncedAt: number | null;
}

export interface ActivityToast {
  id: string;
  message: string;
  timestamp: number;
}

export function useRealtimeSync(options?: {
  onMockAdd?: (itemName: string, userName: string) => void;
  /** When false, no demo sync/activity intervals run. Default true. */
  demoEnabled?: boolean;
}) {
  // Mock demo mode is permanently disabled — real-time sync is handled by socket.io
  const demoEnabled = false;
  const [syncState, setSyncState] = useState<SyncState>({
    status: 'synced',
    lastSyncedAt: Date.now(),
  });
  const [toast, setToast] = useState<ActivityToast | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onMockAddRef = useRef(options?.onMockAdd);
  onMockAddRef.current = options?.onMockAdd;

  const showToast = useCallback((message: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    const id = `toast-${Date.now()}`;
    setToast({ id, message, timestamp: Date.now() });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
      toastTimeoutRef.current = null;
    }, 2500);
  }, []);

  useEffect(() => {
    if (!demoEnabled) return;

    let syncTimer: ReturnType<typeof setInterval>;
    let activityTimer: ReturnType<typeof setInterval>;

    syncTimer = setInterval(() => {
      setSyncState((s) => ({ ...s, status: 'syncing' }));
      const done = () => {
        setSyncState({
          status: 'synced',
          lastSyncedAt: Date.now(),
        });
      };
      setTimeout(done, 800 + Math.random() * 400);
    }, MOCK_SYNC_INTERVAL_MS);

    const mockUsers = ['Alex', 'Jordan', 'Sam'];
    const mockItems = ['Bread', 'Milk', 'Avocado', 'Eggs', 'Butter'];

    activityTimer = setInterval(() => {
      if (Math.random() > 0.5) {
        const user = mockUsers[Math.floor(Math.random() * mockUsers.length)];
        const item = mockItems[Math.floor(Math.random() * mockItems.length)];
        showToast(`${user} added ${item}`);
        onMockAddRef.current?.(item, user);
      }
    }, MOCK_ACTIVITY_INTERVAL_MS);

    return () => {
      clearInterval(syncTimer);
      clearInterval(activityTimer);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, [showToast, demoEnabled]);

  const setOffline = useCallback(() => {
    setSyncState((s) => ({ ...s, status: 'offline' }));
  }, []);

  const setSyncing = useCallback(() => {
    setSyncState((s) => ({ ...s, status: 'syncing' }));
  }, []);

  return {
    syncState,
    toast,
    showToast,
    setOffline,
    setSyncing,
  };
}
