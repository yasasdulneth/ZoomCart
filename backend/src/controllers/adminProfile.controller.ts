import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { AdminModel } from '../models/admin.model';
import { env } from '../config/env';

function sanitizeAdmin(a: any) {
  const obj = a.toObject ? a.toObject() : a;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, __v, ...rest } = obj;
  rest.id = String(obj._id);
  delete rest._id;
  return rest;
}

export async function getProfile(req: Request, res: Response) {
  if (!req.admin) return res.status(401).json({ message: 'Unauthorized' });
  return res.json({ admin: sanitizeAdmin(req.admin) });
}

export async function updateProfile(req: Request, res: Response) {
  if (!req.admin) return res.status(401).json({ message: 'Unauthorized' });
  const { fullName, email } = req.body ?? {};

  const patch: any = {};
  if (fullName !== undefined) patch.fullName = String(fullName).trim();
  if (email !== undefined) patch.email = String(email).toLowerCase().trim();

  try {
    const admin = await AdminModel.findByIdAndUpdate(req.admin._id, patch, { new: true });
    if (!admin) return res.status(404).json({ message: 'Admin not found' });
    return res.json({ admin: sanitizeAdmin(admin) });
  } catch (err: any) {
    if (err?.code === 11000) return res.status(409).json({ message: 'Email already exists' });
    throw err;
  }
}

export async function changePassword(req: Request, res: Response) {
  if (!req.admin) return res.status(401).json({ message: 'Unauthorized' });
  const { currentPassword, newPassword } = req.body ?? {};
  if (!currentPassword || !newPassword) return res.status(400).json({ message: 'Missing required fields' });
  if (String(newPassword).length < 8) return res.status(400).json({ message: 'New password too short' });

  const admin = await AdminModel.findById(req.admin._id).select('+passwordHash');
  if (!admin) return res.status(404).json({ message: 'Admin not found' });

  const ok = await bcrypt.compare(String(currentPassword), admin.passwordHash);
  if (!ok) return res.status(400).json({ message: 'Current password is incorrect' });

  admin.passwordHash = await bcrypt.hash(String(newPassword), env.bcryptSaltRounds);
  await admin.save();

  return res.json({ message: 'Password updated' });
}

