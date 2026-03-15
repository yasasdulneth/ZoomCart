export type UserRole = 'user' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string | null;
  phoneNumber?: string | null;
  loyaltyPoints?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  barcode?: string;
  imageUrl?: string;
  inStock: boolean;
  category?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

export interface PersonalCart {
  userId: string;
  items: CartItem[];
  updatedAt: Date;
}

export interface SharedSession {
  id: string;
  ownerId: string;
  code: string;
  participants: string[];
  items: CartItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface BudgetSession {
  id: string;
  userId: string;
  totalBudget: number;
  spent: number;
  remaining: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type PaymentStatus = 'pending' | 'success' | 'failed';

export interface PaymentRecord {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  body: string;
  read: boolean;
  type?: string;
  createdAt: Date;
}

