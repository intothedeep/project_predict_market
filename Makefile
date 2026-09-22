# Makefile — monorepo task runner (local dev)
#
# Targets:
#   up       Bring up clickhouse + redis via infra/docker-compose.dev.yml
#   down     Stop and remove dev compose containers
#   migrate  Apply unapplied ClickHouse migrations (idempotent)
#   lag      Print Kafka consumer-group lag; exit non-zero if threshold exceeded
#
# No kafka service in compose — Kafka is remote (Oracle). See 00.architecture.mvp1.md §10.
# Ensure .env exists at repo root with at minimum CLICKHOUSE_PASSWORD set.

# --env-file is required: compose's default project directory is where the
# compose file lives (infra/), so without it, .env at the repo root is
# silently not loaded and CLICKHOUSE_PASSWORD defaults to blank.
COMPOSE_FILE := infra/docker-compose.dev.yml
COMPOSE      := docker compose -f $(COMPOSE_FILE) --env-file .env

.PHONY: up down migrate lag

up:
	$(COMPOSE) up -d

down:
	$(COMPOSE) down

migrate:
	bash _scripts/ch-migrate.sh

lag:
	bash _scripts/kafka-lag.sh
