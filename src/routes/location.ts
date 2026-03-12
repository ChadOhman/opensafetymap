import { Router } from 'express';
import { respondSuccess } from '../helpers/response.js';
import { rateLimit } from '../middleware/rateLimiter.js';

export const locationRoutes = Router();

locationRoutes.get('/ip', rateLimit('public_read', 120, 60), async (_req, res) => {
  // IP geolocation — returns nulls (MaxMind GeoIP not implemented in Node version)
  respondSuccess(res, {
    latitude: null,
    longitude: null,
    city: null,
  });
});
