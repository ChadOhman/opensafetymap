# 🚀 Getting Started

Follow these steps to run the project locally.

1. Clone the repo
```bash
git clone https://github.com/ChadOhman/opensafetymap.git
cd accident-reports
```

2. Import the database
```bash
mysql -u your_user -p accidents < seed.sql
```

3. Configure DB in `db/connect.php`

4. Start server
```bash
php -S localhost:8000 -t public
```
