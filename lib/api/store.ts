/**
 * Store Navigation API.
 * GET /api/store/aisles                      — all aisles with their products
 * GET /api/store/product-location?name=...   — find a product's aisle & shelf
 */

import { apiFetch } from './client';

export interface AisleProduct {
  id: string;
  name: string;
  shelfLocation: string;
}

export interface Aisle {
  id: string;
  number: string;
  category: string;
  productCount: number;
  products: AisleProduct[];
}

export interface ProductLocationResponse {
  product: string;
  aisle: string;
  section: string;
  category?: string;
  guidance: string[];
}

export async function fetchAisles(): Promise<Aisle[]> {
  const data = await apiFetch<{ aisles: Aisle[] }>('/store/aisles');
  return Array.isArray(data.aisles) ? data.aisles : [];
}

export async function fetchProductLocation(name: string): Promise<ProductLocationResponse | null> {
  const query = name.trim();
  if (!query) return null;

  try {
    const data = await apiFetch<ProductLocationResponse>(
      `/store/product-location?name=${encodeURIComponent(query)}`,
    );
    return data ?? null;
  } catch (e: any) {
    const msg = String(e?.message ?? '');
    if (msg.toLowerCase().includes('not found') || msg.includes('404')) return null;
    throw e;
  }
}
