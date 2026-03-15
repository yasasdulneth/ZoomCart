import type { Request, Response } from 'express';
import { ProductModel } from '../models/product.model';

// ─── GET /api/store/aisles ────────────────────────────────────────────────────
/**
 * Groups all active products by their `aisle` field and returns a structured
 * list that the Store Navigation screen can render directly.
 */
export async function getAisles(_req: Request, res: Response) {
  const products = await ProductModel.find({ isActive: true })
    .select('name aisle shelfSection category')
    .sort({ aisle: 1, name: 1 })
    .lean();

  // Group by aisle label (e.g. "A1", "B2")
  const aisleMap = new Map<string, typeof products>();
  for (const p of products) {
    const key = (p.aisle || 'Unknown').trim();
    if (!aisleMap.has(key)) aisleMap.set(key, []);
    aisleMap.get(key)!.push(p);
  }

  const aisles = Array.from(aisleMap.entries()).map(([aisleLabel, prods]) => {
    // Most common category in this aisle
    const catCounts: Record<string, number> = {};
    for (const p of prods) {
      const c = (p.category || 'General').trim();
      catCounts[c] = (catCounts[c] ?? 0) + 1;
    }
    const topCategory = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'General';

    return {
      id: aisleLabel,
      number: aisleLabel,
      category: topCategory,
      productCount: prods.length,
      products: prods.map((p) => ({
        id: String(p._id),
        name: p.name,
        shelfLocation: (p.shelfSection || '').trim() || 'See staff for location',
      })),
    };
  });

  return res.json({ aisles });
}

// ─── GET /api/store/product-location?name=query ───────────────────────────────
/**
 * Finds the first active product whose name contains the search query
 * (case-insensitive) and returns its aisle + shelf location with human-readable
 * guidance steps.
 */
export async function getProductLocation(req: Request, res: Response) {
  const raw = String(req.query.name ?? '').trim();
  if (!raw) return res.status(400).json({ message: 'name query param is required' });

  const product = await ProductModel.findOne({
    isActive: true,
    name: { $regex: raw, $options: 'i' },
  })
    .select('name aisle shelfSection category')
    .lean();

  if (!product) return res.status(404).json({ message: 'Product not found' });

  const aisle = (product.aisle || '').trim() || 'Unknown';
  const section = (product.shelfSection || '').trim() || 'See staff';

  // Build human-readable guidance from the data we have
  const guidance: string[] = [`Walk to Aisle ${aisle}`];

  // Derive side from section string if it contains Left/Right keywords
  const lower = section.toLowerCase();
  if (lower.includes('left')) guidance.push('Left side of the aisle');
  else if (lower.includes('right')) guidance.push('Right side of the aisle');

  // Derive shelf level
  if (lower.includes('top')) guidance.push('Top shelf');
  else if (lower.includes('middle')) guidance.push('Middle shelf');
  else if (lower.includes('bottom')) guidance.push('Bottom shelf');

  if (section && !['see staff'].some((kw) => lower.includes(kw))) {
    guidance.push(`Shelf location: ${section}`);
  }

  guidance.push(`Look for "${product.name}"`);

  return res.json({
    product: product.name,
    aisle,
    section,
    category: product.category,
    guidance,
  });
}
