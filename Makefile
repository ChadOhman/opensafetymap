up:
	docker compose up --build -d

down:
	docker compose down

logs:
	docker compose logs -f

ps:
	docker compose ps

restart:
	docker compose down
	docker compose up --build -d

db-shell:
	docker compose exec db mysql -u root -p$${DB_ROOT_PASSWORD:-rootpass} $${DB_NAME:-accidents}

app-shell:
	docker compose exec app bash

seed:
	docker compose exec -T db mysql -u root -p$${DB_ROOT_PASSWORD:-rootpass} $${DB_NAME:-accidents} < sql/seed.sql

reset-db:
	docker compose down -v
	docker compose up --build -d

lint:
	find . -name '*.php' -not -path './vendor/*' | xargs -I {} php -l {}
