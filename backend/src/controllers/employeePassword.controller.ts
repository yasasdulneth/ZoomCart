import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { AdminModel } from '../models/admin.model';
import { env } from '../config/env';

export async function updateEmployeePassword(req: Request, res: Response) {
  const { password } = req.body ?? {};
  if (!password) return res.status(400).json({ message: 'password is required' });
  if (String(password).length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });

  const passwordHash = await bcrypt.hash(String(password), env.bcryptSaltRounds);
  const admin = await AdminModel.findByIdAndUpdate(req.params.id, { passwordHash }, { new: true });
  if (!admin) return res.status(404).json({ message: 'Employee not found' });
  return res.json({ message: 'Password updated' });
}

