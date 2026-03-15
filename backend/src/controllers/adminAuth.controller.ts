import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { AdminModel, type AdminRole } from '../models/admin.model';
import { env } from '../config/env';
import { generateAdminToken } from '../utils/generateAdminToken';

function sanitizeAdmin(a: any) {
  const obj = a.toObject ? a.toObject() : a;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, __v, ...rest } = obj;
  rest.id = String(obj._id);
  delete rest._id;
  return rest;
}

export async function registerAdmin(req: Request, res: Response) {
  const { fullName, email, password, role } = req.body ?? {};

  if (!fullName || !email || !password) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  if (String(password).length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });
  const finalRole = role === 'SUPER_ADMIN' || role === 'STAFF' ? (role as AdminRole) : null;
  if (!finalRole) return res.status(400).json({ message: 'Invalid role' });

  const normalizedEmail = String(email).toLowerCase().trim();
  const exists = await AdminModel.findOne({ email: normalizedEmail });
  if (exists) return res.status(409).json({ message: 'Email already exists' });

  const passwordHash = await bcrypt.hash(String(password), env.bcryptSaltRounds);
  const admin = await AdminModel.create({
    fullName: String(fullName).trim(),
    email: normalizedEmail,
    passwordHash,
    role: finalRole,
    isActive: true,
  });

  return res.status(201).json({ admin: sanitizeAdmin(admin) });
}

export async function loginAdmin(req: Request, res: Response) {
  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

  const normalizedEmail = String(email).toLowerCase().trim();
  const admin = await AdminModel.findOne({ email: normalizedEmail }).select('+passwordHash');
  if (!admin) return res.status(401).json({ message: 'Invalid credentials' });
  if (!admin.isActive) return res.status(403).json({ message: 'Account is disabled' });

  const ok = await bcrypt.compare(String(password), admin.passwordHash);
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

  const token = generateAdminToken({ adminId: String(admin._id), role: String(admin.role ?? 'STAFF') });
  return res.json({ token, admin: sanitizeAdmin(admin) });
}

export async function meAdmin(req: Request, res: Response) {
  if (!req.admin) return res.status(401).json({ message: 'Unauthorized' });
  return res.json({ admin: sanitizeAdmin(req.admin) });
}

export async function logoutAdmin(_req: Request, res: Response) {
  return res.json({ message: 'Logged out. Clear token on client.' });
}

/**
 * Bootstrap endpoint to create the FIRST SUPER_ADMIN via the website.
 * - Works ONLY when there are zero SUPER_ADMIN accounts.
 * - Protected by ADMIN_BOOTSTRAP_SECRET (send header `x-admin-bootstrap-secret`).
 */
export async function bootstrapSuperAdmin(req: Request, res: Response) {
  if (!env.adminBootstrapSecret) {
    return res.status(500).json({ message: 'ADMIN_BOOTSTRAP_SECRET is not set on the server.' });
  }

  const secret = String(req.headers['x-admin-bootstrap-secret'] ?? '');
  if (!secret || secret !== env.adminBootstrapSecret) {
    return res.status(403).json({ message: 'Invalid bootstrap secret.' });
  }

  const existing = await AdminModel.exists({ role: 'SUPER_ADMIN' });
  if (existing) {
    return res.status(409).json({ message: 'A SUPER_ADMIN already exists. Bootstrap disabled.' });
  }

  const { fullName, email, password } = req.body ?? {};
  if (!fullName || !email || !password) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  if (String(password).length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });

  const normalizedEmail = String(email).toLowerCase().trim();
  const exists = await AdminModel.findOne({ email: normalizedEmail });
  if (exists) return res.status(409).json({ message: 'Email already exists' });

  const passwordHash = await bcrypt.hash(String(password), env.bcryptSaltRounds);
  const admin = await AdminModel.create({
    fullName: String(fullName).trim(),
    email: normalizedEmail,
    passwordHash,
    role: 'SUPER_ADMIN',
    isActive: true,
  });

  const token = generateAdminToken({ adminId: String(admin._id), role: 'SUPER_ADMIN' });
  return res.status(201).json({ token, admin: sanitizeAdmin(admin) });
}

