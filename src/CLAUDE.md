# src/ — TypeScript Backend

## Structure

```
index.ts           # Express app entry point
config.ts          # Environment config loader
helpers/           # DB pool, response envelope, types, zod validation
middleware/         # Auth, CORS, CSRF, honeypot, rate limiter
services/          # OAuth, alias generator, upload service
routes/            # Express routers (auth, reports, comments, flags, users, admin, moderation, lookups, location)
__tests__/         # Vitest test files
```

## Dual Auth Model

Two parallel auth mechanisms in `middleware/auth.ts`:
1. **Session cookies** (web browser) — express-session with CSRF protection via `requireCsrf`
2. **Bearer tokens** (mobile/API) — opaque tokens stored in `auth_tokens` table, CSRF exempt

`getCurrentUser(req)` checks Bearer header first, then session. All API endpoints accept either. The auth method is tracked in `req.authMethod` so CSRF can be skipped for token auth.

## API Endpoint Pattern

Express routers in `routes/` follow a consistent pattern:
```typescript
router.post('/endpoint', requireActiveUser, requireCsrf, rateLimit('key', max, window), async (req, res) => {
  respondSuccess(res, data);   // {success: true, data: ...}
  respondError(res, msg, 400); // {success: false, error: ..., code: ...}
});
```

Response envelope is always `{success, data}` or `{success, error, code}`.

## Anonymous Submissions

Reports, comments, and flags accept anonymous submission (no auth required). Anonymous endpoints use `checkHoneypot` middleware for spam protection instead of CSRF. Anonymous reports require `reporter_email` or `reporter_phone`.

## Rate Limiting

IP-based via `rate_limits` DB table (not session-based). `rateLimit(key, max, windowSeconds)` middleware with probabilistic pruning of expired entries. The `public_read` key gets 2.5x multiplier for authenticated users.

## Key Relationships

- `helpers/db.ts` — MySQL connection pool, query/execute helpers used by all routes
- `middleware/auth.ts` — dual auth, CSRF, role checking used by all protected routes
- `middleware/rateLimiter.ts` — IP-based rate limiting using `rate_limits` DB table
- `services/oauthService.ts` — token verification for Google, Apple, Mastodon, Bluesky
- Schema seed data in `sql/schema.sql` (lookup tables), test data in `sql/seed.sql`
