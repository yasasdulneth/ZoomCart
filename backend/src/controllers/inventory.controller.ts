import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { ProductModel } from '../models/product.model';
import { notifyLowStock } from '../utils/lowStockNotify';

export async function inventoryList(_req: Request, res: Response) {
  const inventory = await ProductModel.find({ isActive: true })
    .select('name barcode stockQuantity lowStockThreshold aisle shelfSection category')
    .sort({ name: 1 });
  return res.json({ inventory });
}

export async function updateStock(req: Request, res: Response) {
  const stockQuantity = Number(req.body?.stockQuantity);
  if (Number.isNaN(stockQuantity) || stockQuantity < 0) return res.status(400).json({ message: 'Invalid stockQuantity' });
  const product = await ProductModel.findByIdAndUpdate(req.params.productId, { stockQuantity }, { new: true });
  if (!product) return res.status(404).json({ message: 'Product not found' });

  // Notify when low-stock (deduped by cooldown).
  try {
    await notifyLowStock({ product });
  } catch {
    // Non-blocking
  }

  return res.json({ product });
}

export async function updateThreshold(req: Request, res: Response) {
  const lowStockThreshold = Number(req.body?.lowStockThreshold);
  if (Number.isNaN(lowStockThreshold) || lowStockThreshold < 0) return res.status(400).json({ message: 'Invalid lowStockThreshold' });
  const product = await ProductModel.findByIdAndUpdate(req.params.productId, { lowStockThreshold }, { new: true });
  if (!product) return res.status(404).json({ message: 'Product not found' });

  // If threshold change makes it low-stock, notify (deduped by cooldown).
  try {
    await notifyLowStock({ product });
  } catch {
    // Non-blocking
  }

  return res.json({ product });
}

/**
 * POST /api/inventory/deduct
 * Called after a successful payment. Atomically decrements stockQuantity
 * for each purchased product.  Placeholder / invalid IDs are silently skipped.
 */
export async function deductStock(req: Request, res: Response) {
  const items = req.body?.items as Array<{ productId?: string; quantity?: number }> | undefined;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'items array required' });
  }

  const updated: Array<{ productId: string; newStock: number }> = [];

  for (const item of items) {
    const { productId, quantity } = item;

    // Skip missing or obviously-placeholder IDs
    if (
      !productId ||
      typeof productId !== 'string' ||
      productId.startsWith('barcode_') ||
      productId.startsWith('item_') ||
      !mongoose.Types.ObjectId.isValid(productId)
    ) {
      continue;
    }

    const qty = Math.max(1, Math.floor(Number(quantity) || 1));

    try {
      const product = await ProductModel.findByIdAndUpdate(
        productId,
        { $inc: { stockQuantity: -qty } },
        { new: true },
      );
      if (!product) continue;

      // Cap at 0 if decrement pushed it below zero
      if (product.stockQuantity < 0) {
        await ProductModel.findByIdAndUpdate(productId, { stockQuantity: 0 });
        product.stockQuantity = 0;
      }

      updated.push({ productId, newStock: product.stockQuantity });

      // Fire low-stock notification (non-blocking)
      try {
        await notifyLowStock({ product });
      } catch {
        // ignore
      }
    } catch {
      // invalid ObjectId or DB error — skip silently
    }
  }

  return res.json({ updated });
}

export async function lowStock(_req: Request, res: Response) {
  const products = await ProductModel.find({
    isActive: true,
    $expr: { $lte: ['$stockQuantity', '$lowStockThreshold'] },
  }).sort({ stockQuantity: 1 });
  return res.json({ products });
}

