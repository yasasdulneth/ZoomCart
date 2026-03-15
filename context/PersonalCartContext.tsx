import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { playAddToCartChime } from '../lib/sounds/uiChimes';

export interface PersonalCartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  emoji?: string;
}

interface PersonalCartContextValue {
  items: PersonalCartItem[];
  addItem: (item: Omit<PersonalCartItem, 'id'> & { id?: string }) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  subtotal: number;
  total: number;
}

const PersonalCartContext = createContext<PersonalCartContextValue | null>(null);

export function PersonalCartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<PersonalCartItem[]>([]);

  const addItem = useCallback(
    (item: Omit<PersonalCartItem, 'id'> & { id?: string }) => {
      setItems((prev) => {
        const existing = prev.find(
          (it) => it.name === item.name && it.price === item.price
        );
        if (existing) {
          return prev.map((it) =>
            it.id === existing.id
              ? { ...it, quantity: it.quantity + (item.quantity || 1) }
              : it
          );
        }
        const id =
          item.id ??
          `pc_${Date.now()}_${Math.random().toString(16).slice(2)}`;
        return [
          {
            id,
            name: item.name,
            price: item.price,
            quantity: item.quantity || 1,
            emoji: item.emoji,
          },
          ...prev,
        ];
      });
      void playAddToCartChime();
    },
    []
  );

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    setItems((prev) =>
      prev
        .map((it) =>
          it.id === id
            ? { ...it, quantity: Math.max(1, Math.floor(quantity)) }
            : it
        )
        .filter((it) => it.quantity > 0)
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const subtotal = useMemo(
    () => items.reduce((sum, it) => sum + it.price * it.quantity, 0),
    [items]
  );

  const total = subtotal;

  const value = useMemo<PersonalCartContextValue>(
    () => ({
      items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      subtotal,
      total,
    }),
    [items, addItem, removeItem, updateQuantity, clearCart, subtotal, total]
  );

  return (
    <PersonalCartContext.Provider value={value}>
      {children}
    </PersonalCartContext.Provider>
  );
}

export function usePersonalCart() {
  const ctx = useContext(PersonalCartContext);
  if (!ctx) {
    throw new Error('usePersonalCart must be used within PersonalCartProvider');
  }
  return ctx;
}

export function usePersonalCartOptional() {
  return useContext(PersonalCartContext);
}
