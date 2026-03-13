import { Request, Response, NextFunction } from 'express';
import { respondError } from '../helpers/response.js';

export function checkHoneypot(req: Request, res: Response, next: NextFunction): void {
  if (req.body?.website) {
    respondError(res, 'Invalid request', 400);
    return;
  }
  next();
}
