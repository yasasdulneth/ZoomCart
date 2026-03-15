import React, { createContext, useCallback, useContext, useState } from 'react';
import type { Product } from '../lib/api/products';

export interface CartItem {
  productId: string;
  barcode: string;
  name: string;
  price: number; // unit price used for totals (discount-aware)
  quantity: number;
  subtotal: number;
  imageUrl?: string | null;
  product: Product; // keep original product reference for details screens
}

interface CartContextValue {
  items: CartItem[];
  addToCart: (product: Product, quantity?: number, opts?: { unitPrice?: number }) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addToCart = useCallback((product: Product, quantity = 1, opts?: { unitPrice?: number }) => {
    setItems((prev) => {
      const unitPrice = typeof opts?.unitPrice === 'number' ? opts.unitPrice : product.price;
      const q = Math.max(1, Math.floor(quantity));
      const existing = prev.find((i) => i.productId === product.id && i.price === unitPrice);
      if (existing) {
        return prev.map((i) =>
          i.productId === existing.productId && i.price === existing.price
            ? {
                ...i,
                quantity: i.quantity + q,
                subtotal: (i.quantity + q) * i.price,
              }
            : i
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          barcode: product.barcode,
          name: product.name,
          price: unitPrice,
          quantity: q,
          subtotal: unitPrice * q,
          imageUrl: product.imageUri ?? null,
          product,
        },
      ];
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  return (
    <CartContext.Provider
      value={{ items, addToCart, removeFromCart, clearCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within CartProvider');
  }
  return ctx;
}

export function useCartOptional() {
  return useContext(CartContext);
}
