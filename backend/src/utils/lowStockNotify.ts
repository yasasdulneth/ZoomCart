import { NotificationModel } from '../models/notification.model';
import type { ProductDoc } from '../models/product.model';

export async function notifyLowStock(params: {
  /** Product document AFTER update. */
  product: ProductDoc;
  /** Minimum time between notifications for same product. */
  cooldownMs?: number;
}) {
  const { product, cooldownMs = 6 * 60 * 60 * 1000 } = params;

  const nextStock = Number(product.stockQuantity ?? 0);
  const nextThreshold = Number(product.lowStockThreshold ?? 0);
  const isLow = nextStock <= nextThreshold;
  if (!isLow) return;

  const since = new Date(Date.now() - cooldownMs);
  const existing = await NotificationModel.findOne({
    type: 'LOW_STOCK',
    isActive: true,
    productId: product._id,
    createdAt: { $gte: since },
  }).sort({ createdAt: -1 });
  if (existing) return;

  await NotificationModel.create({
    title: `Low stock: ${String(product.name ?? '').trim() || 'Product'}`,
    message: `Stock is low for ${String(product.name ?? '').trim() || 'this product'} (barcode: ${String(
      product.barcode ?? '',
    ).trim()}). Stock: ${nextStock}. Threshold: ${nextThreshold}.`,
    type: 'LOW_STOCK',
    targetAudience: 'ALL_ADMINS',
    productId: product._id,
    barcode: String(product.barcode ?? '').trim() || undefined,
    isRead: false,
    isActive: true,
  });
}

