import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { PaymentModel } from '../models/payment.model';
import { UserModel } from '../models/user.model';
import { env } from '../config/env';
import Stripe from 'stripe';
import { applyVerifiedPaymentLoyalty } from '../services/userPaymentLoyalty.service';

function getStripe(): InstanceType<typeof Stripe> {
  const key = env.stripeSecretKey?.trim();
  if (!key) {
    throw Object.assign(new Error('Stripe is not configured'), { code: 'STRIPE_NOT_CONFIGURED' });
  }
  return new Stripe(key);
}

async function retrievePaymentIntent(stripe: InstanceType<typeof Stripe>, id: string) {
  let intent = await stripe.paymentIntents.retrieve(id);
  const waitMs = [400, 700, 1100, 1500];
  for (let i = 0; i < waitMs.length && intent.status === 'processing'; i++) {
    await new Promise((r) => setTimeout(r, waitMs[i]));
    intent = await stripe.paymentIntents.retrieve(id);
  }
  return intent;
}

function rawUserIdFromPayment(payment: { userId: unknown }): unknown {
  const u = payment.userId as { _id?: unknown } | null;
  if (u && typeof u === 'object' && u._id != null) return u._id;
  return payment.userId;
}

const PAYMENT_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

function roundMoney(n: number): number {
  return Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
}

export async function createPayment(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  const b = req.body ?? {};
  const cartItems: Array<{ productId: string; name: string; price: number; quantity: number }> =
    Array.isArray(b.cartItems) ? b.cartItems : [];
  const totalAmountRaw = Number(b.totalAmount ?? 0);
  const paymentMethod = b.paymentMethod === 'card' ? 'card' : 'qr';
  const loyaltyPointsRedeemed = Math.max(0, Math.floor(Number(b.loyaltyPointsRedeemed ?? 0)));

  if (!cartItems.length) return res.status(400).json({ message: 'cartItems is required' });

  const subtotal = roundMoney(
    cartItems.reduce((s, i) => s + Number(i.price) * Number(i.quantity), 0),
  );
  if (!Number.isFinite(subtotal) || subtotal <= 0) {
    return res.status(400).json({ message: 'Invalid cart total' });
  }

  const userId = (req.user as any)._id;
  const user = await UserModel.findById(userId).select('loyaltyPoints').lean();
  const balance = Math.max(0, Math.floor(Number((user as any)?.loyaltyPoints ?? 0)));
  const maxRedeem = Math.min(balance, Math.floor(subtotal));
  if (loyaltyPointsRedeemed > maxRedeem) {
    return res.status(400).json({
      message: 'Invalid ZOOMPOINTS redemption for this order',
      maxRedeemable: maxRedeem,
    });
  }

  const payable = roundMoney(subtotal - loyaltyPointsRedeemed);
  if (payable < 0) return res.status(400).json({ message: 'Invalid payable amount' });

  const totalAmount = roundMoney(totalAmountRaw);
  if (Math.abs(totalAmount - payable) > 0.02) {
    return res.status(400).json({ message: 'Amount mismatch with redemption' });
  }

  if (paymentMethod === 'card' && payable > 0 && !env.stripeSecretKey?.trim()) {
    return res.status(500).json({ message: 'Stripe is not configured on the server' });
  }

  const expiresAt = new Date(Date.now() + PAYMENT_EXPIRY_MS);

  let stripePaymentIntentId: string | undefined;
  let clientSecret: string | undefined;

  if (paymentMethod === 'card' && payable > 0) {
    const stripe = getStripe();
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(payable * 100),
      currency: 'lkr',
      metadata: { userId: String(userId) },
      automatic_payment_methods: { enabled: true },
    });
    stripePaymentIntentId = intent.id;
    clientSecret = intent.client_secret || undefined;
  }

  const payment = await PaymentModel.create({
    userId,
    amount: payable,
    subtotalAmount: subtotal,
    loyaltyPointsRedeemed,
    paymentMethod,
    stripePaymentIntentId,
    status: 'PENDING',
    expiresAt,
    items: cartItems,
  });

  const paymentId = String((payment as any)._id);

  const token = jwt.sign(
    { paymentId, amount: payable, exp: Math.floor(expiresAt.getTime() / 1000) },
    env.jwtSecret,
  );

  return res.status(201).json({
    paymentId,
    token,
    expiresAt: expiresAt.getTime(),
    clientSecret,
    subtotalAmount: subtotal,
    loyaltyPointsRedeemed,
    payableAmount: payable,
  });
}

export async function getPaymentStatus(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  const payment = await PaymentModel.findById(req.params.id).populate('userId', 'firstName lastName fullName email mobileNumber');
  if (!payment) return res.status(404).json({ message: 'Payment not found' });

  // Auto-expire if past expiry
  if (
    payment.status === 'PENDING' &&
    (payment as any).expiresAt &&
    Date.now() > new Date((payment as any).expiresAt).getTime()
  ) {
    payment.status = 'EXPIRED';
    await payment.save();
  }

  return res.json({
    paymentId: String((payment as any)._id),
    orderId: (payment as any).orderId,
    status: payment.status,
    verifiedAt: (payment as any).verifiedAt ?? null,
    amount: payment.amount,
    subtotalAmount: (payment as any).subtotalAmount ?? payment.amount,
    loyaltyPointsRedeemed: (payment as any).loyaltyPointsRedeemed ?? 0,
    customer: (payment as any).userId ? {
      name: (payment as any).userId.fullName || `${(payment as any).userId.firstName} ${(payment as any).userId.lastName}`,
      email: (payment as any).userId.email,
      phone: (payment as any).userId.mobileNumber,
    } : null,
  });
}

export async function verifyStripePayment(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  const payment = await PaymentModel.findById(req.params.id).populate('userId', 'firstName lastName fullName email mobileNumber');
  if (!payment) return res.status(404).json({ message: 'Payment not found' });
  
  if (payment.status === 'VERIFIED') {
    return res.json({ success: true, status: 'VERIFIED' });
  }

  if (payment.paymentMethod !== 'card' || !payment.stripePaymentIntentId) {
    return res.status(400).json({ message: 'Not a Stripe card payment' });
  }

  try {
    const stripe = getStripe();
    const intent = await retrievePaymentIntent(stripe, payment.stripePaymentIntentId);
    if (intent.status === 'succeeded') {
      payment.status = 'VERIFIED';
      (payment as any).verifiedAt = new Date();
      await payment.save();
      await applyVerifiedPaymentLoyalty({
        userId: rawUserIdFromPayment(payment as { userId: unknown }),
        amount: payment.amount,
        loyaltyPointsRedeemed: (payment as any).loyaltyPointsRedeemed ?? 0,
      });
      return res.json({
        success: true,
        status: 'VERIFIED',
        orderId: (payment as any).orderId,
        customer: (payment as any).userId ? {
          name: (payment as any).userId.fullName || `${(payment as any).userId.firstName} ${(payment as any).userId.lastName}`,
          email: (payment as any).userId.email,
          phone: (payment as any).userId.mobileNumber,
        } : null,
      });
    } else {
      return res.json({
        success: false,
        status: payment.status,
        stripeStatus: intent.status,
        message: `Payment not completed (${intent.status}).`,
      });
    }
  } catch (error: unknown) {
    const e = error as { message?: string; code?: string; type?: string };
    const detail = e?.message ?? String(error);
    const code = e?.code ?? e?.type;
    return res.status(500).json({
      message: 'Failed to verify payment with Stripe',
      detail,
      code,
    });
  }
}

/** Fully covered by ZOOMPOINTS (payable LKR 0). Marks verified and applies loyalty adjustments. */
export async function completeZeroPayment(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  const payment = await PaymentModel.findById(req.params.id).populate(
    'userId',
    'firstName lastName fullName email mobileNumber',
  );
  if (!payment) return res.status(404).json({ message: 'Payment not found' });

  const reqUid = String((req.user as any)._id);
  const ownerId = String(rawUserIdFromPayment(payment as { userId: unknown }));
  if (ownerId !== reqUid) return res.status(403).json({ message: 'Forbidden' });

  if (payment.status !== 'PENDING') {
    return res.status(400).json({ message: 'Payment is not pending' });
  }
  if (payment.amount > 0.009) {
    return res.status(400).json({ message: 'This payment must be completed with card or in-store QR' });
  }

  payment.status = 'VERIFIED';
  (payment as any).verifiedAt = new Date();
  await payment.save();

  await applyVerifiedPaymentLoyalty({
    userId: rawUserIdFromPayment(payment as { userId: unknown }),
    amount: payment.amount,
    loyaltyPointsRedeemed: (payment as any).loyaltyPointsRedeemed ?? 0,
  });

  const p = payment as any;
  const u = p.userId;
  return res.json({
    success: true,
    status: 'VERIFIED',
    paymentId: String(p._id),
    orderId: p.orderId,
    amount: p.amount,
    subtotalAmount: p.subtotalAmount ?? p.amount,
    loyaltyPointsRedeemed: p.loyaltyPointsRedeemed ?? 0,
    customer: u
      ? {
          name: u.fullName || `${u.firstName} ${u.lastName}`,
          email: u.email,
          phone: u.mobileNumber,
        }
      : null,
  });
}
