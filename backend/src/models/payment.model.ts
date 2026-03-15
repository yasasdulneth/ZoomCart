import { Schema, model, type InferSchemaType } from 'mongoose';

export type PaymentStatus = 'PENDING' | 'VERIFIED' | 'EXPIRED';

const CartItemSchema = new Schema(
  {
    productId: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
  },
  { _id: false },
);

const PaymentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    cartId: { type: Schema.Types.ObjectId, ref: 'Cart', required: false },
    items: { type: [CartItemSchema], required: false, default: [] },
    amount: { type: Number, required: true, min: 0 },
    /** Cart total before ZOOMPOINTS redemption (LKR). */
    subtotalAmount: { type: Number, required: false },
    /** Points redeemed toward this order (1 pt = 1 LKR off). */
    loyaltyPointsRedeemed: { type: Number, default: 0 },
    orderId: { type: String, required: true, unique: true, index: true },
    paymentMethod: { type: String, enum: ['qr', 'card'], default: 'qr' },
    stripePaymentIntentId: { type: String, required: false },
    status: { type: String, required: true, enum: ['PENDING', 'VERIFIED', 'EXPIRED'], default: 'PENDING' },
    expiresAt: { type: Date, required: false },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'Admin', required: false },
    verifiedAt: { type: Date, required: false },
    createdAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: false, versionKey: false },
);

export type PaymentDoc = InferSchemaType<typeof PaymentSchema> & { _id: any };

PaymentSchema.pre('validate', function () {
  if (this.isNew && !this.orderId) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.orderId = `ZC-${code}`;
  }
});

export const PaymentModel = model('Payment', PaymentSchema);

