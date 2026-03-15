import { Schema, model, type InferSchemaType } from 'mongoose';

const UserSchema = new Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    fullName: { type: String, trim: true },
    mobileNumber: { type: String, required: true, trim: true, unique: true, index: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, default: 'USER', enum: ['USER'] },
    loyaltyPoints: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);

UserSchema.pre('save', function () {
  if (!this.fullName) {
    this.fullName = `${this.firstName} ${this.lastName}`.trim();
  }
});

export type UserDoc = InferSchemaType<typeof UserSchema> & { _id: any };
export const UserModel = model('User', UserSchema);

