# Open Safety Map

[![CI/CD](https://github.com/ChadOhman/opensafetymap/actions/workflows/ci.yml/badge.svg)](https://github.com/ChadOhman/opensafetymap/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A community-driven platform for reporting and tracking road safety incidents on an interactive map. Anyone can submit a report — with or without an account. Moderators review submissions before they appear publicly.

Built with **PHP 8.2 + MySQL 8** backend and a **vanilla JS + Leaflet.js** frontend. No build tools, no bundler.

---

## Features

**Reporting** — Submit incidents with reporter mode (pedestrian/cyclist/driver), incident type, severity, involved parties, photos (up to 10), and video. Click the map or use browser geolocation to set the location. Anonymous submissions accepted with email or phone for follow-up.

**Interactive Map** — Leaflet.js with OpenStreetMap tiles and marker clustering. Severity-colored markers (green/orange/red). Filter by reporter mode, incident type, severity, involved party, and date range. Shareable URLs via hash coordinates.

**Dark Mode** — Three-way toggle (auto/light/dark). CSS custom properties for all colors. Map tiles swap between OpenStreetMap and CartoDB Dark Matter.

**Moderation** — Tabbed dashboard for moderators: pending reports, flagged content, audit log, and analytics with weekly trend charts. All actions logged immutably.

**User Management** — Admin user directory with search, role management, and ban/unban. Three roles: user, moderator, admin.

**Auth** — OAuth 2.0 via Google, Apple, Mastodon, and Bluesky. Dual auth model: session cookies for web browsers, Bearer tokens for API/mobile clients.

**Accessibility** — WCAG 2.1 AA targets: skip links, ARIA landmarks and live regions, keyboard navigation, 4.5:1 contrast ratios, reduced motion support, 44px minimum touch targets.

---

## Quick Start

```bash
curl -fsSL https://raw.githubusercontent.com/ChadOhman/opensafetymap/main/setup.sh | bash
```

This installs git and Docker if missing, clones the repo, and starts the app. PHP/Apache on **:8080**, MySQL 8 on **:3306**. Schema and seed data load automatically.

Visit **http://localhost:8080**.

Already have git and Docker?

```bash
git clone https://github.com/ChadOhman/opensafetymap.git && cd opensafetymap && cp .env.example .env && docker compose up --build -d
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | PHP 8.2, MySQL 8, PDO |
| Frontend | HTML5, CSS3, JavaScript ES6 modules |
| Maps | Leaflet.js, MarkerCluster, OpenStreetMap, CartoDB |
| Charts | Chart.js |
| Auth | OAuth 2.0 (Google, Apple, Mastodon, Bluesky) |
| Storage | Amazon S3 (photo/video uploads) |
| Geolocation | MaxMind GeoLite2 (IP fallback) |
| Containers | Docker, Docker Compose |

---

## Database

16 tables organized into:

- **Auth**: `users`, `auth_tokens`
- **Lookups**: `reporter_modes`, `other_parties`, `incident_types`, `severity_levels`
- **Content**: `reports`, `report_other_parties` (junction), `report_photos`, `comments`, `flags`
- **Upload**: `upload_tokens`
- **Admin**: `settings` (key-value), `moderation_log`, `rate_limits`

Reports have a nullable `user_id` (anonymous submissions), many-to-many relationship with `other_parties`, and multiple photos via `report_photos`.

Full schema: [`sql/schema.sql`](sql/schema.sql)

---

## API

All endpoints return a consistent JSON envelope:

```json
// Success
{ "success": true, "data": { ... } }

// Error
{ "success": false, "error": "Message", "code": 400 }
```

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/lookups.php` | All lookup table values |
| GET | `/api/reports/list.php?bbox=...` | Reports in bounding box (paginated) |
| GET | `/api/reports/detail.php?id=...` | Single report with photos, comments |
| GET | `/api/location/detect.php` | IP-based geolocation |
| GET | `/api/auth/csrf.php` | Get CSRF token |
| GET | `/api/users/profile.php?username=...` | Public profile (respects privacy) |

### Authenticated Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/reports/submit.php` | Submit report (auth or anonymous) |
| POST | `/api/reports/upload.php` | Upload photo/video |
| POST | `/api/comments/submit.php` | Add comment |
| POST | `/api/flags/submit.php` | Flag content |
| GET | `/api/auth/session.php` | Current user info |
| GET | `/api/auth/tokens.php` | List active tokens |
| DELETE | `/api/auth/tokens.php?id=...` | Revoke token |
| POST | `/api/auth/logout.php` | Logout |
| PUT | `/api/users/settings.php` | Update own settings |
| GET | `/api/users/reports.php` | Own reports |

### Moderator Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports/pending.php` | Pending reports queue |
| POST | `/api/reports/moderate.php` | Approve/reject/resolve report |
| GET | `/api/flags/list.php` | Flagged content |
| POST | `/api/flags/resolve.php` | Dismiss/remove flagged item |
| GET | `/api/moderation/log.php` | Filterable audit log |
| GET | `/api/moderation/stats.php` | Moderation analytics |

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/list.php` | User directory (search/filter) |
| POST | `/api/users/ban.php` | Ban user |
| POST | `/api/users/unban.php` | Unban user |
| POST | `/api/users/role.php` | Change user role |
| GET/PUT | `/api/admin/settings.php` | App settings |

---

## Configuration

Copy `.env.example` to `.env` and fill in:

- **Database**: `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`
- **App**: `APP_URL`, `APP_ENV` (development/production), `CORS_ORIGIN`
- **OAuth**: Client ID + secret for each provider (Google, Apple, Mastodon, Bluesky)
- **S3**: `S3_BUCKET`, `S3_KEY`, `S3_SECRET`, `S3_REGION`
- **Geolocation**: `MAXMIND_DB_PATH` (optional, for IP-based location fallback)

---

## CI/CD

- **PHP Lint**: Checks all `.php` files for syntax errors on every push and PR
- **SQL Validation**: Verifies schema syntax
- **Lighthouse CI**: Audits pages for performance, accessibility, and SEO (static HTML only)

---

## Roles & Permissions

| Role | Capabilities |
|------|-------------|
| **User** | Submit reports, comment, flag content, manage own profile |
| **Moderator** | All user actions + approve/reject reports, resolve flags, view audit log and analytics |
| **Admin** | All moderator actions + manage user roles, ban/unban users, app settings, user directory |

Anonymous visitors can submit reports and comments without an account.

---

## License

[MIT](LICENSE)
