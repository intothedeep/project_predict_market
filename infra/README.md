# infra/ — local dev stack (colima)

ClickHouse + Redis only. Kafka is remote (Oracle, address in `KAFKA_BOOTSTRAP`) — never
run it locally; see `00.architecture.mvp1.md` §10.

## Runbook

1. **Start colima with enough resources for both containers:**

   ```bash
   colima start --cpu 4 --memory 6
   ```

   If colima is already running with fewer resources, `colima start` with new
   `--cpu`/`--memory` flags updates the running VM.

2. **Confirm the active docker context is colima, not Docker Desktop:**

   ```bash
   docker context ls
   ```

   Look for `colima *` (the `*` marks the active context). If `desktop-linux`
   or `default` is active instead, containers you bring up will not be the
   ones `docker compose ps` or `make up` show you — a known source of
   "it's running but I can't see it" confusion. Switch with
   `docker context use colima` if needed.

3. **Set `CLICKHOUSE_PASSWORD` in the root `.env`:**

   ```bash
   cp infra/env.example .env
   # edit .env, fill in CLICKHOUSE_PASSWORD — required: `docker compose up`
   # refuses to start the clickhouse container if it's unset or blank
   # (compose interpolation error, see infra/env.example for the other vars)
   ```

4. **Bring the stack up via `make up` — not `docker compose ... up -d` run
   directly.** Compose's default project directory is `infra/` (where the
   compose file lives), so a bare `docker compose -f infra/docker-compose.dev.yml
   up -d` from the repo root does **not** pick up the root `.env`. `make up`
   passes `--env-file .env` explicitly; use it.

   ```bash
   make up
   docker compose -f infra/docker-compose.dev.yml --env-file .env ps   # expect both healthy
   ```

5. **Tear down:**

   ```bash
   make down
   ```

## Files

- `docker-compose.dev.yml` — clickhouse + redis services, named volumes,
  healthchecks. No kafka service.
- `clickhouse/custom.xml` — memory limits tuned for the container's
  `mem_limit: 2g` (dev) and short TTLs on ClickHouse's own system log tables
  (otherwise they grow unbounded on a dev machine). No `format_schema_path` /
  proto mount in MVP1 — see the comment in `docker-compose.dev.yml` (the
  official image's entrypoint chown-loops on a read-only mount there; add
  back in M2 with the Kafka-engine work).
- `env.example` — variable names only, no secrets. Copy to repo-root `.env`.
