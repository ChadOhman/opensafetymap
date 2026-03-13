import { Request, Response, NextFunction } from 'express';
import { queryOne, execute, pool } from '../helpers/db.js';
import { respondError } from '../helpers/response.js';
import type { RateLimit } from '../helpers/types.js';

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',');
    return ips[0].trim();
  }
  return req.ip || '0.0.0.0';
}

export function rateLimit(endpointGroup: string, maxRequests: number, windowSeconds: number) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const ip = getClientIp(req);

    // Probabilistic pruning (5% chance)
    if (Math.random() < 0.05) {
      await pool.execute('DELETE FROM rate_limits WHERE window_start < DATE_SUB(NOW(), INTERVAL 1 HOUR)');
    }

    const row = await queryOne<RateLimit>(
      'SELECT request_count, window_start FROM rate_limits WHERE ip_address = ? AND endpoint_group = ?',
      [ip, endpointGroup]
    );

    let effectiveMax = maxRequests;
    const isAuthenticated = !!req.session?.userId || !!req.headers.authorization;
    if (endpointGroup === 'public_read' && isAuthenticated) {
      effectiveMax = Math.floor(maxRequests * 2.5);
    }

    if (row) {
      const windowStart = new Date(row.window_start).getTime();
      const elapsed = (Date.now() - windowStart) / 1000;

      if (elapsed < windowSeconds) {
        if (row.request_count >= effectiveMax) {
          const retryAfter = Math.ceil(windowSeconds - elapsed);
          res.setHeader('Retry-After', String(retryAfter));
          respondError(res, 'Too many requests. Please wait.', 429);
          return;
        }
        await execute(
          'UPDATE rate_limits SET request_count = request_count + 1 WHERE ip_address = ? AND endpoint_group = ?',
          [ip, endpointGroup]
        );
      } else {
        await execute(
          'UPDATE rate_limits SET request_count = 1, window_start = NOW() WHERE ip_address = ? AND endpoint_group = ?',
          [ip, endpointGroup]
        );
      }
    } else {
      await execute(
        'INSERT INTO rate_limits (ip_address, endpoint_group, request_count, window_start) VALUES (?, ?, 1, NOW())',
        [ip, endpointGroup]
      );
    }

    next();
  };
}
