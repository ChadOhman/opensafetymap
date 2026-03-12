# Open Safety Map — Public Safety Map Redesign

## Overview

Redesign the opensafetymap application to serve as a public, location-agnostic platform for reporting and visualizing road safety incidents (near-misses, collisions, infrastructure hazards). The public-facing map is read-only and accessible to anyone. Submitting reports requires authentication or anonymous submission with mandatory contact info. All anonymous reports are moderated before appearing publicly.

This spec covers: schema redesign, mobile-ready API with token auth, expanded taxonomy, file uploads with client-side video compression, ADA-compliant frontend with dark/light mode, and geolocation-based map centering.

---

## 1. Schema

Starting from scratch (no migration needed — no production data exists).

### Users

```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    oauth_provider VARCHAR(20) NOT NULL,
    oauth_id VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    email VARCHAR(255),
    username VARCHAR(50) UNIQUE NOT NULL,
    role ENUM('user', 'moderator', 'admin') DEFAULT 'user',
    status ENUM('active', 'banned') DEFAULT 'active',
    privacy ENUM('public', 'logged-in', 'private') DEFAULT 'public',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_oauth (oauth_provider, oauth_id)
);
```

- `oauth_provider` is VARCHAR (not ENUM) — easy to add providers.
- `email` is not UNIQUE — different OAuth providers may share an email.

### Auth Tokens

```sql
CREATE TABLE auth_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(64) UNIQUE NOT NULL,
    device_name VARCHAR(100) DEFAULT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

Opaque tokens (not JWT) for server-side revocation. Supports future mobile apps — `device_name` tracks "Chad's iPhone", "Chrome on Windows", etc.

### Lookup Tables

All use VARCHAR instead of ENUM for extensibility.

```sql
CREATE TABLE reporter_modes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);
-- Values: pedestrian, cyclist, e-scooter, motorcyclist, driver, transit-rider, other

CREATE TABLE other_parties (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);
-- Values: pedestrian, cyclist, e-scooter, motorcyclist, motor-vehicle,
--         commercial-vehicle, transit-vehicle, infrastructure, none-unknown

CREATE TABLE incident_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);
-- Values: collision, near-miss, road-rage, blocked-lane, running-signal,
--         infrastructure-hazard, other

CREATE TABLE severity_levels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);
-- Values: minor, major, critical
```

### Reports

```sql
CREATE TABLE reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT DEFAULT NULL,
    reporter_mode_id INT NOT NULL,
    incident_type_id INT NOT NULL,
    severity_id INT NOT NULL,
    description TEXT NOT NULL,
    incident_date DATETIME DEFAULT NULL,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    video_url VARCHAR(500) DEFAULT NULL,
    reporter_email VARCHAR(255) DEFAULT NULL,
    reporter_phone VARCHAR(20) DEFAULT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (reporter_mode_id) REFERENCES reporter_modes(id),
    FOREIGN KEY (incident_type_id) REFERENCES incident_types(id),
    FOREIGN KEY (severity_id) REFERENCES severity_levels(id)
);
```

- `user_id` nullable — NULL for anonymous reporters.
- `ON DELETE SET NULL` — deleted users' reports stay visible as anonymous.
- `reporter_email` or `reporter_phone` required when `user_id` is NULL (enforced in API).
- `incident_date` records when the incident happened (distinct from `created_at` which is when the report was filed).
- `resolved_at` is set when an infrastructure hazard is fixed or an incident is marked resolved by a moderator (via `POST /api/reports/moderate.php` with action `resolve`).

### Report Other Parties (junction table)

```sql
CREATE TABLE report_other_parties (
    report_id INT NOT NULL,
    other_party_id INT NOT NULL,
    PRIMARY KEY (report_id, other_party_id),
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
    FOREIGN KEY (other_party_id) REFERENCES other_parties(id)
);
```

Many-to-many — a single incident can involve multiple other party types (e.g., a cyclist hit by a motor vehicle while a pedestrian was also in the crosswalk).

### Report Photos

```sql
CREATE TABLE report_photos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_id INT NOT NULL,
    url VARCHAR(500) NOT NULL,
    sort_order TINYINT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
);
```

Replaces single `photo_url` column. Multiple photos per report.

### Comments

```sql
CREATE TABLE comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_id INT NOT NULL,
    user_id INT DEFAULT NULL,
    author_name VARCHAR(100) DEFAULT NULL,
    content TEXT NOT NULL,
    status ENUM('pending', 'approved') DEFAULT 'approved',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
```

- Anonymous comments use `author_name` as display name.
- Comments have a `status` column — anonymous comments require moderation (`pending`), authenticated comments are auto-approved.

### Flags

```sql
CREATE TABLE flags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT DEFAULT NULL,
    target_type ENUM('report', 'comment') NOT NULL,
    target_id INT NOT NULL,
    reason TEXT NOT NULL,
    status ENUM('pending', 'dismissed', 'removed') DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
```

- Removed `reviewed` status (redundant with dismissed/removed).
- Polymorphic `target_type` + `target_id` has no FK constraint. Application-level handling: moderator UI must gracefully handle missing targets (e.g., if a flagged comment's parent report is deleted, show "target deleted" instead of crashing). Flag resolution endpoints check target existence before acting.

### Settings

```sql
CREATE TABLE settings (
    setting_key VARCHAR(50) PRIMARY KEY,
    setting_value VARCHAR(255) NOT NULL
);
```

Key-value instead of one-column-per-setting.

### Moderation Log

```sql
CREATE TABLE moderation_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    moderator_id INT NOT NULL,
    action_type VARCHAR(30) NOT NULL,
    target_type VARCHAR(20) NOT NULL,
    target_id INT NOT NULL,
    details TEXT,
    notes TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (moderator_id) REFERENCES users(id)
);
```

- `target_type` added — no more ambiguous `target_id`.
- `action_type` is VARCHAR, not ENUM — extensible.

### Rate Limits

```sql
CREATE TABLE rate_limits (
    ip_address VARCHAR(45) NOT NULL,
    endpoint_group VARCHAR(30) NOT NULL,
    request_count INT DEFAULT 1,
    window_start DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (ip_address, endpoint_group)
);
```

IP-based, works across PHP processes.

### Indexes

```sql
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_user ON reports(user_id);
CREATE INDEX idx_reports_created ON reports(created_at);
CREATE INDEX idx_reports_location ON reports(latitude, longitude);
CREATE INDEX idx_report_photos_report ON report_photos(report_id);
CREATE INDEX idx_comments_report ON comments(report_id);
CREATE INDEX idx_flags_status ON flags(status);
CREATE INDEX idx_flags_target ON flags(target_type, target_id);
CREATE INDEX idx_modlog_moderator ON moderation_log(moderator_id);
CREATE INDEX idx_modlog_target ON moderation_log(target_type, target_id);
CREATE INDEX idx_report_other_parties_party ON report_other_parties(other_party_id);
```

### Seed Data

```sql
INSERT INTO reporter_modes (name) VALUES
    ('pedestrian'), ('cyclist'), ('e-scooter'), ('motorcyclist'),
    ('driver'), ('transit-rider'), ('other');

INSERT INTO other_parties (name) VALUES
    ('pedestrian'), ('cyclist'), ('e-scooter'), ('motorcyclist'),
    ('motor-vehicle'), ('commercial-vehicle'), ('transit-vehicle'),
    ('infrastructure'), ('none-unknown');

INSERT INTO incident_types (name) VALUES
    ('collision'), ('near-miss'), ('road-rage'),
    ('blocked-lane'), ('running-signal'), ('infrastructure-hazard'), ('other');

INSERT INTO severity_levels (name) VALUES
    ('minor'), ('major'), ('critical');

INSERT INTO settings (setting_key, setting_value) VALUES
    ('require_approval', '1');
```

---

## 2. API Endpoints

### Auth Model

Dual auth: session cookies (web) and Bearer tokens (mobile/API). `auth_helper.php` checks for either. OAuth login returns a token; web also sets a session cookie. CSRF protection applies to cookie-based sessions — token requests are immune. Anonymous POST endpoints (report submit, comment, flag) are protected by rate limiting + a honeypot field (`<input name="website" hidden>` — bots fill it, humans don't, server rejects if populated).

**HTTPS:** Required in production. All auth tokens and contact info must be transmitted over TLS. The app should set `Secure` and `HttpOnly` flags on session cookies.

**CORS:** API endpoints set `Access-Control-Allow-Origin` to the configured app domain. Mobile apps use the Bearer token flow and are not subject to CORS. Credentials (`Access-Control-Allow-Credentials: true`) enabled only for the app's own origin.

### Response Envelope

All endpoints return:
```json
{ "success": true, "data": { ... } }
{ "success": false, "error": "message", "code": 401 }
```

`Content-Type: application/json; charset=utf-8` on all responses.

### Auth Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/{provider}.php` | none | OAuth login. Returns `{ token, user }` |
| POST | `/api/auth/logout.php` | token/session | Revokes current token or destroys session |
| GET | `/api/auth/session.php` | token/session | "Who am I" endpoint. Checks Bearer token or session cookie. Returns current user or 401. Called by frontend on page load to determine auth state. |
| GET | `/api/auth/csrf.php` | session | CSRF token (web only) |
| GET | `/api/auth/tokens.php` | token/session | List active auth tokens for current user (device name, created, expires) |
| DELETE | `/api/auth/tokens.php?id=` | token/session | Revoke a specific auth token by ID |

### Public Endpoints (no auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports/list.php` | Paginated approved reports. Filters: `reporter_mode`, `incident_type`, `severity`, `other_party`, `bbox` (lat1,lng1,lat2,lng2), `date_from`, `date_to` (filter on `incident_date`), `page`, `per_page` (max 200). `bbox` required to prevent full-table dumps. |
| GET | `/api/reports/detail.php?id=` | Single report with photos + comments |
| GET | `/api/lookups.php` | All lookup table values |
| GET | `/api/location/detect.php` | IP-based approximate location (city-level). Fallback when browser geolocation denied. |

### Submit Endpoints (auth or anonymous with contact info)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/reports/upload.php` | Upload photos/video to S3. Returns URLs. Max 10 photos, 1 video (100MB). Rate limited. |
| POST | `/api/reports/submit.php` | Create report. If no auth token, requires `reporter_email` or `reporter_phone`. |
| POST | `/api/comments/submit.php` | Add comment. Anonymous must provide `author_name`. |
| POST | `/api/flags/submit.php` | Flag a report or comment. |

### Authenticated User Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/profile.php` | Own profile, reports, comments |
| PUT | `/api/users/settings.php` | Update username, privacy |
| GET | `/api/users/reports.php` | Own reports (paginated) |

### Moderator+ Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports/pending.php` | Reports awaiting moderation |
| POST | `/api/reports/moderate.php` | Approve/reject with notes |
| GET | `/api/flags/list.php` | Pending flags |
| POST | `/api/flags/resolve.php` | Dismiss/remove |
| GET | `/api/moderation/log.php` | Filterable audit trail |
| GET | `/api/moderation/stats.php` | Moderation analytics: report counts by status, approval/rejection trends, avg resolution time |

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/users/ban.php` | Ban user |
| POST | `/api/users/unban.php` | Unban user |
| POST | `/api/users/role.php` | Change role |
| GET | `/api/admin/settings.php` | Get settings |
| PUT | `/api/admin/settings.php` | Update settings |
| GET | `/api/users/list.php` | User directory (paginated) |

### Removed Endpoints

The following duplicate/legacy endpoints are deleted: `api/report.php`, `api/reports.php`, `api/comment.php`, `api/comments.php`, `api/flag.php`, `api/flags.php`.

---

## 3. Rate Limiting

IP-based rate limiting via `rate_limits` table. Checked at top of each endpoint via `db/rate_limiter.php`.

| Group | Limit | Window | Rationale |
|-------|-------|--------|-----------|
| `public_read` | 120 req | 1 min | Map panning triggers many fetches |
| `submit` | 5 req | 10 min | Reports shouldn't come in bursts |
| `upload` | 10 req | 10 min | Multiple files per report |
| `auth` | 10 req | 10 min | Prevents brute-force |
| `comment` | 10 req | 5 min | Reasonable pace |
| `flag` | 5 req | 10 min | Anti-spam |
| `moderate` | 60 req | 1 min | Mods process queues quickly |

Authenticated users get 2.5x the `public_read` limit (300/min). Over-limit returns 429 with `Retry-After` header. Expired rows pruned on each check (rows older than 1 hour).

Anti-scraping: `bbox` required on list endpoint, pagination capped at 200/page, no bulk export endpoint.

---

## 4. File Uploads

### Photos
- Max 10 per report
- Accepted types: JPEG, PNG, WebP (validated server-side via `finfo_file()`)
- Max 10MB per file
- Server generates filename: `report_{uniqid}.{ext}`
- Stored in S3, URL saved in `report_photos` table

### Video
- Max 1 per report, 100MB limit
- Accepted types: MP4, WebM, MOV
- **Client-side compression:** Use `ffmpeg.wasm` in the browser to compress before upload. Show progress bar. If compression fails or browser doesn't support it, fall back to direct upload with server-side size check.
- Server generates filename: `video_{uniqid}.{ext}`
- Stored in S3, URL saved in `reports.video_url`

### Upload Flow
1. User selects files in the report form
2. JS uploads each file to `/api/reports/upload.php` (shows per-file progress bars)
3. Endpoint returns S3 URLs and a temporary `upload_token` (random string, stored in session or DB)
4. On form submit, URLs + `upload_token` are included in the report payload
5. Submit endpoint validates the `upload_token` matches and URLs point to our S3 bucket

### Orphan Cleanup
Uploaded files not attached to a report within 1 hour are orphans. An S3 lifecycle policy deletes objects in the `uploads/pending/` prefix older than 24 hours. The upload endpoint stores files under this prefix; the submit endpoint moves them to `uploads/reports/{report_id}/` on successful submission.

---

## 5. Frontend Pages

**New pages:** `report.html` (does not exist yet — created from scratch).
**Modified pages:** `index.html`, `login.html`, `user_profile.html`, `moderation_dashboard.html`, `user_directory.html`.

### 5.1 `index.html` — Public Map (no auth required)

- Full-viewport Leaflet map with marker clusters (OpenStreetMap tiles)
- Filter sidebar/panel: reporter mode, incident type, severity, other party, date range
- Map popups: incident type badge, severity color, reporter mode, description, photo thumbnails, comment count, timestamp
- Clicking a marker opens a detail panel with full photos, comment thread, and flag link
- Anyone can add comments (anonymous with name, or logged-in)
- Top nav bar: logo/title, "Submit a Report" button, login/profile link, dark/light mode toggle
- Map auto-fetches markers for visible viewport (`bbox` filter), updates on pan/zoom
- Map state persisted in URL hash (`#lat,lng,zoom`) for shareable links

### 5.2 `report.html` — Submit Report (auth or anonymous)

- If logged in: pre-fills from session, no contact fields
- If anonymous: requires email or phone, shows login nudge
- Fields: reporter mode, other party, incident type, severity, description, map picker, photo upload (multi, drag-and-drop), video upload with compression progress
- Map picker: click to set location, or "Use my location" GPS button
- Upload progress bars per file
- Submit creates report as `status: pending`, shows confirmation

### 5.3 `login.html` — OAuth Login (minimal changes)

Four provider buttons (Google, Apple, Mastodon, BlueSky). Redirects back after login.

### 5.4 `user_profile.html` — User Profile (authenticated)

Username, role, privacy settings. Own reports with status badges. Settings form. Active sessions list.

### 5.5 `moderation_dashboard.html` — Moderation (moderator+)

Pending reports queue, flagged content queue, moderation log, admin settings section, user management, analytics charts.

### 5.6 `user_directory.html` — User List (admin)

Searchable/filterable user table. Role management, ban/unban.

---

## 6. Accessibility (WCAG 2.1 AA)

- Semantic HTML: proper heading hierarchy, `<main>`, `<nav>`, `<section>` with `aria-labelledby`, `<footer>`
- Keyboard navigation: all elements focusable, visible focus rings, skip-to-content link, map keyboard controls
- Screen readers: `aria-live` for dynamic content, `aria-label` on icon-only buttons, `role="status"` for notifications
- Color contrast: 4.5:1 minimum for text, 3:1 for large text and UI components
- Forms: visible labels, `aria-required`, error messages linked via `aria-describedby`
- Reduced motion: `@media (prefers-reduced-motion: reduce)` disables animations
- Touch targets: minimum 44x44px

---

## 7. Dark/Light Mode

Three modes: auto (default, follows system preference), light, dark.

```css
:root { /* light theme */ }
@media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) { /* dark theme */ }
}
[data-theme="dark"] { /* dark theme */ }
```

- Toggle in nav bar (sun/moon icon), cycles: auto -> light -> dark -> auto
- Saved in `localStorage`
- Map tiles: OSM standard (light) / CartoDB Dark Matter (dark)
- All colors as CSS custom properties — no hardcoded values

---

## 8. Location Detection

Removes hardcoded Edmonton dependency.

1. **First visit:** Browser Geolocation API with user-facing explanation
2. **If denied:** Server-side IP geolocation via `GET /api/location/detect.php` (MaxMind GeoLite2 or similar, city-level)
3. **If both fail:** World view (zoom 2, center 0,0)
4. **Cached:** Last map position stored in `localStorage` for subsequent visits
5. **Report form:** "Use my location" GPS button auto-fills lat/lng
6. **URL sharing:** Map state in URL hash (`#lat,lng,zoom`)

---

## 9. CSS Approach

- Shared `assets/css/style.css` across all pages
- CSS custom properties for all colors, spacing, and radii
- Mobile-first responsive design
- No framework — vanilla CSS
- Adopts PR #3's good patterns: badge components, card layouts, responsive grid, `.form-surface`, `.form-grid`
- Dark theme variables as override layer

---

## 10. Files Removed

Legacy/duplicate files deleted:
- `api/report.php`
- `api/reports.php`
- `api/comment.php`
- `api/comments.php`
- `api/flag.php`
- `api/flags.php`
- `api/users/update_settings.php` (replaced by `api/users/settings.php`)
- `api/admin/promote.php` (consolidated into `api/users/role.php`)
- `seed.sql` (if still present)
- `assets/js/web_ui.js` (PR #3's unused file)
