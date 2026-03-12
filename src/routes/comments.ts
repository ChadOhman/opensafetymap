import { Router } from 'express';
import { query, queryOne, execute } from '../helpers/db.js';
import { respondSuccess, respondError } from '../helpers/response.js';
import { getCurrentUser, requireCsrf } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimiter.js';

export const commentRoutes = Router();

// POST /api/comments/add
commentRoutes.post('/add', rateLimit('comment', 10, 300), async (req, res) => {
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
  const reportId = parseInt(input.report_id);
  const content = (input.content || '').trim();
  const authorName = (input.author_name || '').trim();

  if (!reportId) { respondError(res, 'Missing or invalid report_id'); return; }
  if (!content || content.length > 2000) {
    respondError(res, 'Content is required and must be under 2000 characters');
    return;
  }

  const report = await queryOne<{ id: number; status: string }>(
    'SELECT id, status FROM reports WHERE id = ?', [reportId]
  );
  if (!report || report.status !== 'approved') {
    respondError(res, 'Report not found or not available for comments', 404);
    return;
  }

  if (!user && !authorName) {
    respondError(res, 'Author name is required for anonymous comments');
    return;
  }

  const status = user ? 'approved' : 'pending';

  const result = await execute(
    `INSERT INTO comments (report_id, user_id, author_name, content, status, created_at)
     VALUES (?, ?, ?, ?, ?, NOW())`,
    [reportId, user ? user.id : null, user ? null : authorName, content, status]
  );

  respondSuccess(res, { id: result.insertId, status });
});

// DELETE /api/comments/delete
commentRoutes.delete('/delete', async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) { respondError(res, 'Unauthorized', 401); return; }

  const commentId = parseInt(req.query.id as string);
  if (!commentId) { respondError(res, 'Comment ID required', 400); return; }

  const comment = await queryOne<{ id: number; user_id: number | null }>(
    'SELECT id, user_id FROM comments WHERE id = ?', [commentId]
  );
  if (!comment) { respondError(res, 'Comment not found', 404); return; }

  const isMod = user.role === 'moderator' || user.role === 'admin';
  if (comment.user_id !== user.id && !isMod) {
    respondError(res, 'Forbidden', 403);
    return;
  }

  await execute('DELETE FROM comments WHERE id = ?', [commentId]);
  respondSuccess(res, { message: 'Comment deleted' });
});
