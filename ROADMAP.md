# 🗺️ Project Roadmap

[![CI/CD](https://github.com/ChadOhman/opensafetymap/actions/workflows/ci.yml/badge.svg)](https://github.com/ChadOhman/opensafetymap/actions/workflows/ci.yml)
[![GitHub release](https://img.shields.io/github/v/release/ChadOhman/opensafetymap)](https://github.com/ChadOhman/opensafetymap/releases)
[![Docs](https://img.shields.io/badge/docs-online-blue.svg)](https://ChadOhman.github.io/opensafetymap/)


This roadmap outlines upcoming features, improvements, and long-term goals for the Edmonton Accident & Near Miss Reporting Platform.

---

## ✅ Completed (MVP)
- User authentication with OAuth (Google, Apple, Mastodon, BlueSky)
- User roles (user, moderator, admin) with ban enforcement
- Report submission (accidents & near misses) with categories, severity, photo uploads
- OpenStreetMap with clustering of reports
- User profiles with reports, comments, and privacy controls
- Moderation dashboard with:
  - Pending reports queue
  - Flagged content management
  - Moderation notes and immutable logs
  - Analytics dashboard (approval/rejection rates, resolution times, trends)
- Seed data with realistic sample reports, comments, flags, logs

---

## 🎯 Short-Term Goals
- [ ] Implement heatmap visualization on map
- [ ] Add email notifications for report approvals/rejections
- [ ] Improve UI styling with responsive design and mobile-friendly layouts
- [ ] Tagging license plates to incidents, owners to be able to look up their plate to see if there are any tagged incidents

---

## 🚀 Mid-Term Goals
- [ ] Add French language support
- [ ] Implement notifications system (in-app alerts for comments, flags, moderation actions)
- [ ] Enhance reporting form with step-by-step wizard and improved UX
- [ ] Add batch moderation actions for efficiency
- [ ] Introduce bulk import/export of reports for city data integration

---

## 🌐 Long-Term Vision
- [ ] Build native mobile apps (iOS & Android) using a shared API backend
- [ ] Integrate with city open data portals for bidirectional sharing
- [ ] Machine learning to detect duplicate reports and spam submissions
- [ ] Advanced analytics dashboards (heatmaps, severity over time, location clustering by type)
- [ ] Public API for researchers and third-party integrations

---

## 📌 Contribution Guidelines
If you'd like to help with roadmap features:
- Open an issue labeled `roadmap` with your suggestion or implementation proposal.
- Coordinate with maintainers before working on larger features.
- Follow [CONTRIBUTING.md](CONTRIBUTING.md) for coding standards and workflow.

---

*This roadmap is a living document and will evolve with the needs of the community.*
