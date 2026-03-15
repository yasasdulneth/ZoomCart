import { Schema, model, type InferSchemaType } from 'mongoose';

export type NotificationType = 'SYSTEM' | 'PAYMENT' | 'LOW_STOCK' | 'PRODUCT' | 'EMPLOYEE';
export type NotificationTargetAudience = 'STAFF' | 'APP_USER' | 'ALL_ADMINS' | 'ALL_USERS' | 'BROADCAST';

const NotificationSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type: { type: String, required: true, enum: ['SYSTEM', 'PAYMENT', 'LOW_STOCK', 'PRODUCT', 'EMPLOYEE'], index: true },
    targetAudience: {
      type: String,
      required: true,
      enum: ['STAFF', 'APP_USER', 'ALL_ADMINS', 'ALL_USERS', 'BROADCAST'],
      index: true,
    },
    targetUserId: { type: Schema.Types.ObjectId, ref: 'User', required: false, index: true },
    targetAdminId: { type: Schema.Types.ObjectId, ref: 'Admin', required: false, index: true },
    sentByAdminId: { type: Schema.Types.ObjectId, ref: 'Admin', required: false },
    // Optional metadata for automatic notifications (e.g., low-stock)
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: false, index: true },
    barcode: { type: String, required: false, trim: true, index: true },
    isRead: { type: Boolean, required: true, default: false, index: true },
    isActive: { type: Boolean, required: true, default: true, index: true },
    createdAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: false, versionKey: false },
);

export type NotificationDoc = InferSchemaType<typeof NotificationSchema> & { _id: any };
export const NotificationModel = model('Notification', NotificationSchema);

