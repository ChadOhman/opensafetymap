import { Router } from 'express';
import { query } from '../helpers/db.js';
import { respondSuccess, respondError } from '../helpers/response.js';
import { requireRole } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimiter.js';

export const moderationRoutes = Router();

const modRateLimit = rateLimit('moderate', 60, 60);

// GET /api/moderation/stats
moderationRoutes.get('/stats', requireRole('moderator'), modRateLimit, async (_req, res) => {
  const [totalR, approvedR, rejectedR, pendingR] = await Promise.all([
    query<{ cnt: number }>('SELECT COUNT(*) as cnt FROM reports'),
    query<{ cnt: number }>("SELECT COUNT(*) as cnt FROM reports WHERE status='approved'"),
    query<{ cnt: number }>("SELECT COUNT(*) as cnt FROM reports WHERE status='rejected'"),
    query<{ cnt: number }>("SELECT COUNT(*) as cnt FROM reports WHERE status='pending'"),
  ]);

  const avgResult = await query<{ avg_hours: number | null }>(
    `SELECT AVG(TIMESTAMPDIFF(HOUR, r.created_at, ml.created_at)) as avg_hours
     FROM moderation_log ml
     JOIN reports r ON ml.target_id = r.id AND ml.target_type = 'report'
     WHERE ml.action_type IN ('report_approve', 'report_reject')`
  );

  const trend = await query(
    `SELECT YEARWEEK(created_at, 3) as week,
            SUM(action_type = 'report_approve') as approved,
            SUM(action_type = 'report_reject') as rejected
     FROM moderation_log
     WHERE target_type = 'report' AND created_at >= DATE_SUB(NOW(), INTERVAL 12 WEEK)
     GROUP BY week ORDER BY week`
  );

  respondSuccess(res, {
    total: totalR[0]?.cnt || 0,
    approved: approvedR[0]?.cnt || 0,
    rejected: rejectedR[0]?.cnt || 0,
    pending: pendingR[0]?.cnt || 0,
    avg_resolution_hours: Math.round((avgResult[0]?.avg_hours || 0) * 10) / 10,
    weekly_trend: trend,
  });
});

// GET /api/moderation/log
moderationRoutes.get('/log', requireRole('moderator'), modRateLimit, async (req, res) => {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (req.query.action_type) {
    conditions.push('ml.action_type = ?');
    params.push(req.query.action_type);
  }
  if (req.query.target_type) {
    conditions.push('ml.target_type = ?');
    params.push(req.query.target_type);
  }
  if (req.query.date_from) {
    conditions.push('ml.created_at >= ?');
    params.push(req.query.date_from);
  }
  if (req.query.date_to) {
    conditions.push('ml.created_at <= ?');
    params.push(req.query.date_to);
  }

  const whereSql = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  const logs = await query(
    `SELECT ml.*, u.username AS moderator_name
     FROM moderation_log ml
     JOIN users u ON ml.moderator_id = u.id
     ${whereSql}
     ORDER BY ml.created_at DESC
     LIMIT 200`,
    params
  );

  respondSuccess(res, logs);
});
