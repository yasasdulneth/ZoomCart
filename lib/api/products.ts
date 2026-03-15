/**
 * Products API.
 * Uses the app backend base URL from Expo config.
 */

import { apiFetch } from './client';
import { API_BASE_URL } from './config';

export interface ProductNutrition {
  calories?: number;
  fat?: string;
  protein?: string;
  carbs?: string;
  sugar?: string;
  summary?: string;
}

export interface CheaperAlternative {
  name: string;
  price: number;
  store?: string;
}

export interface Product {
  id: string;
  barcode: string;
  name: string;
  brand?: string;
  price: number; // base/original price
  originalPrice?: number; // optional explicit original price
  hasDiscount?: boolean;
  discountedPrice?: number;
  category?: string;
  stockQuantity?: number;
  unit?: string;
  imageUri?: string | null;
  nutrition?: ProductNutrition;
  cheaperAlternative?: CheaperAlternative | null;
}

const USE_REAL_API = true;

const MOCK_PRODUCTS: Record<string, Product> = {
  '5901234123457': {
    id: 'prod-1',
    barcode: '5901234123457',
    name: 'Organic Avocado',
    brand: 'Fresh Farm Co.',
    price: 4.99,
    originalPrice: 4.99,
    hasDiscount: true,
    discountedPrice: 3.99,
    category: 'Produce',
    stockQuantity: 12,
    unit: 'each',
    imageUri: null,
    nutrition: {
      calories: 160,
      fat: '15g',
      protein: '2g',
      carbs: '9g',
      sugar: '0.7g',
      summary: 'Great source of healthy fats. Perfect for salads and smoothies.',
    },
    cheaperAlternative: {
      name: 'Organic Avocado (Store Brand)',
      price: 3.99,
      store: 'Local Mart',
    },
  },
  '012345678905': {
    id: 'prod-2',
    barcode: '012345678905',
    name: 'Whole Milk 1 Gallon',
    brand: 'Dairy Fresh',
    price: 4.49,
    originalPrice: 4.49,
    hasDiscount: false,
    discountedPrice: undefined,
    category: 'Dairy',
    stockQuantity: 6,
    unit: 'gallon',
    imageUri: null,
    nutrition: {
      calories: 150,
      fat: '8g',
      protein: '8g',
      carbs: '12g',
      sugar: '12g',
      summary: 'Rich in calcium and vitamin D.',
    },
    cheaperAlternative: null,
  },
};

/**
 * Fetch product by barcode.
 * Returns product or null if not found.
 */
export async function fetchProductByBarcode(barcode: string): Promise<Product | null> {
  const raw = String(barcode ?? '');
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Hard ignore Expo/dev URL payloads if they slip through.
  if (trimmed.startsWith('exp://') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    // eslint-disable-next-line no-console
    console.log('[scan] Ignored URL-like barcode input:', trimmed);
    return null;
  }
  const noSpaces = trimmed.replace(/\s+/g, '');
  const digitsOnly = noSpaces.replace(/[^\d]/g, '');
  // Prefer digits-only when scanner returns URLs/QR payloads or mixed characters.
  const normalized =
    /[a-zA-Z]/.test(trimmed) || trimmed.includes('://')
      ? digitsOnly || trimmed
      : trimmed;
  // Debug logs (requested)
  // eslint-disable-next-line no-console
  console.log('[scan] Scanned barcode (raw):', raw);
  // eslint-disable-next-line no-console
  console.log('[scan] Searching barcode:', normalized);

  if (!normalized) return null;

  if (!USE_REAL_API) {
    await new Promise((r) => setTimeout(r, 600));
    const digits = normalized.replace(/\s+/g, '');
    const p = MOCK_PRODUCTS[digits] ?? MOCK_PRODUCTS[digits.replace(/\D/g, '')] ?? null;
    // eslint-disable-next-line no-console
    console.log('[scan] Product found (mock):', p?.id ?? null);
    return p;
  }

  try {
    const path = `/products/barcode/${encodeURIComponent(normalized)}`;
    const base = String(API_BASE_URL || '').replace(/\/$/, '');
    const cleanPath = String(path).replace(/^\//, '');
    const fullUrl = `${base}/${cleanPath}`;
    // 5) Verify backend route is called: log request URL and response
    // eslint-disable-next-line no-console
    console.log('[scan] Request URL:', fullUrl);

    const res = await apiFetch<{ product: any }>(path, {
      method: 'GET',
    });
    // eslint-disable-next-line no-console
    console.log('[scan] Backend response:', res);
    const data = res?.product;
    if (!data) return null;
    // eslint-disable-next-line no-console
    console.log('[scan] Product found:', data?.id ?? data?._id ?? null);
    return {
      id: String(data.id ?? data._id ?? data.barcode ?? normalized),
      barcode: String(data.barcode ?? normalized),
      name: String(data.name ?? 'Unknown'),
      brand: data.brand ?? undefined,
      price: Number(data.price ?? data.originalPrice ?? 0),
      originalPrice: typeof data.originalPrice === 'number' ? data.originalPrice : Number(data.originalPrice ?? undefined),
      hasDiscount: Boolean(data.hasDiscount),
      discountedPrice: typeof data.discountedPrice === 'number' ? data.discountedPrice : undefined,
      category: typeof data.category === 'string' ? data.category : undefined,
      stockQuantity: typeof data.stockQuantity === 'number' ? data.stockQuantity : undefined,
      unit: data.unit ?? undefined,
      imageUri: data.imageUri ?? data.imageUrl ?? null,
      nutrition: data.nutrition
        ? data.nutrition
        : data.nutritionInfo
          ? { summary: String(data.nutritionInfo) }
          : undefined,
      cheaperAlternative: data.cheaperAlternative ?? null,
    };
  } catch (e: any) {
    const msg = String(e?.message ?? 'Network error');
    // eslint-disable-next-line no-console
    console.log('[scan] Product lookup failed:', msg);
    if (msg.toLowerCase().includes('product not found')) {
      return null;
    }
    throw new Error(msg);
  }
}

/**
 * Mock-ready inventory decrement.
 * When USE_REAL_API is false, updates the in-memory mock product stock.
 */
export async function decrementMockStock(productId: string, by: number): Promise<Product | null> {
  const qty = Math.max(0, Math.floor(Number(by ?? 0)));
  if (!qty) return null;
  if (USE_REAL_API) return null;

  const entry = Object.values(MOCK_PRODUCTS).find((p) => p.id === productId);
  if (!entry) return null;
  const current = typeof entry.stockQuantity === 'number' ? entry.stockQuantity : 0;
  entry.stockQuantity = Math.max(0, current - qty);
  return entry;
}
