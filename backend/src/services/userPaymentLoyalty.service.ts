import { UserModel } from '../models/user.model';

/** After payment is VERIFIED: subtract redeemed ZOOMPOINTS, then award earned points on amount paid (LKR). */
export async function applyVerifiedPaymentLoyalty(payment: {
  userId: unknown;
  amount: number;
  loyaltyPointsRedeemed?: number;
}): Promise<void> {
  const uid = payment.userId;
  const redeemed = Math.max(0, Math.floor(Number(payment.loyaltyPointsRedeemed ?? 0)));
  if (redeemed > 0) {
    await UserModel.findByIdAndUpdate(uid, { $inc: { loyaltyPoints: -redeemed } });
  }
  const earned = Math.floor(Number(payment.amount ?? 0) / 100);
  if (earned > 0) {
    await UserModel.findByIdAndUpdate(uid, { $inc: { loyaltyPoints: earned } });
  }
}
