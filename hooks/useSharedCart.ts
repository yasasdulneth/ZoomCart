import { useState, useCallback, useMemo } from 'react';
import type { SharedCartItem } from '../lib/sharedCart/types';

const INITIAL_ITEMS: SharedCartItem[] = [];

export function useSharedCart() {
  const [items, setItems] = useState<SharedCartItem[]>(INITIAL_ITEMS);
  const [cartUpdated, setCartUpdated] = useState(false);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const addItem = useCallback((item: Omit<SharedCartItem, 'id'>) => {
    const newItem: SharedCartItem = {
      ...item,
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    };
    setItems((prev) => [newItem, ...prev]);
    return newItem.id;
  }, []);

  const refreshCart = useCallback(() => {
    setCartUpdated(true);
    const t = setTimeout(() => setCartUpdated(false), 2000);
    return () => clearTimeout(t);
  }, []);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );

  const itemCount = useMemo(() => items.length, [items]);

  return {
    items,
    total,
    itemCount,
    removeItem,
    addItem,
    cartUpdated,
    refreshCart,
    setItems,
  };
}
