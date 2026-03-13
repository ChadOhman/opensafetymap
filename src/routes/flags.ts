import { Router } from 'express';
import { query, queryOne, execute, transaction } from '../helpers/db.js';
import { respondSuccess, respondError } from '../helpers/response.js';
import { getCurrentUser, requireRole, requireCsrf } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimiter.js';

export const flagRoutes = Router();

// POST /api/flags/add
flagRoutes.post('/add', rateLimit('flag', 5, 600), async (req, res) => {
  const user = await getCurrentUser(req);
  if (user && req.authMethod === 'session') {
    const token = req.headers['x-csrf-token'] as string || req.body?.csrf_token;
    if (!token || token !== req.session.csrfToken) {
      respondError(res, 'Invalid CSRF token', 403);
      return;
    }
  } else if (!user) {
    if (req.body?.website) { respondError(res, 'Invalid request', 400); return; }
  }

  const input = req.body || {};
  const targetType = input.target_type;
  const targetId = parseInt(input.target_id);
  const reason = (input.reason || '').trim();

  if (!['report', 'comment'].includes(targetType)) {
    respondError(res, "target_type must be 'report' or 'comment'");
    return;
  }
  if (!targetId) { respondError(res, 'Missing or invalid target_id'); return; }
  if (!reason || reason.length > 1000) {
    respondError(res, 'Reason is required and must be under 1000 characters');
    return;
  }

  const table = targetType === 'report' ? 'reports' : 'comments';
  const target = await queryOne(`SELECT id FROM ${table} WHERE id = ?`, [targetId]);
  if (!target) { respondError(res, 'Target not found', 404); return; }

  const result = await execute(
    `INSERT INTO flags (user_id, target_type, target_id, reason, status, created_at)
     VALUES (?, ?, ?, ?, 'pending', NOW())`,
    [user ? user.id : null, targetType, targetId, reason]
  );

  respondSuccess(res, { id: result.insertId });
});

// GET /api/flags/list — moderator only
flagRoutes.get('/list', requireRole('moderator'), rateLimit('moderate', 60, 60), async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const perPage = Math.min(100, Math.max(1, parseInt(req.query.per_page as string) || 20));
  const offset = (page - 1) * perPage;
  const statusFilter = (req.query.status as string) || 'pending';

  const countResult = await query<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM flags WHERE status = ?', [statusFilter]
  );
  const total = countResult[0]?.cnt || 0;

  const flags = await query<any>(
    `SELECT f.*, u.username AS flagged_by
     FROM flags f LEFT JOIN users u ON f.user_id = u.id
     WHERE f.status = ?
     ORDER BY f.created_at DESC
     LIMIT ? OFFSET ?`,
    [statusFilter, perPage, offset]
  );

  // Enrich with target info
  for (const flag of flags) {
    if (flag.target_type === 'report') {
      flag.target = await queryOne('SELECT description, status FROM reports WHERE id = ?', [flag.target_id])
        || { description: '[deleted]', status: 'unknown' };
    } else {
      flag.target = await queryOne('SELECT content, status FROM comments WHERE id = ?', [flag.target_id])
        || { content: '[deleted]', status: 'unknown' };
    }
  }

  respondSuccess(res, { flags, page, total, total_pages: Math.ceil(total / perPage) });
});

// POST /api/flags/resolve — moderator only
flagRoutes.post('/resolve', requireRole('moderator'), requireCsrf, rateLimit('moderate', 60, 60), async (req, res) => {
  const input = req.body || {};
  const flagId = parseInt(input.flag_id);
  const action = input.action;
  const notes = (input.notes || '').trim();

  if (!flagId) { respondError(res, 'flag_id required', 400); return; }
  if (!['dismiss', 'remove'].includes(action)) {
    respondError(res, "action must be 'dismiss' or 'remove'", 400);
    return;
  }

  const flag = await queryOne<any>('SELECT * FROM flags WHERE id = ?', [flagId]);
  if (!flag) { respondError(res, 'Flag not found', 404); return; }

  try {
    await transaction(async (conn) => {
      const newStatus = action === 'dismiss' ? 'dismissed' : 'removed';
      await conn.execute('UPDATE flags SET status = ? WHERE id = ?', [newStatus, flagId]);

      if (action === 'remove') {
        if (flag.target_type === 'report') {
          await conn.execute("UPDATE reports SET status = 'rejected' WHERE id = ?", [flag.target_id]);
        } else {
          await conn.execute('DELETE FROM comments WHERE id = ?', [flag.target_id]);
        }
      }

      await conn.execute(
        `INSERT INTO moderation_log (moderator_id, action_type, target_type, target_id, details, notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [req.currentUser!.id, `flag_${action}`, flag.target_type, flag.target_id, `Flag ${flagId} ${action === 'dismiss' ? 'dismissed' : 'removed'}`, notes || null]
      );
    });

    respondSuccess(res, { message: `Flag ${action}ed` });
  } catch (e) {
    respondError(res, 'Failed to resolve flag', 500);
  }
});
