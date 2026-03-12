# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Edmonton Accident & Near Miss Reporting Platform — a community-driven web app for reporting and moderating traffic incidents on an interactive map. PHP 8.2+ backend with vanilla JavaScript ES6 module frontend, MySQL 8 database, Leaflet.js map with marker clustering.

## Development Setup

```bash
# Docker (recommended)
make up          # Build and start containers (app on :8080, db on :3306)
make seed        # Load test data
make down        # Stop containers
make db-shell    # MySQL shell access
make app-shell   # PHP container shell

# Alternative: PHP built-in server
php -S localhost:8000 -t public
```

## Validation Commands

```bash
# PHP lint (CI runs this)
php -l api/**/*.php db/*.php

# HTML structure validation
python tools/html_checks.py <file>

# Accessibility checks (offline Pa11y alternative)
python tools/a11y_checks.py <file>
```

There are no automated test suites. CI (``.github/workflows/ci.yml``) runs PHP syntax checking and SQL schema validation only.

## Architecture

**Backend:** PHP API endpoints in `api/` using PDO prepared statements. Shared helpers in `db/` (connect.php for DB+session, auth_helper.php for role checks, api_response.php for unified JSON responses, alias_helper.php for random username generation).

**Frontend:** Static HTML pages (`index.html`, `login.html`, `moderation_dashboard.html`, `user_profile.html`, `user_directory.html`) with ES6 modules in `assets/js/`. `api.js` is the centralized fetch wrapper. No build step or bundler.

**Database:** Schema in `sql/schema.sql`. Lookup tables for categories, severity_levels, incident_types. Core tables: users, reports, comments, flags, moderation_log, settings. Seed data in `sql/seed.sql`.

**Auth:** OAuth 2.0 via Google, Apple, Mastodon, BlueSky. Providers configured in `db/oauth_config.php`, endpoints in `api/auth/`.

**Roles:** Three-tier (user/moderator/admin). Role checks enforced in `db/auth_helper.php`. Moderation actions logged immutably to `moderation_log`.

## Coding Standards

- **PHP:** PSR-12 style, PDO prepared statements for all queries, shared helpers in `db/`
- **JavaScript:** ES6 modules, async/await, one module per feature file in `assets/js/`
- **CSS:** Shared `assets/css/style.css`, utility classes, no inline styles or scripts
- **Commits:** Imperative mood ("Add feature" not "Added feature")

## Agent Guidelines (from AGENTS.md)

- Prioritize accessibility and mobile-friendliness
- Keep styling in CSS files, scripting in JS files — no inline
- Run `python tools/html_checks.py` and `python tools/a11y_checks.py` on modified HTML files
- Run Linkinator only when links change
- Document exact validation commands in PR summaries
- Update README.md/docs when workflows or contributor steps change

## Environment Configuration

Copy `.env.example` for DB credentials, S3 config, and OAuth provider secrets. Never commit `.env` files.

## Test Seed Users

- Admin: `brave_wise_owl` | Moderator: `quick_clever_fox` | User: `gentle_happy_otter`
