# 💻 Developer Guide

> 🟢 New here? Start with the [Setup Guide](setup.md) to get your environment running quickly.


This guide is for developers who want to contribute to or extend the OpenSafetyMap.

---

## 🛠️ Prerequisites
- **PHP 8.2+**
- **MySQL 8+**
- **Node.js (for frontend build tasks, optional)**
- **Composer** (if using additional PHP libraries)
- **Python 3** (if working with MkDocs documentation)

---

## ⚙️ Setting Up Locally

1. Clone the repository:
```bash
git clone https://github.com/ChadOhman/opensafetymap.git
cd opensafetymap
```

2. Import the database:
```bash
mysql -u your_user -p accidents < seed.sql
```

3. Configure database in `.env`:
```env
DB_HOST=localhost
DB_NAME=accidents
DB_USER=root
DB_PASS=secret
```

4. Start PHP local server:
```bash
php -S localhost:8000 -t public
```

5. Open `http://localhost:8000` in your browser.

---

## 📂 Codebase Structure

```
opensafetymap/
├── api/               # Backend PHP APIs
│   ├── auth/          # OAuth endpoints
│   ├── reports/       # Report submission & management
│   ├── moderation/    # Moderation actions
│   ├── analytics/     # Analytics data endpoints
│   └── users/         # User management
├── db/                # Database helpers & connection
├── public/            # Frontend HTML/JS/CSS
│   ├── index.html     # Map & reports
│   ├── moderation_dashboard.html
│   └── js/            # JS modules
├── docs/              # Documentation site (MkDocs)
├── seed.sql           # Schema + seed data
├── .env.example       # Example environment file
├── mkdocs.yml         # Documentation config
└── .github/           # GitHub workflows & templates
```

---

## 🔌 APIs

- All API endpoints are under `/api/`.
- Example: `GET /api/reports/list.php`
- Authentication uses **OAuth tokens** mapped to local user accounts.

---

## 🔒 Security Notes

- Always use **prepared statements** for DB queries.  
- Never commit real `.env` credentials.  
- Validate file uploads (S3).  
- Sanitize user inputs to prevent XSS.  

---

## 🚀 Extending the Platform

- Add new API endpoints in `/api/`  
- Add frontend modules in `/public/js/`  
- Update database schema via migration (then update `seed.sql`)  
- Document changes in `CHANGELOG.md` and `ROADMAP.md`  

---

## 🧪 Testing

- Test APIs with Postman or curl.  
- Use seeded data (`seed.sql`) for dev testing.  
- CI/CD workflow runs PHP lint + SQL validation.  

---

## 📖 Documentation

- Docs are written in Markdown under `/docs/`.  
- Serve locally with:
```bash
mkdocs serve
```
- Deploy with:
```bash
mkdocs gh-deploy
```

---

Happy hacking! 🥷
