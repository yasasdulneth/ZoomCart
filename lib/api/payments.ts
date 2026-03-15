/**
 * Payments API.
 * POST /api/payments/create   — create a payment, returns QR token
 * GET  /api/payments/status/:id — poll payment status
 */

import { apiFetch } from './client';

export type PaymentStatus = 'PENDING' | 'VERIFIED' | 'EXPIRED';

export interface CreatePaymentRequestBody {
  cartItems: Array<{
    productId: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  /** Amount to settle (after ZOOMPOINTS redemption), in LKR. */
  totalAmount: number;
  paymentMethod: 'qr' | 'card';
  /** Points redeemed toward this order (1 pt = 1 LKR off). */
  loyaltyPointsRedeemed?: number;
}

export interface CreatePaymentResponse {
  paymentId: string;
  token: string;
  expiresAt: number; // unix ms
  clientSecret?: string;
  subtotalAmount?: number;
  loyaltyPointsRedeemed?: number;
  payableAmount?: number;
}

export interface PaymentStatusResponse {
  paymentId: string;
  orderId: string;
  status: PaymentStatus;
  verifiedAt?: number | null;
  /** Payable amount (LKR) stored on the payment. */
  amount?: number;
  subtotalAmount?: number;
  loyaltyPointsRedeemed?: number;
  customer?: {
    name: string;
    email: string;
    phone: string;
  } | null;
}

export interface VerifyStripeResponse {
  success: boolean;
  status: string;
  orderId?: string;
  customer?: {
    name: string;
    email: string;
    phone: string;
  } | null;
  stripeStatus?: string;
  message?: string;
}

export interface PaymentItemInput {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface CompleteZeroPaymentResponse {
  success: boolean;
  status: string;
  paymentId: string;
  orderId: string;
  amount: number;
  subtotalAmount: number;
  loyaltyPointsRedeemed: number;
  customer: {
    name: string;
    email: string;
    phone: string;
  } | null;
}

// ─── helpers ────────────────────────────────────────────────────────────────

function toBody(
  items: PaymentItemInput[],
  totalAmount: number,
  paymentMethod: 'qr' | 'card',
  loyaltyPointsRedeemed?: number,
): CreatePaymentRequestBody {
  return {
    cartItems: items.map((i) => ({
      productId: i.id,
      name: i.name,
      price: i.price,
      quantity: i.quantity,
    })),
    totalAmount,
    paymentMethod,
    loyaltyPointsRedeemed: loyaltyPointsRedeemed ?? 0,
  };
}

// ─── API calls ──────────────────────────────────────────────────────────────

export async function createPaymentFromItems(
  items: PaymentItemInput[],
  totalAmount: number,
  paymentMethod: 'qr' | 'card' = 'qr',
  options?: { loyaltyPointsRedeemed?: number },
): Promise<CreatePaymentResponse> {
  const body = toBody(items, totalAmount, paymentMethod, options?.loyaltyPointsRedeemed);
  return apiFetch<CreatePaymentResponse>('/payments/create', {
    method: 'POST',
    json: body,
  });
}

export async function fetchPaymentStatus(paymentId: string): Promise<PaymentStatusResponse> {
  if (!paymentId) throw new Error('Missing paymentId');
  return apiFetch<PaymentStatusResponse>(`/payments/status/${encodeURIComponent(paymentId)}`, {
    method: 'GET',
  });
}

export async function verifyStripePayment(paymentId: string): Promise<VerifyStripeResponse> {
  if (!paymentId) throw new Error('Missing paymentId');
  return apiFetch<VerifyStripeResponse>(`/payments/verify-stripe/${encodeURIComponent(paymentId)}`, {
    method: 'POST',
  });
}

export async function completeZeroPayment(paymentId: string): Promise<CompleteZeroPaymentResponse> {
  if (!paymentId) throw new Error('Missing paymentId');
  return apiFetch<CompleteZeroPaymentResponse>(
    `/payments/complete-zero/${encodeURIComponent(paymentId)}`,
    { method: 'POST' },
  );
}
