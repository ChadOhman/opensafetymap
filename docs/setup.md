# 🚀 Project Setup Guide

This guide explains how to get the Edmonton Accident & Near Miss Reporting Platform running locally in just a few steps.

---

## 🛠️ Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/)
- [Make](https://www.gnu.org/software/make/) (optional, but recommended)

---

## ⚡ Quick Start

1. **Clone the repository**  
```bash
git clone https://github.com/ChadOhman/opensafetymap.git
cd accident-reports
```

2. **Start the stack with Docker Compose**  
```bash
make up
```

This will spin up:
- **app** → PHP + Apache web app (http://localhost:8080)  
- **db** → MySQL database (port 3306, user `root`, pass `example`)  

3. **Seed the database**  
```bash
make seed
```

This will import `seed.sql` into the MySQL database.

4. **Visit the app**  
Open your browser:  
👉 [http://localhost:8080](http://localhost:8080)

---

## 🧰 Useful Commands

- `make up` → Start stack  
- `make down` → Stop stack  
- `make logs` → Tail container logs  
- `make ps` → Show running containers  
- `make restart` → Restart containers  
- `make db-shell` → Open MySQL shell inside DB container  
- `make app-shell` → Open shell inside PHP app container  
- `make seed` → Re-import database schema & test data  

---

## ✅ You're Ready!

You now have a full local environment running the project. 🎉  
Next steps: Check the [Developer Guide](developer_guide.md) for contributing details.  
