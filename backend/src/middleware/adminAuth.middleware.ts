import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AdminModel } from '../models/admin.model';

export async function adminAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Missing Authorization Bearer token' });
    }

    const token = header.slice('Bearer '.length).trim();
    const payload = jwt.verify(token, env.jwtSecret) as any;

    if (payload?.kind !== 'ADMIN') return res.status(403).json({ message: 'Not an admin token' });

    const adminId = String(payload.adminId ?? '');
    if (!adminId) return res.status(401).json({ message: 'Invalid token' });

    req.adminTokenPayload = { adminId, role: String(payload.role ?? 'STAFF') };
    req.admin = await AdminModel.findById(adminId);
    if (!req.admin) return res.status(401).json({ message: 'Admin not found' });
    if (!req.admin.isActive) return res.status(403).json({ message: 'Admin account is disabled' });

    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

