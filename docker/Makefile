# Makefile for Docker shortcuts

up:
	docker-compose -f docker/docker-compose.yml up --build -d

down:
	docker-compose -f docker/docker-compose.yml down

logs:
	docker-compose -f docker/docker-compose.yml logs -f

ps:
	docker-compose -f docker/docker-compose.yml ps

restart:
	docker-compose -f docker/docker-compose.yml down
	docker-compose -f docker/docker-compose.yml up --build -d

db-shell:
	docker exec -it accident-reports-db mysql -u root -pexample opensafetymap

app-shell:
	docker exec -it accident-reports-app bash

seed:
	docker exec -i accident-reports-db mysql -u root -pexample opensafetymap < seed.sql
