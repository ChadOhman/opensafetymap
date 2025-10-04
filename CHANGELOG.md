# 📑 Changelog

[![CI/CD](https://github.com/ChadOhman/opensafetymap/actions/workflows/ci.yml/badge.svg)](https://github.com/ChadOhman/opensafetymap/actions/workflows/ci.yml)
[![GitHub release](https://img.shields.io/github/v/release/ChadOhman/opensafetymap)](https://github.com/ChadOhman/opensafetymap/releases)
[![Docs](https://img.shields.io/badge/docs-online-blue.svg)](https://ChadOhman.github.io/opensafetymap/)


All notable changes to this project will be documented in this file.  
This project follows [Semantic Versioning](https://semver.org/).

---

## [0.1.0-alpha] - 2025-10-03
### Added
- Initial MVP release of OpenSafetyMap
- User authentication with OAuth (Google, Apple, Mastodon, BlueSky)
- User roles (user, moderator, admin) with ban enforcement
- Report submission with categories, severity levels, accident/near-miss toggle, photo upload (S3)
- Interactive map with OpenStreetMap + clustering
- User profiles with privacy controls, aliases, reports, and comments
- Moderation dashboard with pending reports, flags, moderation notes, immutable logs, and analytics
- Analytics dashboard (approval/rejection rates, average resolution time, trends)
- Database seed data (users, reports, comments, flags, logs) for testing
- Documentation: README.md, QUICKSTART.md, CONTRIBUTING.md, CODE_OF_CONDUCT.md, ROADMAP.md, SECURITY.md
- GitHub setup: issue templates, PR template, .gitignore, .env.example, LICENSE (MIT)

---

## [Unreleased]
### Planned
- Map heatmap visualization
- Email notifications for approvals/rejections
- Improved responsive UI design
