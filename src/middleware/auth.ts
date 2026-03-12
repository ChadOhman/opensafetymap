import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { queryOne, execute } from '../helpers/db.js';
import { respondError } from '../helpers/response.js';
import type { User, AuthToken } from '../helpers/types.js';

export async function getCurrentUser(req: Request): Promise<User | null> {
  // Check Bearer token first
  const authHeader = req.headers.authorization || '';
  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  if (bearerMatch) {
    const token = bearerMatch[1];
    const user = await queryOne<User>(
      `SELECT u.* FROM auth_tokens t
       JOIN users u ON t.user_id = u.id
       WHERE t.token = ? AND t.expires_at > NOW()`,
      [token]
    );
    if (user) {
      req.authMethod = 'token';
      req.currentUser = user;
      return user;
    }
  }

  // Fall back to session
  if (req.session?.userId) {
    const user = await queryOne<User>(
      'SELECT * FROM users WHERE id = ?',
      [req.session.userId]
    );
    if (user) {
      req.authMethod = 'session';
      req.currentUser = user;
      return user;
    }
  }

  req.authMethod = null;
  req.currentUser = null;
  return null;
}

export async function requireActiveUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  const user = await getCurrentUser(req);
  if (!user || user.status === 'banned') {
    respondError(res, 'Unauthorized', 401);
    return;
  }
  next();
}

export function requireRole(role: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = await getCurrentUser(req);
    if (!user || user.status === 'banned') {
      respondError(res, 'Unauthorized', 401);
      return;
    }
    const roles: Record<string, number> = { user: 1, moderator: 2, admin: 3 };
    const userRole = user.role || 'user';
    if (!roles[userRole] || roles[userRole] < roles[role]) {
      respondError(res, 'Forbidden', 403);
      return;
    }
    next();
  };
}

export function csrfToken(req: Request): string {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  return req.session.csrfToken;
}

export function requireCsrf(req: Request, res: Response, next: NextFunction): void {
  // Token-based auth is immune to CSRF
  if (req.authMethod === 'token') {
    next();
    return;
  }
  const token = req.headers['x-csrf-token'] as string || req.body?.csrf_token;
  if (!token || !req.session.csrfToken || !crypto.timingSafeEqual(
    Buffer.from(token),
    Buffer.from(req.session.csrfToken)
  )) {
    respondError(res, 'Invalid CSRF token', 403);
    return;
  }
  next();
}

export async function createAuthToken(userId: number, deviceName?: string, expiresDays: number = 30): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 19).replace('T', ' ');
  await execute(
    'INSERT INTO auth_tokens (user_id, token, device_name, expires_at) VALUES (?, ?, ?, ?)',
    [userId, token, deviceName || null, expiresAt]
  );
  return token;
}
