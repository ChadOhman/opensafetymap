# 🚀 Getting Started (Quick Guide)

[![CI/CD](https://github.com/ChadOhman/opensafetymap/actions/workflows/ci.yml/badge.svg)](https://github.com/ChadOhman/opensafetymap/actions/workflows/ci.yml)
[![GitHub release](https://img.shields.io/github/v/release/your-org/accident-reports)](https://github.com/ChadOhman/opensafetymap/releases)
[![Docs](https://img.shields.io/badge/docs-online-blue.svg)](https://chadohman.github.io/opensafetymap/)
[![Docs](https://img.shields.io/badge/docs-view-blue.svg)](https://chadohman.github.io/opensafetymap/)
[![Setup Guide](https://img.shields.io/badge/setup-guide-brightgreen.svg)](https://chadohman.github.io/opensafetymap/setup/)


[![CI/CD](https://github.com/ChadOhman/opensafetymap/actions/workflows/ci.yml/badge.svg)](https://github.com/ChadOhman/opensafetymap/actions/workflows/ci.yml)
[![GitHub release](https://img.shields.io/github/v/release/your-org/accident-reports)](https://github.com/ChadOhman/opensafetymap/releases)


## 1. Clone the repo
```bash
git clone https://github.com/ChadOhman/opensafetymap.git
cd accident-reports
```

## 2. Import the database
- Create a MySQL database (e.g., `accidents`).  
- Import the schema + seed data:
```bash
mysql -u your_user -p accidents < seed.sql
```

This creates:
- 👤 Users: `admin (brave_wise_owl)`, `moderator (quick_clever_fox)`, `user (gentle_happy_otter)`  
- 🚦 Reports: pending, approved, rejected  
- 💬 Comments, 🚩 Flags, 📜 Moderation logs for testing  

## 3. Configure DB connection
Edit `db/connect.php`:
```php
$dsn = "mysql:host=localhost;dbname=accidents;charset=utf8mb4";
$user = "your_mysql_user";
$pass = "your_mysql_pass";
```

## 4. Run the server
From the project root:
```bash
php -S localhost:8000 -t public
```

Visit: [http://localhost:8000](http://localhost:8000)

## 5. Test accounts
These are placeholder OAuth users — after your first real login, replace `oauth_provider` + `oauth_id` in the `users` table.  
- **Admin:** `brave_wise_owl`  
- **Moderator:** `quick_clever_fox`  
- **User:** `gentle_happy_otter`  

## 6. Key Pages
- `/` → Map + report submission  
- `/login.html` → OAuth login  
- `/user_profile.html?id=3` → Example user profile  
- `/moderation_dashboard.html` → Moderator & admin tools  

---

That’s it! 🎉  
Your testers can now log in, submit reports, view them on the map, and try out moderation flows with the seeded data.