import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UserModel } from '../models/user.model';

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Missing Authorization Bearer token' });
    }

    const token = header.slice('Bearer '.length).trim();
    const payload = jwt.verify(token, env.jwtSecret) as any;
    const userId = String(payload.userId ?? '');
    if (!userId) return res.status(401).json({ message: 'Invalid token' });

    req.tokenPayload = { userId, role: String(payload.role ?? 'USER') };
    req.user = await UserModel.findById(userId);
    if (!req.user) return res.status(401).json({ message: 'User not found' });

    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

