# Makefile — monorepo task runner (local dev)
#
# Targets:
#   up            Bring up clickhouse + redis via infra/docker-compose.dev.yml
#   down          Stop and remove dev compose containers
#   migrate       Apply unapplied ClickHouse migrations (idempotent)
#   lag           Print Kafka consumer-group lag; exit non-zero if threshold exceeded
#   start         Start orderbook-writer + api on the host, stdout -> ./logs/*.jsonl
#   stop          Stop whatever `start` started (reads ./logs/*.pid)
#   restart       stop then start
#   tail-logs     Follow both log files
#   health        Run _scripts/health-check.sh against the running stack
#
# No kafka service in compose — Kafka is remote (Oracle). See 00.architecture.mvp1.md §10.
# Ensure .env exists at repo root with at minimum CLICKHOUSE_PASSWORD set.

# --env-file is required: compose's default project directory is where the
# compose file lives (infra/), so without it, .env at the repo root is
# silently not loaded and CLICKHOUSE_PASSWORD defaults to blank.
COMPOSE_FILE := infra/docker-compose.dev.yml
COMPOSE      := docker compose -f $(COMPOSE_FILE) --env-file .env

# §10.2(1): the app writes to stdout only — the LAUNCHER (here) decides
# where stdout lands. Fixed, repo-relative, gitignored (./logs/, see
# .gitignore). Not compose: writer/api run on the host, not in a container.
LOG_DIR := logs

.PHONY: up down migrate lag start stop restart start-writer start-api stop-writer stop-api tail-logs health

up:
	@$(COMPOSE) up -d

down:
	@$(COMPOSE) down

migrate:
	@bash _scripts/ch-migrate.sh

lag:
	@bash _scripts/kafka-lag.sh

# tsx forks a helper (esbuild) when invoked via its own CLI (`tsx src/index.ts`),
# which makes the pid `$!` captures not the pid that matters. Loading tsx's ESM
# loader directly with `node --import` keeps everything under one pid that
# `kill`/`kill -0` can act on directly. Resolved per-app (not a hardcoded pnpm
# store path) so a tsx version bump doesn't silently break this.
tsx_loader = $(shell node -e "console.log(require.resolve('tsx', { paths: ['$(1)'] }))")

# §10.1 applies to `make` output too, not just app stdout — text echoes here
# would fail the same jq -e gate ch-migrate.sh was fixed for. pid is numeric
# and the log path is a literal, so a plain printf is safe (no jq --arg
# escaping needed, unlike ch-migrate.sh's user-derived strings).
start: start-writer start-api

# Idempotent: a pidfile whose pid is still alive means already running —
# skip rather than spawn a second writer onto the same (non-O_APPEND, §2)
# log fd, which would corrupt it. A stale pidfile (process gone) is
# overwritten by the fresh $$! below; pidfiles are never deleted (see
# stop-writer) so this is the only place they get rewritten.
start-writer:
	@mkdir -p $(LOG_DIR)
	@if [ -f $(LOG_DIR)/writer.pid ] && kill -0 "$$(cat $(LOG_DIR)/writer.pid)" 2>/dev/null; then \
		printf '{"level":"info","service":"make","message":"writer already running","pid":%s}\n' "$$(cat $(LOG_DIR)/writer.pid)"; \
	else \
		MOCK_SOURCE=1 node --import "$(call tsx_loader,apps/orderbook-writer)" apps/orderbook-writer/src/index.ts \
			> $(LOG_DIR)/writer.jsonl 2>&1 < /dev/null & echo $$! > $(LOG_DIR)/writer.pid; \
		sleep 1; \
		printf '{"level":"info","service":"make","message":"writer started","pid":%s,"log":"$(LOG_DIR)/writer.jsonl"}\n' "$$(cat $(LOG_DIR)/writer.pid)"; \
	fi

start-api:
	@mkdir -p $(LOG_DIR)
	@if [ -f $(LOG_DIR)/api.pid ] && kill -0 "$$(cat $(LOG_DIR)/api.pid)" 2>/dev/null; then \
		printf '{"level":"info","service":"make","message":"api already running","pid":%s}\n' "$$(cat $(LOG_DIR)/api.pid)"; \
	else \
		node --import "$(call tsx_loader,apps/api)" apps/api/src/index.ts \
			> $(LOG_DIR)/api.jsonl 2>&1 < /dev/null & echo $$! > $(LOG_DIR)/api.pid; \
		sleep 1; \
		printf '{"level":"info","service":"make","message":"api started","pid":%s,"log":"$(LOG_DIR)/api.jsonl"}\n' "$$(cat $(LOG_DIR)/api.pid)"; \
	fi

stop: stop-writer stop-api

# The pidfile is NOT deleted after kill (no `rm` — rules/core.md is
# unconditional). A dead pid left in the file is exactly what health-check's
# "process alive" assertion (kill -0) needs to catch a real crash; `make
# start` above already treats a stale/dead pidfile as "not running" and
# overwrites it, so leaving it behind costs nothing.
stop-writer:
	@if [ -f $(LOG_DIR)/writer.pid ]; then \
		kill "$$(cat $(LOG_DIR)/writer.pid)" 2>/dev/null; \
		printf '{"level":"info","service":"make","message":"writer stop signal sent","pid":%s}\n' "$$(cat $(LOG_DIR)/writer.pid)"; \
	else \
		printf '{"level":"info","service":"make","message":"writer not running (no pidfile)"}\n'; \
	fi

stop-api:
	@if [ -f $(LOG_DIR)/api.pid ]; then \
		kill "$$(cat $(LOG_DIR)/api.pid)" 2>/dev/null; \
		printf '{"level":"info","service":"make","message":"api stop signal sent","pid":%s}\n' "$$(cat $(LOG_DIR)/api.pid)"; \
	else \
		printf '{"level":"info","service":"make","message":"api not running (no pidfile)"}\n'; \
	fi

restart: stop start

tail-logs:
	@tail -f $(LOG_DIR)/writer.jsonl $(LOG_DIR)/api.jsonl

health:
	@bash _scripts/health-check.sh
