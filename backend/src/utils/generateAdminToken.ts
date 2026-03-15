import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export function generateAdminToken(payload: { adminId: string; role: string }) {
  return jwt.sign({ ...payload, kind: 'ADMIN' }, env.jwtSecret, { expiresIn: env.jwtExpiresIn as any } as any);
}

