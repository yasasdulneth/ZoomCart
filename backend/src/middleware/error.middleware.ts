import type { NextFunction, Request, Response } from 'express';

export function errorMiddleware(err: any, _req: Request, res: Response, _next: NextFunction) {
  // eslint-disable-next-line no-console
  console.error('[error]', err);
  const status = typeof err?.status === 'number' ? err.status : 500;
  const message = typeof err?.message === 'string' ? err.message : 'Internal Server Error';
  res.status(status).json({ message });
}

