#!/usr/bin/env bash
# _scripts/ch-migrate.sh — apply ClickHouse migrations in packages/db/migrations/clickhouse/
# in filename order. Idempotent: each migration is applied at most once, tracked in a
# `schema_migrations` bookkeeping table that lives in its OWN database (not
# $CLICKHOUSE_DB) so `SHOW TABLES` in the contract database stays exactly the six
# §3.4 data tables — no bookkeeping table leaks into the schema the app/reviewer reads.
#
# Invoked by `make migrate` (Makefile). Talks to the clickhouse-dev container via
# `docker exec` + `clickhouse-client` (no local clickhouse client binary required), and
# reads CLICKHOUSE_USER/PASSWORD/DB from the CONTAINER's own environment (already set
# from root .env by infra/docker-compose.dev.yml) — no host-side .env parsing needed.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATIONS_DIR="$ROOT_DIR/packages/db/migrations/clickhouse"
CONTAINER="${CLICKHOUSE_CONTAINER:-clickhouse-dev}"
META_DB="schema_migrations_db"

# Confirm the container is up before doing anything else.
if ! docker exec "$CONTAINER" true 2>/dev/null; then
  echo "ch-migrate: container '$CONTAINER' is not running (try: make up)" >&2
  exit 1
fi

CLICKHOUSE_DB="$(docker exec "$CONTAINER" sh -c 'echo $CLICKHOUSE_DB')"

ch_run() {
  # $1 = database name; SQL on stdin
  docker exec -i "$CONTAINER" sh -c "clickhouse-client --user \"\$CLICKHOUSE_USER\" --password \"\$CLICKHOUSE_PASSWORD\" --database '$1'"
}

ch_run_file() {
  # $1 = database name, $2 = file path (host)
  docker exec -i "$CONTAINER" sh -c "clickhouse-client --user \"\$CLICKHOUSE_USER\" --password \"\$CLICKHOUSE_PASSWORD\" --database '$1'" <"$2"
}

echo "CREATE DATABASE IF NOT EXISTS $META_DB;" | ch_run "default"

echo "CREATE TABLE IF NOT EXISTS schema_migrations (
    name       String,
    applied_at DateTime64(3) DEFAULT now64(3)
) ENGINE = ReplacingMergeTree(applied_at)
ORDER BY name;" | ch_run "$META_DB"

shopt -s nullglob
migrations=("$MIGRATIONS_DIR"/*.sql)
shopt -u nullglob

if [ ${#migrations[@]} -eq 0 ]; then
  echo "ch-migrate: no migration files found in $MIGRATIONS_DIR"
  exit 0
fi

for file in "${migrations[@]}"; do
  name="$(basename "$file")"
  already_applied="$(echo "SELECT count() FROM schema_migrations FINAL WHERE name = '$name';" | ch_run "$META_DB")"
  if [ "$already_applied" != "0" ]; then
    echo "ch-migrate: skip $name (already applied)"
    continue
  fi
  echo "ch-migrate: applying $name"
  ch_run_file "$CLICKHOUSE_DB" "$file"
  echo "INSERT INTO schema_migrations (name) VALUES ('$name');" | ch_run "$META_DB"
done

echo "ch-migrate: done"
