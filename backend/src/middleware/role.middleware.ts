import type { NextFunction, Request, Response } from 'express';
import type { AdminRole } from '../models/admin.model';

export function restrictTo(...roles: AdminRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const adminRole = req.adminTokenPayload?.role;
    if (!req.admin || !adminRole) return res.status(401).json({ message: 'Admin authentication required' });
    if (!roles.includes(adminRole as AdminRole)) return res.status(403).json({ message: 'Insufficient permissions' });
    return next();
  };
}

