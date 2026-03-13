import { Router } from 'express';
import { query, queryOne, execute } from '../helpers/db.js';
import { respondSuccess, respondError } from '../helpers/response.js';
import { getCurrentUser, requireActiveUser, requireRole, requireCsrf } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimiter.js';
import type { User } from '../helpers/types.js';

export const userRoutes = Router();

// GET /api/users/profile
userRoutes.get('/profile', rateLimit('public_read', 60, 60), async (req, res) => {
  const username = req.query.username as string;
  if (!username) { respondError(res, 'username required', 400); return; }

  const profile = await queryOne<any>(
    'SELECT id, username, name, role, privacy, status, created_at FROM users WHERE username = ?',
    [username]
  );
  if (!profile || profile.status === 'banned') { respondError(res, 'User not found', 404); return; }

  const viewer = await getCurrentUser(req);
  const isOwner = viewer && Number(viewer.id) === Number(profile.id);
  const isAdmin = viewer && (viewer.role === 'admin' || viewer.role === 'moderator');

  // Respect privacy
  if (profile.privacy === 'private' && !isOwner && !isAdmin) {
    respondSuccess(res, { username: profile.username, role: profile.role });
    return;
  }
  if (profile.privacy === 'logged-in' && !viewer) {
    respondSuccess(res, { username: profile.username, role: profile.role });
    return;
  }

  const countResult = await query<{ cnt: number }>(
    "SELECT COUNT(*) as cnt FROM reports WHERE user_id = ? AND status = 'approved'",
    [profile.id]
  );
  profile.report_count = countResult[0]?.cnt || 0;

  respondSuccess(res, profile);
});

// GET /api/users/reports — own reports
userRoutes.get('/reports', requireActiveUser, rateLimit('submit', 30, 60), async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const perPage = Math.min(50, Math.max(1, parseInt(req.query.per_page as string) || 20));
  const offset = (page - 1) * perPage;

  const countResult = await query<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM reports WHERE user_id = ?', [req.currentUser!.id]
  );
  const total = countResult[0]?.cnt || 0;

  const reports = await query(
    `SELECT r.*, rm.name AS reporter_mode, it.name AS incident_type, sl.name AS severity
     FROM reports r
     JOIN reporter_modes rm ON r.reporter_mode_id = rm.id
     JOIN incident_types it ON r.incident_type_id = it.id
     JOIN severity_levels sl ON r.severity_id = sl.id
     WHERE r.user_id = ?
     ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
    [req.currentUser!.id, perPage, offset]
  );

  respondSuccess(res, { reports, page, total, total_pages: Math.ceil(total / perPage) });
});

// GET /api/users/directory — paginated user list
userRoutes.get('/directory', rateLimit('public_read', 60, 60), async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const perPage = Math.min(50, Math.max(1, parseInt(req.query.per_page as string) || 20));
  const offset = (page - 1) * perPage;

  const countResult = await query<{ cnt: number }>("SELECT COUNT(*) as cnt FROM users WHERE status = 'active'");
  const total = countResult[0]?.cnt || 0;

  const users = await query(
    `SELECT id, username, name, role, created_at FROM users
     WHERE status = 'active' ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [perPage, offset]
  );

  respondSuccess(res, { users, page, total, total_pages: Math.ceil(total / perPage) });
});

// PUT /api/users/settings — update own settings
userRoutes.put('/settings', requireActiveUser, requireCsrf, rateLimit('submit', 10, 60), async (req, res) => {
  const input = req.body || {};
  const user = req.currentUser!;

  const username = (input.username || user.username).trim();
  const privacy = input.privacy || 'public';

  if (!['public', 'logged-in', 'private'].includes(privacy)) {
    respondError(res, 'Invalid privacy', 400);
    return;
  }
  if (username.length < 3 || username.length > 50) {
    respondError(res, 'Username 3-50 chars', 400);
    return;
  }

  if (username !== user.username) {
    const existing = await queryOne('SELECT id FROM users WHERE username = ? AND id != ?', [username, user.id]);
    if (existing) { respondError(res, 'Username taken', 409); return; }
  }

  await execute('UPDATE users SET username = ?, privacy = ? WHERE id = ?', [username, privacy, user.id]);
  respondSuccess(res, { message: 'Settings updated' });
});

// GET /api/users/list — admin only, user management
const adminRateLimit = rateLimit('admin', 60, 60);

userRoutes.get('/list', requireRole('admin'), adminRateLimit, async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const perPage = Math.min(100, Math.max(1, parseInt(req.query.per_page as string) || 20));
  const offset = (page - 1) * perPage;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (req.query.search) {
    const search = `%${req.query.search}%`;
    conditions.push('(username LIKE ? OR name LIKE ? OR email LIKE ?)');
    params.push(search, search, search);
  }
  if (req.query.role) {
    conditions.push('role = ?');
    params.push(req.query.role);
  }
  if (req.query.status) {
    conditions.push('status = ?');
    params.push(req.query.status);
  }

  const whereSql = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  const countResult = await query<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM users ${whereSql}`, params);
  const total = countResult[0]?.cnt || 0;

  const users = await query(
    `SELECT id, username, name, email, role, status, privacy, created_at FROM users ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, perPage, offset]
  );

  respondSuccess(res, { users, page, total, total_pages: Math.ceil(total / perPage) });
});

// POST /api/users/role — admin only
userRoutes.post('/role', requireRole('admin'), requireCsrf, adminRateLimit, async (req, res) => {
  const input = req.body || {};
  const userId = parseInt(input.user_id);
  const role = input.role;

  if (!userId) { respondError(res, 'user_id required', 400); return; }
  if (!['user', 'moderator', 'admin'].includes(role)) { respondError(res, 'Invalid role', 400); return; }
  if (userId === req.currentUser!.id) { respondError(res, 'Cannot change own role', 400); return; }

  const target = await queryOne('SELECT id FROM users WHERE id = ?', [userId]);
  if (!target) { respondError(res, 'User not found', 404); return; }

  await execute('UPDATE users SET role = ? WHERE id = ?', [role, userId]);
  await execute(
    `INSERT INTO moderation_log (moderator_id, action_type, target_type, target_id, details)
     VALUES (?, 'role_change', 'user', ?, ?)`,
    [req.currentUser!.id, userId, `Role changed to ${role}`]
  );

  respondSuccess(res, { message: 'Role updated' });
});

// POST /api/users/ban — admin only
userRoutes.post('/ban', requireRole('admin'), requireCsrf, adminRateLimit, async (req, res) => {
  const userId = parseInt(req.body?.user_id);
  if (!userId) { respondError(res, 'user_id required', 400); return; }
  if (userId === req.currentUser!.id) { respondError(res, 'Cannot ban yourself', 400); return; }

  const target = await queryOne('SELECT id FROM users WHERE id = ?', [userId]);
  if (!target) { respondError(res, 'User not found', 404); return; }

  await execute("UPDATE users SET status = 'banned' WHERE id = ?", [userId]);
  await execute(
    `INSERT INTO moderation_log (moderator_id, action_type, target_type, target_id, details)
     VALUES (?, 'user_ban', 'user', ?, 'User banned')`,
    [req.currentUser!.id, userId]
  );

  respondSuccess(res, { message: 'User banned' });
});

// POST /api/users/unban — admin only
userRoutes.post('/unban', requireRole('admin'), requireCsrf, adminRateLimit, async (req, res) => {
  const userId = parseInt(req.body?.user_id);
  if (!userId) { respondError(res, 'user_id required', 400); return; }

  const target = await queryOne('SELECT id FROM users WHERE id = ?', [userId]);
  if (!target) { respondError(res, 'User not found', 404); return; }

  await execute("UPDATE users SET status = 'active' WHERE id = ?", [userId]);
  await execute(
    `INSERT INTO moderation_log (moderator_id, action_type, target_type, target_id, details)
     VALUES (?, 'user_unban', 'user', ?, 'User unbanned')`,
    [req.currentUser!.id, userId]
  );

  respondSuccess(res, { message: 'User unbanned' });
});
