import { Router, Request } from 'express';
import { query, queryOne, execute, transaction } from '../helpers/db.js';
import { respondSuccess, respondError } from '../helpers/response.js';
import { getCurrentUser, requireActiveUser, requireRole, requireCsrf } from '../middleware/auth.js';
import { checkHoneypot } from '../middleware/honeypot.js';
import { rateLimit } from '../middleware/rateLimiter.js';
import { upload, createUploadToken, getUploadByToken } from '../services/uploadService.js';
import type { Report } from '../helpers/types.js';

export const reportRoutes = Router();

// GET /api/reports/list — public, bbox required
reportRoutes.get('/list', rateLimit('public_read', 120, 60), async (req, res) => {
  const bbox = (req.query.bbox as string) || '';
  const parts = bbox.split(',');
  if (parts.length !== 4) {
    respondError(res, 'bbox parameter required (lat1,lng1,lat2,lng2)');
    return;
  }

  const [lat1Raw, lng1Raw, lat2Raw, lng2Raw] = parts.map(Number);
  const lat1 = Math.min(lat1Raw, lat2Raw);
  const lat2 = Math.max(lat1Raw, lat2Raw);
  const lng1 = Math.min(lng1Raw, lng2Raw);
  const lng2 = Math.max(lng1Raw, lng2Raw);

  if (lat1 < -90 || lat2 > 90) { respondError(res, 'Invalid latitude in bbox'); return; }
  if (lng1 < -180 || lng2 > 180) { respondError(res, 'Invalid longitude in bbox'); return; }

  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const perPage = Math.min(200, Math.max(1, parseInt(req.query.per_page as string) || 50));
  const offset = (page - 1) * perPage;

  const user = await getCurrentUser(req);
  const isMod = user && (user.role === 'moderator' || user.role === 'admin');

  const conditions: string[] = [
    'r.latitude BETWEEN ? AND ?',
    'r.longitude BETWEEN ? AND ?',
  ];
  const params: unknown[] = [lat1, lat2, lng1, lng2];

  if (!isMod) {
    conditions.push("r.status = 'approved'");
  }

  // Optional filters
  if (req.query.reporter_mode) {
    conditions.push('r.reporter_mode_id = ?');
    params.push(parseInt(req.query.reporter_mode as string));
  }
  if (req.query.incident_type) {
    conditions.push('r.incident_type_id = ?');
    params.push(parseInt(req.query.incident_type as string));
  }
  if (req.query.severity) {
    conditions.push('r.severity_id = ?');
    params.push(parseInt(req.query.severity as string));
  }
  if (req.query.date_from) {
    conditions.push('r.incident_date >= ?');
    params.push(req.query.date_from);
  }
  if (req.query.date_to) {
    conditions.push('r.incident_date <= ?');
    params.push(req.query.date_to);
  }

  let otherPartyJoin = '';
  if (req.query.other_party) {
    otherPartyJoin = `JOIN report_other_parties rop ON rop.report_id = r.id`;
    conditions.push('rop.other_party_id = ?');
    params.push(parseInt(req.query.other_party as string));
  }

  const where = conditions.join(' AND ');

  const countSql = `SELECT COUNT(DISTINCT r.id) as cnt FROM reports r ${otherPartyJoin} WHERE ${where}`;
  const countResult = await query<{ cnt: number }>(countSql, params);
  const total = countResult[0]?.cnt || 0;

  const sql = `SELECT r.id, r.description, r.latitude, r.longitude, r.incident_date, r.created_at,
                      r.resolved_at, r.status, r.video_url,
                      rm.name AS reporter_mode,
                      it.name AS incident_type,
                      sl.name AS severity,
                      u.username AS reporter_username,
                      (SELECT COUNT(*) FROM report_photos rp WHERE rp.report_id = r.id) AS photo_count,
                      (SELECT COUNT(*) FROM comments c WHERE c.report_id = r.id AND c.status = 'approved') AS comment_count
               FROM reports r
               LEFT JOIN users u ON r.user_id = u.id
               JOIN reporter_modes rm ON r.reporter_mode_id = rm.id
               JOIN incident_types it ON r.incident_type_id = it.id
               JOIN severity_levels sl ON r.severity_id = sl.id
               ${otherPartyJoin}
               WHERE ${where}
               GROUP BY r.id
               ORDER BY r.created_at DESC
               LIMIT ? OFFSET ?`;

  const reports = await query(sql, [...params, perPage, offset]);

  respondSuccess(res, {
    reports,
    page,
    per_page: perPage,
    total,
    total_pages: Math.max(1, Math.ceil(total / perPage)),
  });
});

// GET /api/reports/detail
reportRoutes.get('/detail', rateLimit('public_read', 120, 60), async (req, res) => {
  const id = parseInt(req.query.id as string);
  if (!id) { respondError(res, 'Missing or invalid report id'); return; }

  const user = await getCurrentUser(req);
  const isMod = user && (user.role === 'moderator' || user.role === 'admin');
  const statusClause = isMod ? '' : "AND r.status = 'approved'";

  const report = await queryOne<any>(
    `SELECT r.id, r.description, r.latitude, r.longitude, r.incident_date,
            r.created_at, r.resolved_at, r.status, r.video_url,
            rm.name AS reporter_mode,
            it.name AS incident_type,
            sl.name AS severity,
            u.username AS reporter_username
     FROM reports r
     LEFT JOIN users u ON r.user_id = u.id
     JOIN reporter_modes rm ON r.reporter_mode_id = rm.id
     JOIN incident_types it ON r.incident_type_id = it.id
     JOIN severity_levels sl ON r.severity_id = sl.id
     WHERE r.id = ? ${statusClause}`,
    [id]
  );

  if (!report) { respondError(res, 'Report not found', 404); return; }

  const [photos, otherParties] = await Promise.all([
    query('SELECT id, url, sort_order FROM report_photos WHERE report_id = ? ORDER BY sort_order', [id]),
    query(
      `SELECT op.id, op.name FROM report_other_parties rop
       JOIN other_parties op ON op.id = rop.other_party_id
       WHERE rop.report_id = ? ORDER BY op.id`, [id]
    ),
  ]);

  const commentStatus = isMod ? '' : "AND c.status = 'approved'";
  const comments = await query(
    `SELECT c.id, c.content, c.author_name, c.created_at, u.username
     FROM comments c LEFT JOIN users u ON c.user_id = u.id
     WHERE c.report_id = ? ${commentStatus} ORDER BY c.created_at ASC`, [id]
  );

  report.photos = photos;
  report.other_parties = otherParties;
  report.comments = comments;

  respondSuccess(res, report);
});

// POST /api/reports/submit
reportRoutes.post('/submit', rateLimit('submit', 5, 600), async (req, res) => {
  const user = await getCurrentUser(req);
  if (user) {
    if (req.authMethod === 'session') {
      const token = req.headers['x-csrf-token'] as string || req.body?.csrf_token;
      if (!token || token !== req.session.csrfToken) {
        respondError(res, 'Invalid CSRF token', 403);
        return;
      }
    }
  } else {
    if (req.body?.website) { respondError(res, 'Invalid request', 400); return; }
  }

  const input = req.body || {};

  const reporterModeId = parseInt(input.reporter_mode_id);
  const incidentTypeId = parseInt(input.incident_type_id);
  const severityId = parseInt(input.severity_id);
  const description = (input.description || '').trim();
  const latitude = parseFloat(input.latitude);
  const longitude = parseFloat(input.longitude);
  const incidentDate = input.incident_date || null;
  let videoUrl: string | null = (input.video_url || '').trim() || null;
  const reporterEmail: string | null = user ? null : (input.reporter_email || '').trim() || null;
  const reporterPhone: string | null = user ? null : (input.reporter_phone || '').trim() || null;
  let otherPartyIds: number[] = [];
  const photoUrls: string[] = Array.isArray(input.photo_urls) ? input.photo_urls : [];
  const uploadToken: string | null = input.upload_token || null;

  // Parse other_party_ids
  if (input.other_party_ids) {
    if (Array.isArray(input.other_party_ids)) {
      otherPartyIds = input.other_party_ids.map(Number).filter((n: number) => !isNaN(n));
    } else if (typeof input.other_party_ids === 'string') {
      otherPartyIds = input.other_party_ids.split(',').map(Number).filter((n: number) => !isNaN(n));
    }
  }

  // Validate required fields
  if (!reporterModeId || isNaN(reporterModeId)) { respondError(res, 'Invalid reporter mode'); return; }
  if (!incidentTypeId || isNaN(incidentTypeId)) { respondError(res, 'Invalid incident type'); return; }
  if (!severityId || isNaN(severityId)) { respondError(res, 'Invalid severity level'); return; }
  if (!description || description.length > 2000) { respondError(res, 'Description is required and must be under 2000 characters'); return; }
  if (isNaN(latitude) || latitude < -90 || latitude > 90) { respondError(res, 'Invalid latitude'); return; }
  if (isNaN(longitude) || longitude < -180 || longitude > 180) { respondError(res, 'Invalid longitude'); return; }

  // Validate lookups exist
  const [rm, it, sv] = await Promise.all([
    queryOne('SELECT id FROM reporter_modes WHERE id = ?', [reporterModeId]),
    queryOne('SELECT id FROM incident_types WHERE id = ?', [incidentTypeId]),
    queryOne('SELECT id FROM severity_levels WHERE id = ?', [severityId]),
  ]);
  if (!rm) { respondError(res, 'Invalid reporter mode'); return; }
  if (!it) { respondError(res, 'Invalid incident type'); return; }
  if (!sv) { respondError(res, 'Invalid severity level'); return; }

  // Validate video URL
  if (videoUrl && !/^\/uploads\/pending\/video_[a-f0-9]+\.(mp4|webm|mov)$/i.test(videoUrl)) {
    respondError(res, 'Invalid video URL', 400);
    return;
  }

  // Validate photo count
  if (photoUrls.length > 10) { respondError(res, 'Maximum 10 photos', 400); return; }

  // Anonymous submissions require email or phone
  if (!user) {
    if (!reporterEmail && !reporterPhone) {
      respondError(res, 'Anonymous reports require an email or phone number');
      return;
    }
    if (reporterEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reporterEmail)) {
      respondError(res, 'Invalid email address');
      return;
    }
  }

  try {
    const result = await transaction(async (conn) => {
      const [insertResult] = await conn.execute(
        `INSERT INTO reports (user_id, reporter_mode_id, incident_type_id, severity_id,
                              description, incident_date, latitude, longitude,
                              video_url, reporter_email, reporter_phone, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
        [
          user ? user.id : null, reporterModeId, incidentTypeId, severityId,
          description, incidentDate, latitude, longitude,
          videoUrl, reporterEmail, reporterPhone,
        ]
      );
      const reportId = (insertResult as any).insertId;

      // Insert other parties
      for (const partyId of otherPartyIds) {
        await conn.execute(
          'INSERT INTO report_other_parties (report_id, other_party_id) VALUES (?, ?)',
          [reportId, partyId]
        );
      }

      // Insert photos
      for (let i = 0; i < photoUrls.length; i++) {
        await conn.execute(
          'INSERT INTO report_photos (report_id, url, sort_order) VALUES (?, ?, ?)',
          [reportId, photoUrls[i], i]
        );
      }

      // Clean up upload token
      if (uploadToken) {
        await conn.execute('DELETE FROM upload_tokens WHERE token = ?', [uploadToken]);
      }

      return reportId;
    });

    respondSuccess(res, { id: result, status: 'pending' });
  } catch (e) {
    console.error('Report submit error:', e);
    respondError(res, 'Failed to submit report', 500);
  }
});

// POST /api/reports/upload
reportRoutes.post('/upload', rateLimit('upload', 10, 60), async (req, res) => {
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

  upload.single('file')(req, res, async (err) => {
    if (err) {
      respondError(res, err.message || 'Upload failed', 400);
      return;
    }
    if (!req.file) {
      respondError(res, 'No file uploaded');
      return;
    }

    // Determine type
    const uploadType = req.file.mimetype.startsWith('video/') ? 'video' : 'photo';

    // Handle upload token
    let token: string;
    const providedToken = req.query.upload_token as string;
    if (providedToken) {
      const existing = await getUploadByToken(providedToken);
      if (!existing) { respondError(res, 'Invalid or expired upload token', 400); return; }
      token = providedToken;
    } else {
      token = await createUploadToken(req.file);
    }

    const url = `/uploads/pending/${req.file.filename}`;
    respondSuccess(res, { url, upload_token: token, filename: req.file.filename, type: uploadType });
  });
});

// GET /api/reports/pending — moderator only
reportRoutes.get('/pending', requireRole('moderator'), rateLimit('moderate', 60, 60), async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const perPage = Math.min(100, Math.max(1, parseInt(req.query.per_page as string) || 20));
  const offset = (page - 1) * perPage;

  const countResult = await query<{ cnt: number }>("SELECT COUNT(*) as cnt FROM reports WHERE status = 'pending'");
  const total = countResult[0]?.cnt || 0;

  const reports = await query<any>(
    `SELECT r.*, rm.name AS reporter_mode, it.name AS incident_type,
            sl.name AS severity, u.username AS reporter_username
     FROM reports r
     JOIN reporter_modes rm ON r.reporter_mode_id = rm.id
     JOIN incident_types it ON r.incident_type_id = it.id
     JOIN severity_levels sl ON r.severity_id = sl.id
     LEFT JOIN users u ON r.user_id = u.id
     WHERE r.status = 'pending'
     ORDER BY r.created_at ASC
     LIMIT ? OFFSET ?`,
    [perPage, offset]
  );

  // Add other parties for each report
  for (const report of reports) {
    const parties = await query<{ name: string }>(
      `SELECT op.name FROM report_other_parties rop
       JOIN other_parties op ON rop.other_party_id = op.id
       WHERE rop.report_id = ?`,
      [report.id]
    );
    report.other_parties = parties.map(p => p.name);
  }

  respondSuccess(res, { reports, page, total, total_pages: Math.ceil(total / perPage) });
});

// POST /api/reports/moderate — moderator only
reportRoutes.post('/moderate', requireRole('moderator'), requireCsrf, rateLimit('moderate', 60, 60), async (req, res) => {
  const input = req.body || {};
  const reportId = parseInt(input.report_id);
  const action = input.action;
  const notes = (input.notes || '').trim();

  if (!reportId) { respondError(res, 'report_id required', 400); return; }
  if (!['approve', 'reject', 'resolve'].includes(action)) {
    respondError(res, "action must be 'approve', 'reject', or 'resolve'", 400);
    return;
  }

  const report = await queryOne('SELECT * FROM reports WHERE id = ?', [reportId]);
  if (!report) { respondError(res, 'Report not found', 404); return; }

  try {
    await transaction(async (conn) => {
      if (action === 'approve') {
        await conn.execute("UPDATE reports SET status = 'approved' WHERE id = ?", [reportId]);
      } else if (action === 'reject') {
        await conn.execute("UPDATE reports SET status = 'rejected' WHERE id = ?", [reportId]);
      } else if (action === 'resolve') {
        await conn.execute('UPDATE reports SET resolved_at = NOW() WHERE id = ?', [reportId]);
      }

      const past: Record<string, string> = { approve: 'approved', reject: 'rejected', resolve: 'resolved' };
      await conn.execute(
        `INSERT INTO moderation_log (moderator_id, action_type, target_type, target_id, details, notes)
         VALUES (?, ?, 'report', ?, ?, ?)`,
        [req.currentUser!.id, `report_${action}`, reportId, `Report ${past[action]}`, notes || null]
      );
    });

    respondSuccess(res, { message: `Report ${action}d` });
  } catch (e) {
    respondError(res, 'Moderation failed', 500);
  }
});
