import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { UserModel } from '../models/user.model';
import { PaymentModel } from '../models/payment.model';
import { generateToken } from '../utils/generateToken';

function isEmail(identifier: string) {
  return identifier.includes('@');
}

function sanitizeUser(u: any) {
  const obj = u.toObject ? u.toObject() : u;
  // remove passwordHash
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, __v, ...rest } = obj;
  rest.id = String(obj._id);
  delete rest._id;
  return rest;
}

export async function register(req: Request, res: Response) {
  const { firstName, lastName, mobileNumber, email, password } = req.body ?? {};

  if (!firstName || !lastName || !mobileNumber || !email || !password) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const normalizedMobile = String(mobileNumber).trim();

  const existingEmail = await UserModel.findOne({ email: normalizedEmail });
  if (existingEmail) return res.status(409).json({ message: 'Email already exists' });

  const existingMobile = await UserModel.findOne({ mobileNumber: normalizedMobile });
  if (existingMobile) return res.status(409).json({ message: 'Mobile number already exists' });

  const passwordHash = await bcrypt.hash(String(password), 10);
  const user = await UserModel.create({
    firstName: String(firstName).trim(),
    lastName: String(lastName).trim(),
    fullName: `${String(firstName).trim()} ${String(lastName).trim()}`.trim(),
    mobileNumber: normalizedMobile,
    email: normalizedEmail,
    passwordHash,
    role: 'USER',
    loyaltyPoints: 0,
    isActive: true,
  });

  const token = generateToken({ userId: String(user._id), role: 'USER' });
  return res.json({ token, user: sanitizeUser(user) });
}

export async function login(req: Request, res: Response) {
  const { identifier, password } = req.body ?? {};
  if (!identifier || !password) return res.status(400).json({ message: 'Identifier and password are required' });

  const id = String(identifier).trim();
  const pw = String(password);

  const user = isEmail(id)
    ? await UserModel.findOne({ email: id.toLowerCase() })
    : await UserModel.findOne({ mobileNumber: id });

  if (!user) return res.status(401).json({ message: 'Invalid credentials' });
  if (!user.isActive) return res.status(403).json({ message: 'Account is disabled' });

  const ok = await bcrypt.compare(pw, user.passwordHash);
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

  const token = generateToken({ userId: String(user._id), role: user.role ?? 'USER' });
  return res.json({ token, user: sanitizeUser(user) });
}

export async function me(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  const userObj = sanitizeUser(req.user) as Record<string, unknown>;
  const rawId = (req.user as { _id: Types.ObjectId | string })._id;
  const paymentUserId =
    rawId instanceof Types.ObjectId ? rawId : new Types.ObjectId(String(rawId));

  const completedOrdersCount = await PaymentModel.countDocuments({
    userId: paymentUserId,
    status: 'VERIFIED',
  });
  userObj.completedOrdersCount = completedOrdersCount;

  const rawCreated = (req.user as { createdAt?: Date }).createdAt;
  if (rawCreated) {
    userObj.createdAt = new Date(rawCreated).toISOString();
  }

  return res.json({ user: userObj });
}

export async function addLoyaltyPoints(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  const earnedPointsRaw = (req.body ?? {}).earnedPoints;
  const earnedPoints = Math.floor(Number(earnedPointsRaw ?? 0));
  if (!Number.isFinite(earnedPoints) || earnedPoints < 0) {
    return res.status(400).json({ message: 'Invalid earnedPoints' });
  }

  // If earnedPoints is 0, still return current user (idempotent, keeps client logic simple).
  const updated = await UserModel.findByIdAndUpdate(
    (req.user as any)._id,
    { $inc: { loyaltyPoints: earnedPoints } },
    { new: true },
  );

  if (!updated) return res.status(404).json({ message: 'User not found' });
  return res.json({ user: sanitizeUser(updated) });
}

