import type { Request, Response } from 'express';
import { ProductModel } from '../models/product.model';

function toClientProduct(p: any) {
  const obj = p.toObject ? p.toObject() : p;
  const originalPrice = Number(obj.originalPrice ?? 0);
  const discountedPrice = obj.discountedPrice != null ? Number(obj.discountedPrice) : undefined;
  const hasDiscount = Boolean(obj.hasDiscount);

  return {
    id: String(obj._id),
    barcode: String(obj.barcode ?? ''),
    name: String(obj.name ?? ''),
    // client expects 'price' to be the active price
    price: hasDiscount && discountedPrice != null ? discountedPrice : originalPrice,
    originalPrice,
    hasDiscount,
    discountedPrice,
    category: String(obj.category ?? 'General'),
    stockQuantity: Number(obj.stockQuantity ?? 0),
    imageUri: obj.imageUrl ?? null,
    nutrition: obj.nutritionInfo
      ? {
          summary: String(obj.nutritionInfo),
        }
      : undefined,
  };
}

export async function getProductByBarcodePublic(req: Request, res: Response) {
  const raw = String(req.params.barcode ?? '');
  const barcode = raw.trim();
  // Debug logs (requested)
  // eslint-disable-next-line no-console
  console.log('Barcode received:', req.params.barcode);
  // eslint-disable-next-line no-console
  console.log('[scan] Searching barcode:', barcode);

  if (!barcode) return res.status(400).json({ message: 'barcode is required' });

  const noSpaces = barcode.replace(/\s+/g, '');
  const digitsOnly = noSpaces.replace(/[^\d]/g, '');
  const candidates = Array.from(new Set([barcode, noSpaces, digitsOnly].filter(Boolean)));

  // eslint-disable-next-line no-console
  console.log('[scan] Barcode candidates:', candidates);

  const product = await ProductModel.findOne({ barcode: { $in: candidates }, isActive: true });
  if (!product) {
    // eslint-disable-next-line no-console
    console.log('[scan] Product not found for barcode:', barcode);
    return res.status(404).json({ message: `Product not found for barcode: ${barcode}` });
  }

  // eslint-disable-next-line no-console
  console.log('Product found:', product);
  // eslint-disable-next-line no-console
  console.log('[scan] Product found:', String(product._id));
  return res.json({ product: toClientProduct(product) });
}

