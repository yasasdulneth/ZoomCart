import type { Request, Response } from 'express';
import { AdminModel, type AdminRole } from '../models/admin.model';

function sanitizeAdmin(a: any) {
  const obj = a.toObject ? a.toObject() : a;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, __v, ...rest } = obj;
  rest.id = String(obj._id);
  delete rest._id;
  return rest;
}

export async function listEmployees(_req: Request, res: Response) {
  const admins = await AdminModel.find().sort({ createdAt: -1 });
  return res.json({ employees: admins.map(sanitizeAdmin) });
}

export async function getEmployeeById(req: Request, res: Response) {
  const admin = await AdminModel.findById(req.params.id);
  if (!admin) return res.status(404).json({ message: 'Employee not found' });
  return res.json({ employee: sanitizeAdmin(admin) });
}

export async function updateEmployee(req: Request, res: Response) {
  const { fullName, role, isActive } = req.body ?? {};

  const patch: any = {};
  if (fullName !== undefined) patch.fullName = String(fullName).trim();
  if (role !== undefined) {
    if (role !== 'SUPER_ADMIN' && role !== 'STAFF') return res.status(400).json({ message: 'Invalid role' });
    patch.role = role as AdminRole;
  }
  if (isActive !== undefined) patch.isActive = Boolean(isActive);

  const admin = await AdminModel.findByIdAndUpdate(req.params.id, patch, { new: true });
  if (!admin) return res.status(404).json({ message: 'Employee not found' });
  return res.json({ employee: sanitizeAdmin(admin) });
}

export async function deactivateEmployee(req: Request, res: Response) {
  const admin = await AdminModel.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!admin) return res.status(404).json({ message: 'Employee not found' });
  return res.json({ message: 'Employee deactivated', employee: sanitizeAdmin(admin) });
}

