import { Response } from 'express';

export function respondSuccess(res: Response, data: unknown = {}): void {
  res.json({ success: true, data });
}

export function respondError(res: Response, message: string, code: number = 400): void {
  res.status(code).json({ success: false, error: message, code });
}
