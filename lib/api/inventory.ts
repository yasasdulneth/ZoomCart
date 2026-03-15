/**
 * Inventory API.
 * POST /api/inventory/deduct — decrement stock after a successful purchase.
 */

import { apiFetch } from './client';

export interface DeductItem {
  productId: string;
  quantity: number;
}

export interface DeductResponse {
  updated: Array<{ productId: string; newStock: number }>;
}

/**
 * Deducts purchased quantities from the backend inventory.
 * Items with placeholder / invalid productIds are silently ignored by the backend.
 */
export async function deductStockAfterPurchase(items: DeductItem[]): Promise<DeductResponse> {
  const validItems = items.filter(
    (i) =>
      i.productId &&
      !i.productId.startsWith('barcode_') &&
      !i.productId.startsWith('item_'),
  );
  if (validItems.length === 0) return { updated: [] };

  const data = await apiFetch<DeductResponse>('/inventory/deduct', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: validItems }),
  });
  return data;
}
