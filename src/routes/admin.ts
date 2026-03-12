import { Router } from 'express';
import { query, queryOne, execute } from '../helpers/db.js';
import { respondSuccess, respondError } from '../helpers/response.js';
import { requireRole, requireCsrf } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimiter.js';

export const adminRoutes = Router();

const adminRateLimit = rateLimit('admin', 60, 60);

// GET /api/admin/settings
adminRoutes.get('/settings', requireRole('admin'), adminRateLimit, async (_req, res) => {
  const rows = await query<{ setting_key: string; setting_value: string }>(
    'SELECT setting_key, setting_value FROM settings'
  );
  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.setting_key] = row.setting_value;
  }
  respondSuccess(res, settings);
});

// PUT /api/admin/settings
adminRoutes.put('/settings', requireRole('admin'), requireCsrf, adminRateLimit, async (req, res) => {
  const input = req.body || {};
  const allowedKeys = ['require_approval', 'site_name', 'maintenance_mode'];

  for (const [key, value] of Object.entries(input)) {
    if (!allowedKeys.includes(key)) continue;
    await execute(
      `INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [key, String(value)]
    );
  }
  respondSuccess(res, { message: 'Settings updated' });
});

// GET /api/admin/users
adminRoutes.get('/users', requireRole('admin'), adminRateLimit, async (req, res) => {
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

// POST /api/admin/users/role
adminRoutes.post('/users/role', requireRole('admin'), requireCsrf, adminRateLimit, async (req, res) => {
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

// POST /api/admin/users/ban
adminRoutes.post('/users/ban', requireRole('admin'), requireCsrf, adminRateLimit, async (req, res) => {
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

// POST /api/admin/users/unban
adminRoutes.post('/users/unban', requireRole('admin'), requireCsrf, adminRateLimit, async (req, res) => {
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
