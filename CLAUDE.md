# CLAUDE.md

Open Safety Map — road safety incident reporting platform. Node.js 20 + TypeScript 5 backend, MySQL 8, vanilla JS ES6 module frontend with Leaflet.js.

## Commands

```bash
make up          # Build and start Docker containers (app :8080, db :3306)
make down        # Stop containers
make seed        # Load test data into running DB
make reset-db    # Nuke volumes and rebuild from scratch
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
src/                 # TypeScript backend (see src/CLAUDE.md)
public/              # Static frontend (see public/CLAUDE.md)
sql/                 # Schema + seed data
docker/              # Dockerfile (multi-stage Node.js build)
scripts/             # Setup and install scripts
docs/                # MkDocs documentation site
tools/               # Offline validation scripts
```

## Coding Standards

- **TypeScript:** Strict mode, Express route handlers with proper typing, mysql2 prepared statements
- **JS:** ES6 modules, async/await, `escapeHTML()` on all user content before DOM insertion
- **CSS:** All colors via custom properties, no hardcoded color values. Page-specific styles in `style.css` under section headers, not inline `<style>` blocks
- **HTML:** Skip link, `main#main-content`, `aria-live="polite"` status region on every page. CDN scripts pinned to versions with SRI integrity hashes
- **Commits:** Imperative mood ("Add feature" not "Added feature")

## Test Seed Users

Admin: `brave_wise_owl` | Moderator: `quick_clever_fox` | User: `gentle_happy_otter`
