import { Router } from 'express';
import { query } from '../helpers/db.js';
import { respondSuccess, respondError } from '../helpers/response.js';
import { rateLimit } from '../middleware/rateLimiter.js';
import type { LookupItem } from '../helpers/types.js';

export const lookupRoutes = Router();

lookupRoutes.get('/lookups', rateLimit('public_read', 120, 60), async (_req, res) => {
  const [reporterModes, otherParties, incidentTypes, severityLevels] = await Promise.all([
    query<LookupItem>('SELECT id, name FROM reporter_modes ORDER BY id'),
    query<LookupItem>('SELECT id, name FROM other_parties ORDER BY id'),
    query<LookupItem>('SELECT id, name FROM incident_types ORDER BY id'),
    query<LookupItem>('SELECT id, name FROM severity_levels ORDER BY id'),
  ]);
  respondSuccess(res, {
    reporter_modes: reporterModes,
    other_parties: otherParties,
    incident_types: incidentTypes,
    severity_levels: severityLevels,
  });
});
