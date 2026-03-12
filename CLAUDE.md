# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Open Safety Map — a public, location-agnostic road safety incident reporting platform. Users report traffic incidents on an interactive map with optional anonymous submission. Node.js 20 + TypeScript 5 backend, MySQL 8 database, vanilla JS ES6 module frontend with Leaflet.js.

## Development Setup

```bash
make up          # Build and start Docker containers (app :8080, db :3306)
make seed        # Load test data into running DB
make reset-db    # Nuke volumes and rebuild from scratch
make down        # Stop containers
make db-shell    # MySQL shell
make app-shell   # Node container shell
make lint        # TypeScript type check (tsc --noEmit)
make test        # Run vitest tests
make dev         # Local dev server with hot reload (tsx watch)
```

Copy `.env.example` to `.env` for local config. Docker Compose passes env vars to the app container automatically.

## Validation

```bash
make lint                              # TypeScript type check (also runs in CI)
make test                              # Vitest test suite (also runs in CI)
python tools/html_checks.py <file>     # HTML structure validation
python tools/a11y_checks.py <file>     # Offline accessibility checks
```

CI (`.github/workflows/ci.yml`) runs TypeScript type check, vitest, and SQL schema validation.

## Directory Structure

```
src/                 # TypeScript backend source
  index.ts           # Express app entry point
  config.ts          # Environment config loader
  helpers/           # DB pool, response envelope, types, zod validation
  middleware/         # Auth, CORS, CSRF, honeypot, rate limiter
  services/          # OAuth, alias generator, upload service
  routes/            # Express routers (auth, reports, comments, flags, users, admin, moderation, lookups, location)
  __tests__/         # Vitest test files
public/              # Static files served by Express
  *.html             # All HTML pages
  assets/css/        # Single stylesheet with page-specific sections
  assets/js/         # ES6 modules (no build step)
sql/                 # Schema + seed data
docker/              # Dockerfile (multi-stage Node.js build)
scripts/             # Setup and install scripts
docs/                # MkDocs documentation site
tools/               # Offline validation scripts
```

## Architecture

### Dual Auth Model

Two parallel auth mechanisms in `src/middleware/auth.ts`:
1. **Session cookies** (web browser) — express-session with CSRF protection via `requireCsrf`
2. **Bearer tokens** (mobile/API) — opaque tokens stored in `auth_tokens` table, CSRF exempt

`getCurrentUser(req)` checks Bearer header first, then session. All API endpoints accept either. The auth method is tracked in `req.authMethod` so CSRF can be skipped for token auth.

### API Endpoint Pattern

Express routers in `src/routes/` follow a consistent pattern:
```typescript
router.post('/endpoint', requireActiveUser, requireCsrf, rateLimit('key', max, window), async (req, res) => {
  // ... endpoint logic ...
  respondSuccess(res, data);   // {success: true, data: ...}
  respondError(res, msg, 400); // {success: false, error: ..., code: ...}
});
```

Response envelope is always `{success, data}` or `{success, error, code}`.

### Anonymous Submissions

Reports, comments, and flags accept anonymous submission (no auth required). Anonymous endpoints use `checkHoneypot` middleware for spam protection instead of CSRF. Anonymous reports require `reporter_email` or `reporter_phone`.

### Rate Limiting

IP-based via `rate_limits` DB table (not session-based). `rateLimit(key, max, windowSeconds)` middleware with probabilistic pruning of expired entries. The `public_read` key gets 2.5x multiplier for authenticated users.

### Frontend Module System

ES6 modules with no build step. Shared modules in `public/assets/js/`:
- `api.js` — fetch wrapper with Bearer token injection, CSRF handling, `escapeHTML()`, `postFormData()`
- `utils.js` — shared UI helpers: `announce()`, `statusBadge()`, `populateSelect()`
- `auth.js` — session check, role helpers, OAuth result handling
- `theme.js` — dark/light/auto cycling via CSS custom properties + `data-theme` attribute
- `geolocation.js` — browser → IP fallback → localStorage cache → world view
- Page-specific modules: `map.js`, `report-form.js`, `moderation.js`, `user_profile.js`, `user_directory.js`

### CSS Theming

All colors are CSS custom properties in `:root`. Dark mode has two triggers:
- `[data-theme="dark"]` — explicit user choice
- `@media (prefers-color-scheme: dark)` with `:root:not([data-theme="light"])` — system auto

Map tiles swap between OSM standard (light) and CartoDB Dark Matter (dark) via `themechange` custom event. Page-specific styles are at the end of `style.css` under section headers.

## Key Relationships

- `src/helpers/db.ts` → MySQL connection pool, query/execute helpers used by all routes
- `src/middleware/auth.ts` → dual auth, CSRF, role checking used by all protected routes
- `src/middleware/rateLimiter.ts` → IP-based rate limiting using `rate_limits` DB table
- `src/services/oauthService.ts` → token verification for Google, Apple, Mastodon, Bluesky
- Schema seed data in `sql/schema.sql` (lookup tables), test data in `sql/seed.sql`

## Coding Standards

- **TypeScript:** Strict mode, Express route handlers with proper typing, mysql2 prepared statements
- **JS:** ES6 modules, async/await, `escapeHTML()` on all user content before DOM insertion
- **CSS:** All colors via custom properties, no hardcoded color values in component styles. Page-specific styles in `style.css` under section headers, not inline `<style>` blocks.
- **HTML:** Skip link, `main#main-content`, `aria-live="polite"` status region on every page. CDN scripts pinned to versions with SRI integrity hashes.
- **Commits:** Imperative mood ("Add feature" not "Added feature")

## Test Seed Users

- Admin: `brave_wise_owl` | Moderator: `quick_clever_fox` | User: `gentle_happy_otter`
