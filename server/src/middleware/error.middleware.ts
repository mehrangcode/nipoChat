import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AuthError } from '../services/auth.service';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Validation failed.', details: err.flatten() });
    return;
  }
  if (err instanceof AuthError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  // Multer file-size errors, etc.
  const anyErr = err as { code?: string; message?: string };
  if (anyErr.code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({ error: 'File too large.' });
    return;
  }
  console.error('[error]', err);
  res.status(500).json({ error: 'Internal server error.' });
}
