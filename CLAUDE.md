# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Open Safety Map — a public, location-agnostic road safety incident reporting platform. Users report traffic incidents on an interactive map with optional anonymous submission. PHP 8.2 backend, MySQL 8 database, vanilla JS ES6 module frontend with Leaflet.js.

## Development Setup

```bash
make up          # Build and start Docker containers (app :8080, db :3306)
make seed        # Load test data into running DB
make reset-db    # Nuke volumes and rebuild from scratch
make down        # Stop containers
make db-shell    # MySQL shell
make app-shell   # PHP container shell
make lint        # PHP syntax check all files
```

Copy `.env.example` to `.env` for local config. Docker Compose passes env vars to the app container automatically.

## Validation

```bash
make lint                              # PHP syntax (also runs in CI)
python tools/html_checks.py <file>     # HTML structure validation
python tools/a11y_checks.py <file>     # Offline accessibility checks
```

CI (`.github/workflows/ci.yml`) runs PHP lint and SQL schema validation only. There are no automated test suites.

## Directory Structure

```
public/              # Apache DocumentRoot (served by Docker)
  *.html             # All HTML pages
  assets/css/        # Single stylesheet with page-specific sections
  assets/js/         # ES6 modules (no build step)
  api/               # PHP API endpoints organized by feature
db/                  # PHP helpers (connect, auth, rate limiting, response)
sql/                 # Schema + seed data
docker/              # Dockerfile
scripts/             # Setup and install scripts
docs/                # MkDocs documentation site
tools/               # Offline validation scripts
```

## Architecture

### Dual Auth Model

Two parallel auth mechanisms in `db/auth_helper.php`:
1. **Session cookies** (web browser) — standard PHP sessions with CSRF protection via `require_csrf()`
2. **Bearer tokens** (mobile/API) — opaque tokens stored in `auth_tokens` table, CSRF exempt

`get_current_user_from_auth($pdo)` checks Bearer header first, then session. All API endpoints accept either. The auth method is tracked in `$GLOBALS['_auth_method']` so CSRF can be skipped for token auth.

### API Endpoint Pattern

Every endpoint follows the same structure (paths relative from `public/api/`):
```php
require_once(__DIR__ . '/../../../db/connect.php');   // provides $pdo, starts session
require_once(__DIR__ . '/../../../db/auth_helper.php'); // auth + CSRF + CORS
require_once(__DIR__ . '/../../../db/rate_limiter.php'); // IP-based rate limiting

set_cors_headers();                    // always first
$user = require_role($pdo, 'moderator'); // or require_active_user($pdo), or get_current_user_from_auth($pdo)
require_csrf();                        // on POST/PUT/DELETE (skipped for token auth)
rate_limit($pdo, 'key', $max, $window);

// ... endpoint logic ...

respond_success($data);   // {success: true, data: ...}
respond_error($msg, 400); // {success: false, error: ..., code: ...}
```

Response envelope is always `{success, data}` or `{success, error, code}`. Both helpers call `exit`.

### Anonymous Submissions

Reports, comments, and flags accept anonymous submission (no auth required). Anonymous endpoints use `check_honeypot()` for spam protection instead of CSRF. Anonymous reports require `reporter_email` or `reporter_phone`.

### Rate Limiting

IP-based via `rate_limits` DB table (not session-based). `rate_limit($pdo, $key, $max, $window_seconds)` with probabilistic pruning of expired entries. The `public_read` key gets 2.5x multiplier for authenticated users.

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

### PDO Gotcha

`LIMIT` and `OFFSET` values must be interpolated as cast integers, not bound via `execute()`. PDO binds all `execute()` params as strings, which causes SQL errors with `LIMIT ?`.

## Key Relationships

- `db/connect.php` → loaded by every API endpoint, provides `$pdo` and starts session
- `db/auth_helper.php` → requires `api_response.php` internally, provides all auth/CSRF/CORS functions
- `db/rate_limiter.php` → requires `api_response.php` internally, uses `rate_limits` DB table
- `public/api/auth/oauth_helper.php` → requires `auth_helper.php` and `alias_helper.php`, shared by all 4 OAuth endpoints
- Schema seed data in `sql/schema.sql` (lookup tables), test data in `sql/seed.sql`

## Coding Standards

- **PHP:** PSR-12, PDO prepared statements for all queries, helpers in `db/`
- **JS:** ES6 modules, async/await, `escapeHTML()` on all user content before DOM insertion
- **CSS:** All colors via custom properties, no hardcoded color values in component styles. Page-specific styles in `style.css` under section headers, not inline `<style>` blocks.
- **HTML:** Skip link, `main#main-content`, `aria-live="polite"` status region on every page. CDN scripts pinned to versions with SRI integrity hashes.
- **Commits:** Imperative mood ("Add feature" not "Added feature")

## Test Seed Users

- Admin: `brave_wise_owl` | Moderator: `quick_clever_fox` | User: `gentle_happy_otter`
