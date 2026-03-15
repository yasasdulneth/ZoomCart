import { Schema, model, type InferSchemaType } from 'mongoose';

export type AdminRole = 'SUPER_ADMIN' | 'STAFF';

const AdminSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, required: true, enum: ['SUPER_ADMIN', 'STAFF'], default: 'STAFF' },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, versionKey: false },
);

export type AdminDoc = InferSchemaType<typeof AdminSchema> & { _id: any };
export const AdminModel = model('Admin', AdminSchema);

