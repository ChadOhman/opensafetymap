import { Router } from 'express';
import { respondSuccess, respondError } from '../helpers/response.js';
import { getCurrentUser, requireActiveUser, requireCsrf, csrfToken, createAuthToken } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimiter.js';
import { verifyOAuthToken, handleOAuthLogin } from '../services/oauthService.js';
import { query, execute } from '../helpers/db.js';

export const authRoutes = Router();

// GET /api/auth/csrf
authRoutes.get('/csrf', (req, res) => {
  respondSuccess(res, { csrf_token: csrfToken(req) });
});

// GET /api/auth/session
authRoutes.get('/session', async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) {
    respondError(res, 'Not authenticated', 401);
    return;
  }
  respondSuccess(res, {
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
  });
});

// POST /api/auth/logout
authRoutes.post('/logout', async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  if (bearerMatch) {
    await execute('DELETE FROM auth_tokens WHERE token = ?', [bearerMatch[1]]);
  }
  req.session.destroy(() => {});
  respondSuccess(res, { message: 'Logged out' });
});

// GET /api/auth/tokens — list active tokens
authRoutes.get('/tokens', requireActiveUser, async (req, res) => {
  const tokens = await query(
    `SELECT id, device_name, created_at, expires_at
     FROM auth_tokens WHERE user_id = ? AND expires_at > NOW()
     ORDER BY created_at DESC`,
    [req.currentUser!.id]
  );
  respondSuccess(res, tokens);
});

// POST /api/auth/tokens — create new token
authRoutes.post('/tokens', requireActiveUser, requireCsrf, async (req, res) => {
  const deviceName = req.body?.device_name || req.headers['user-agent'] || 'Unknown';
  const token = await createAuthToken(req.currentUser!.id, deviceName);
  respondSuccess(res, { token });
});

// DELETE /api/auth/tokens — revoke token by id
authRoutes.delete('/tokens', requireActiveUser, requireCsrf, async (req, res) => {
  const tokenId = parseInt(req.query.id as string, 10);
  if (!tokenId) {
    respondError(res, 'Token ID required', 400);
    return;
  }
  await execute('DELETE FROM auth_tokens WHERE id = ? AND user_id = ?', [tokenId, req.currentUser!.id]);
  respondSuccess(res, { message: 'Token revoked' });
});

// OAuth endpoints — all POST, rate limited
const oauthRateLimit = rateLimit('auth', 10, 600);

authRoutes.post('/google', oauthRateLimit, async (req, res) => {
  const idToken = req.body?.id_token;
  if (!idToken) { respondError(res, 'id_token required', 400); return; }
  try {
    const verified = await verifyOAuthToken('google', idToken);
    const result = await handleOAuthLogin('google', verified.oauthId, verified.name, verified.email, req);
    respondSuccess(res, result);
  } catch (e: any) {
    respondError(res, `Authentication failed: ${e.message}`, 401);
  }
});

authRoutes.post('/apple', oauthRateLimit, async (req, res) => {
  const idToken = req.body?.id_token;
  if (!idToken) { respondError(res, 'id_token required', 400); return; }
  try {
    const verified = await verifyOAuthToken('apple', idToken);
    const result = await handleOAuthLogin('apple', verified.oauthId, verified.name, verified.email, req);
    respondSuccess(res, result);
  } catch (e: any) {
    respondError(res, `Authentication failed: ${e.message}`, 401);
  }
});

authRoutes.post('/mastodon', oauthRateLimit, async (req, res) => {
  const accessToken = req.body?.access_token;
  const instance = req.body?.instance;
  if (!accessToken) { respondError(res, 'access_token required', 400); return; }
  const token = instance ? `${instance}|${accessToken}` : accessToken;
  try {
    const verified = await verifyOAuthToken('mastodon', token);
    const result = await handleOAuthLogin('mastodon', verified.oauthId, verified.name, verified.email, req);
    respondSuccess(res, result);
  } catch (e: any) {
    respondError(res, `Authentication failed: ${e.message}`, 401);
  }
});

authRoutes.post('/bluesky', oauthRateLimit, async (req, res) => {
  const accessToken = req.body?.access_token;
  if (!accessToken) { respondError(res, 'access_token required', 400); return; }
  try {
    const verified = await verifyOAuthToken('bluesky', accessToken);
    const result = await handleOAuthLogin('bluesky', verified.oauthId, verified.name, verified.email, req);
    respondSuccess(res, result);
  } catch (e: any) {
    respondError(res, `Authentication failed: ${e.message}`, 401);
  }
});
