import type { UserDoc } from '../models/user.model';
import type { AdminDoc } from '../models/admin.model';

declare global {
  namespace Express {
    interface Request {
      user?: UserDoc | null;
      tokenPayload?: { userId: string; role: string };
      admin?: AdminDoc | null;
      adminTokenPayload?: { adminId: string; role: string };
    }
  }
}

export {};

