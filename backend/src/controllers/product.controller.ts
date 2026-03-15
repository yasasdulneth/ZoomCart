import type { Request, Response } from 'express';
import { ProductModel } from '../models/product.model';
import { computeDiscount } from '../utils/discount';
import { notifyLowStock } from '../utils/lowStockNotify';

export async function listProducts(_req: Request, res: Response) {
  const includeInactive = String((_req.query as any)?.includeInactive ?? '').toLowerCase() === 'true';
  const q = includeInactive ? {} : { isActive: true };
  const products = await ProductModel.find(q).sort({ createdAt: -1 });
  return res.json({ products });
}

export async function getProductById(req: Request, res: Response) {
  const product = await ProductModel.findById(req.params.id);
  if (!product || product.isActive === false) return res.status(404).json({ message: 'Product not found' });
  return res.json({ product });
}

export async function createProduct(req: Request, res: Response) {
  const b = req.body ?? {};
  const name = String(b.name ?? '').trim();
  const barcode = String(b.barcode ?? '').trim();
  const originalPrice = Number(b.originalPrice);

  if (!name) return res.status(400).json({ message: 'name is required' });
  if (!barcode) return res.status(400).json({ message: 'barcode is required' });
  if (Number.isNaN(originalPrice) || originalPrice < 0) return res.status(400).json({ message: 'Invalid originalPrice' });

  const discount = computeDiscount({
    originalPrice,
    discountPercentage: b.discountPercentage != null ? Number(b.discountPercentage) : undefined,
    discountedPrice: b.discountedPrice != null ? Number(b.discountedPrice) : undefined,
  });

  try {
    const product = await ProductModel.create({
      name,
      barcode,
      originalPrice: discount.originalPrice,
      discountPercentage: discount.discountPercentage,
      discountedPrice: discount.discountedPrice,
      hasDiscount: discount.hasDiscount,
      category: String(b.category ?? 'General').trim(),
      aisle: String(b.aisle ?? '').trim(),
      shelfSection: String(b.shelfSection ?? '').trim(),
      stockQuantity: Number(b.stockQuantity ?? 0),
      lowStockThreshold: Number(b.lowStockThreshold ?? 10),
      nutritionInfo: String(b.nutritionInfo ?? '').trim(),
      cheaperAlternativeId: b.cheaperAlternativeId ?? undefined,
      imageUrl: b.imageUrl ?? undefined,
      isActive: b.isActive !== false,
      isComplete: b.isComplete !== false,
    });

    // If created already in low-stock state, notify (single record for all admins).
    try {
      await notifyLowStock({ product });
    } catch {
      // Non-blocking
    }

    return res.status(201).json({ product });
  } catch (err: any) {
    if (err?.code === 11000) return res.status(409).json({ message: 'barcode must be unique' });
    throw err;
  }
}

export async function updateProduct(req: Request, res: Response) {
  const b = req.body ?? {};
  const patch: any = {};

  for (const key of ['name', 'barcode', 'category', 'aisle', 'shelfSection', 'nutritionInfo', 'imageUrl'] as const) {
    if (b[key] !== undefined) patch[key] = String(b[key]).trim();
  }
  for (const key of ['stockQuantity', 'lowStockThreshold'] as const) {
    if (b[key] !== undefined) patch[key] = Number(b[key]);
  }
  if (b.cheaperAlternativeId !== undefined) patch.cheaperAlternativeId = b.cheaperAlternativeId ?? undefined;
  if (b.isActive !== undefined) patch.isActive = Boolean(b.isActive);
  if (b.isComplete !== undefined) patch.isComplete = Boolean(b.isComplete);

  const touchesDiscount = b.originalPrice !== undefined || b.discountPercentage !== undefined || b.discountedPrice !== undefined;
  if (touchesDiscount) {
    const current = await ProductModel.findById(req.params.id);
    if (!current) return res.status(404).json({ message: 'Product not found' });
    const originalPrice = b.originalPrice !== undefined ? Number(b.originalPrice) : current.originalPrice;
    const discount = computeDiscount({
      originalPrice,
      discountPercentage: b.discountPercentage !== undefined ? Number(b.discountPercentage) : current.discountPercentage,
      discountedPrice: b.discountedPrice !== undefined ? Number(b.discountedPrice) : current.discountedPrice,
    });
    patch.originalPrice = discount.originalPrice;
    patch.discountPercentage = discount.discountPercentage;
    patch.discountedPrice = discount.discountedPrice;
    patch.hasDiscount = discount.hasDiscount;
  }

  try {
    const product = await ProductModel.findByIdAndUpdate(req.params.id, patch, { new: true });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    return res.json({ product });
  } catch (err: any) {
    if (err?.code === 11000) return res.status(409).json({ message: 'barcode must be unique' });
    throw err;
  }
}

export async function deleteProduct(req: Request, res: Response) {
  const product = await ProductModel.findByIdAndDelete(req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  return res.json({ message: 'Product deleted', product });
}

