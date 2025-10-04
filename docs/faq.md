# ❓ Frequently Asked Questions (FAQ)

This FAQ covers common questions for users, moderators, admins, and developers.

---

## 👤 Users

**Q: Do I need an account to view reports?**  
A: No, you can browse the map anonymously. An account is required to submit reports, comment, or flag content.

**Q: How do I get an alias username?**  
A: When you first sign in with Google, Apple, Mastodon, or BlueSky, the system generates a random alias for privacy.

**Q: Can I delete my reports or comments?**  
A: Yes, you can delete your own reports and comments from your profile page.

**Q: How do I make my profile private?**  
A: In your profile settings, you can choose Public, Members-only, or Private visibility.

---

## 🛡️ Moderators

**Q: How do I become a moderator?**  
A: Admins assign the moderator role to trusted users.

**Q: Can I promote someone to moderator?**  
A: No, only admins can assign or remove roles.

**Q: Are moderation notes editable?**  
A: No, notes are immutable for accountability.

**Q: Where can I see my moderation history?**  
A: The Moderation Log records every action, visible to moderators and admins.

---

## 🛠️ Admins

**Q: How can I require approval for reports?**  
A: Toggle the **Require Approval** setting in the Admin Dashboard.

**Q: Can admins see private user profiles?**  
A: No, privacy settings apply to all roles, including admins.

**Q: How are bans handled?**  
A: Admins and moderators can ban/unban users. All actions are logged in the moderation history.

---

## 💻 Developers

**Q: How do I set up the project locally?**  
A: See the [Developer Guide](developer_guide.md) for full setup instructions.

**Q: Where are API endpoints located?**  
A: Under `/api/`, grouped by feature (auth, reports, moderation, analytics, users).

**Q: How do I extend the schema?**  
A: Update the MySQL schema, modify `seed.sql`, and document changes in `CHANGELOG.md`.

**Q: How are docs deployed?**  
A: The project uses MkDocs with GitHub Actions. Docs auto-deploy to GitHub Pages on pushes to `main`.

---

## 🌐 General

**Q: Is my real name shown anywhere?**  
A: No, the platform only uses alias usernames for privacy.

**Q: Can the data be shared with researchers or the city?**  
A: Yes, future versions will provide a public API and export features.

**Q: Where do I report bugs or suggest features?**  
A: Open a GitHub Issue using the provided templates.

---

Still have questions?  
Check the [Glossary](glossary.md) or open an Issue on GitHub.  
