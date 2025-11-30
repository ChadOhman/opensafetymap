# Contributing to Edmonton Accident & Near Miss Reporting Platform

[![CI/CD](https://github.com/ChadOhman/opensafetymap/actions/workflows/ci.yml/badge.svg)](https://github.com/ChadOhman/opensafetymap/actions/workflows/ci.yml)
[![GitHub release](https://img.shields.io/github/v/release/your-org/accident-reports)](https://github.com/ChadOhman/opensafetymap/releases)
[![Docs](https://img.shields.io/badge/docs-online-blue.svg)](https://chadohman.github.io/opensafetymap/)


We welcome contributions to improve this project! 🎉

---

## 🌀 How to Contribute

1. **Fork the repository**  
   Create your own copy of the repo under your GitHub account.

2. **Create a feature branch**  
   Use clear branch naming:  
   - `feature/<short-description>` (for new features)  
   - `fix/<short-description>` (for bug fixes)  
   - `docs/<short-description>` (for documentation changes)  

   Example:  
   ```bash
   git checkout -b feature/add-report-filters
   ```

3. **Make your changes**  
   Follow the coding standards outlined below.

4. **Commit messages**  
   Use descriptive commit messages in the **imperative mood**:  
   - ✅ `Add moderation filters to dashboard`  
   - ✅ `Fix SQL query for report analytics`  
   - ❌ `Fixed stuff`  

5. **Push and open a Pull Request (PR)**  
   - Push your branch to your fork.  
   - Open a PR against the `main` branch of this repo.  
   - Clearly describe your changes in the PR body.  

---

## ✨ Coding Standards

- **PHP**:  
  - Use PDO prepared statements for all queries.  
  - Follow PSR-12 coding style where possible.  
  - Keep business logic inside API files, reusable helpers in `/db/`.  

- **JavaScript**:  
  - Use ES6 modules (`import/export`).  
  - Favor async/await with `try/catch` for fetch calls.  
  - Keep UI logic in dedicated JS modules (`map.js`, `report_submission.js`, etc.).  

- **CSS**:  
  - Use shared `style.css` for consistency.  
  - Prefer utility classes and avoid inline styles.  

- **Docs**:  
  - Update `README.md` and `QUICKSTART.md` if your changes impact setup.  
  - Add JSDoc/PHPDoc comments where appropriate.  

---

## 🧪 Testing

- Test API endpoints with `curl` or Postman before committing.  
- Verify new features in the browser with seeded data (`seed.sql`).  
- Ensure no regressions on:  
  - Report submission & display  
  - Moderation dashboard workflows  
  - Analytics dashboard  

---

## 🔒 Security

- Never commit real API keys, secrets, or passwords.  
- Use `.env` and `.env.example` for config.  
- Review PRs for SQL injection, XSS, CSRF issues.  

---

## 🙌 Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment. Harassment or discrimination of any kind will not be tolerated.

---

Thanks for contributing! 🚦  
