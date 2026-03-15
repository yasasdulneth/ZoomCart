import { deductStockAfterPurchase } from '../api/inventory';

/**
 * Decrements product stock on the backend after a successful payment.
 * Single-item convenience wrapper around deductStockAfterPurchase.
 */
export async function decrementProductStock(input: { productId: string; by: number }) {
  const res = await deductStockAfterPurchase([{ productId: input.productId, quantity: input.by }]);
  return res.updated[0] ?? null;
}

/**
 * Bulk deducts stock for all items in a completed order.
 * Items without valid productIds are silently skipped.
 */
export async function deductOrderStock(
  items: Array<{ productId?: string; id?: string; quantity: number }>,
): Promise<void> {
  const mapped = items.map((i) => ({
    productId: i.productId ?? i.id ?? '',
    quantity: i.quantity,
  }));
  await deductStockAfterPurchase(mapped);
}

