export interface SharedCartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  emoji: string;
  addedBy?: string;
}

export interface Participant {
  id: string;
  name: string;
  avatarUri?: string | null;
  isOnline: boolean;
  isHost: boolean;
}

export type SyncStatus = 'synced' | 'syncing' | 'offline';

export interface CartActivity {
  id: string;
  type: 'add' | 'remove';
  itemName: string;
  userName: string;
  timestamp: number;
}
