# 🚦 OpenSafetyMap 

## An Accident & Near Miss Reporting Platform

[![CI/CD](https://github.com/ChadOhman/opensafetymap/actions/workflows/ci.yml/badge.svg)](https://github.com/ChadOhman/opensafetymap/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![GitHub release](https://img.shields.io/github/v/release/ChadOhman/opensafetymap)](https://github.com/ChadOhman/opensafetymap/releases)
[![Contributors](https://img.shields.io/github/contributors/ChadOhman/opensafetymap)](https://github.com/ChadOhman/opensafetymap/graphs/contributors)
[![Open Issues](https://img.shields.io/github/issues/ChadOhman/opensafetymap)](https://github.com/ChadOhman/opensafetymap/issues)
[![Open PRs](https://img.shields.io/github/issues-pr/ChadOhman/opensafetymap)](https://github.com/ChadOhman/opensafetymap/pulls)
[![Docs](https://img.shields.io/badge/docs-online-blue.svg)](https://ChadOhman.github.io/opensafetymap/)
[![Docs](https://img.shields.io/badge/docs-view-blue.svg)](https://ChadOhman.github.io/opensafetymap/)
[![Setup Guide](https://img.shields.io/badge/setup-guide-brightgreen.svg)](https://ChadOhman.github.io/opensafetymap/setup/)


A community-driven web application for reporting, tracking, and moderating traffic-related **accidents and near misses**.  
Built with **PHP + MySQL backend** and a **vanilla JS + Leaflet frontend**.

---

## ✨ Features

### 👥 User System
- OAuth login via **Google, Apple, Mastodon, BlueSky**
- Random **alias generator** (adjective + adjective + noun) for privacy
- User roles: **user**, **moderator**, **admin**
- Privacy settings: **public / logged-in only / private**
- Ban enforcement (login blocked for banned users)
- User profile pages with reports and comments

### 📝 Reporting
- Report **Accidents** or **Near Misses**
- Categories: **Pedestrian, Cyclist, Motor Vehicle**
- Severity levels: **Minor, Moderate, Severe**
- Upload photos (stored in S3)
- Status workflow: **Pending → Approved/Rejected**
- Reports displayed on **OpenStreetMap with clustering**

### 💬 Comments & Flags
- Users can comment on reports
- Flag system for inappropriate reports/comments
- Moderators can **dismiss or remove** flagged content

### 🛡️ Moderation
- Unified moderation dashboard:
  - **Pending reports** (approve/reject with notes)
  - **Flagged content** (dismiss/remove with notes)
  - **Settings** (require approval before publishing)
  - **Analytics**
  - **Moderation log**
- Moderation log:
  - Logs all actions (approve/reject, ban/unban, flag resolve)
  - Immutable moderation notes
  - Filters: by action, keyword, date range

### 📊 Analytics
- Total reports (approved, rejected, pending)
- **Approval vs rejection trends** (weekly chart)
- Average moderation resolution time
- Moderator performance insights (extendable)

---

## 🛠️ Tech Stack

- **Backend:** PHP 8+, MySQL 8, PDO
- **Frontend:** HTML5, CSS3, JavaScript (ES6 Modules)
- **Maps:** Leaflet.js + MarkerCluster
- **Auth:** OAuth 2.0 (Google, Apple, Mastodon, BlueSky)
- **Storage:** Amazon S3 (photo uploads)

---

## 📂 Project Structure

```
accident-reports/
│── api/
│   ├── auth/            # OAuth logins + logout
│   ├── users/           # Profiles, roles, bans
│   ├── reports/         # Submit, list, moderate
│   ├── flags/           # Submit, list, resolve
│   ├── admin/           # Settings, analytics
│   └── moderation/      # Moderation log
│── db/
│   ├── connect.php      # DB connection + session
│   ├── auth_helper.php  # Auth + role checks
│   └── api_response.php # Unified API response helper
│── public/
│   ├── index.html       # Map + reporting form
│   ├── login.html       # OAuth login
│   ├── user_profile.html
│   └── moderation_dashboard.html
│── assets/
│   ├── css/style.css    # Shared styles
│   └── js/              # JS modules
│       ├── api.js
│       ├── map.js
│       ├── report_submission.js
│       ├── user_profile.js
│       ├── moderation.js
│       └── auth.js
└── README.md
```

---

## 🗃️ Database Schema (Simplified)

```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255),
  oauth_provider VARCHAR(50),
  oauth_id VARCHAR(255),
  role ENUM('user','moderator','admin') DEFAULT 'user',
  status ENUM('active','banned') DEFAULT 'active',
  privacy ENUM('public','logged-in','private') DEFAULT 'public',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  category_id INT,
  severity_id INT,
  incident_type_id INT,
  description TEXT,
  latitude DOUBLE,
  longitude DOUBLE,
  photo_url TEXT,
  status ENUM('pending','approved','rejected') DEFAULT 'pending',
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  report_id INT,
  content TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE flags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  report_id INT NULL,
  comment_id INT NULL,
  reason TEXT,
  status ENUM('pending','dismissed','removed') DEFAULT 'pending',
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE moderation_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  moderator_id INT,
  action_type VARCHAR(50),
  target_id INT,
  details TEXT,
  notes TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE settings (
  id INT PRIMARY KEY,
  require_approval TINYINT(1) DEFAULT 1
);

CREATE TABLE categories (id INT PRIMARY KEY, name VARCHAR(50));
CREATE TABLE severity_levels (id INT PRIMARY KEY, name VARCHAR(50));
CREATE TABLE incident_types (id INT PRIMARY KEY, name VARCHAR(50));
```

---

## 🚀 Installation

### 1. Clone the repo
```bash
git clone https://github.com/your-org/accident-reports.git
cd accident-reports
```

### 2. Set up database
- Import schema above into MySQL
- Add reference data for categories, severity, incident types
- Create initial admin user manually

### 3. Configure DB connection
Edit `db/connect.php`:
```php
$dsn = "mysql:host=localhost;dbname=accidents;charset=utf8mb4";
$user = "your_mysql_user";
$pass = "your_mysql_pass";
```

### 4. Configure S3
- Update report submission API to upload photos to your S3 bucket
- Store `photo_url` in DB

### 5. Run locally
Use PHP’s built-in server:
```bash
php -S localhost:8000 -t public
```

Open [http://localhost:8000](http://localhost:8000).

---

## 🔒 Roles & Permissions

- **User** → Submit reports, comment, flag content  
- **Moderator** → Moderate reports & flags, add notes  
- **Admin** → All moderator actions + manage settings, roles, bans  

---

## 📌 Roadmap

- [ ] Moderator performance analytics (leaderboard)  
- [ ] Email notifications for approvals/rejections  
- [ ] Map heatmap visualization of reports  
- [ ] Export moderation logs to CSV/Excel  

---

## 🧑‍💻 Contributors

- Backend: PHP/MySQL  
- Frontend: JS/Leaflet  
- Maintainer: *Your Name*  

---

## 📜 License

MIT License.  
Free to use, modify, and distribute.  