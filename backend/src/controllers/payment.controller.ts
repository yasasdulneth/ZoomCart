import type { Request, Response } from 'express';
import { PaymentModel } from '../models/payment.model';
import { ProductModel } from '../models/product.model';
import { notifyLowStock } from '../utils/lowStockNotify';
import { applyVerifiedPaymentLoyalty } from '../services/userPaymentLoyalty.service';

export async function listPayments(_req: Request, res: Response) {
  const payments = await PaymentModel.find().sort({ createdAt: -1 });
  return res.json({ payments });
}

export async function getPaymentById(req: Request, res: Response) {
  const payment = await PaymentModel.findById(req.params.id);
  if (!payment) return res.status(404).json({ message: 'Payment not found' });
  return res.json({ payment });
}

export async function deletePayment(req: Request, res: Response) {
  try {
    const payment = await PaymentModel.findByIdAndDelete(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    return res.json({ message: 'Payment deleted' });
  } catch {
    return res.status(500).json({ message: 'Failed to delete payment' });
  }
}

export async function verifyPayment(req: Request, res: Response) {
  if (!req.admin) return res.status(401).json({ message: 'Unauthorized' });

  const payment = await PaymentModel.findById(req.params.id);
  if (!payment) return res.status(404).json({ message: 'Payment not found' });

  if (payment.status !== 'VERIFIED') {
    // 1. Mark as verified
    payment.status = 'VERIFIED';
    (payment as any).verifiedBy = req.admin._id;
    (payment as any).verifiedAt = new Date();
    await payment.save();

    // 2. Decrement inventory for each item
    if (payment.items && payment.items.length > 0) {
      for (const item of payment.items) {
        try {
          const product = await ProductModel.findByIdAndUpdate(
            item.productId,
            { $inc: { stockQuantity: -item.quantity } },
            { new: true },
          );

          if (product) {
            // Check for low stock and notify if needed
            await notifyLowStock({ product }).catch(() => {});
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error(`Failed to decrement stock for product ${item.productId}:`, err);
        }
      }
    }

    // 3. ZOOMPOINTS: subtract redeemed, then award earned on amount paid (1 pt / LKR 100)
    await applyVerifiedPaymentLoyalty({
      userId: payment.userId,
      amount: payment.amount,
      loyaltyPointsRedeemed: (payment as any).loyaltyPointsRedeemed ?? 0,
    });
  }

  return res.json({ payment });
}

