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
#
# U24: every line this script emits is a single JSON object, shaped to match
# packages/common/src/logger.ts (level, ts, service, message, ...extra fields) so a
# future collector sees one format. Deviations from logger.ts, stated explicitly:
#   - ts is second precision (jq's `now|todate`), not logger.ts's millisecond
#     `toISOString()` — bash/jq have no portable ms-precision clock across macOS/Linux.
#   - errors carry a plain `error` string (clickhouse-client stderr) and `exit_code`,
#     not logger.ts's {name,message,stack} Error shape — bash has no Error object.
# level=="error" goes to stderr, everything else to stdout, matching logger.ts's
# console.error/console.log split. All values are escaped via `jq --arg`/`--argjson`,
# never string-interpolated into JSON text, so filenames/error text containing quotes
# or newlines cannot produce invalid JSON.
set -euo pipefail

if ! command -v jq >/dev/null 2>&1; then
  printf '{"level":"error","ts":"%s","service":"ch-migrate","message":"jq is required but not found in PATH"}\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >&2
  exit 1
fi

# Emit one JSON log line. Usage: log_json <level> <message> [key value]...
# A "key value" pair is passed as --argjson (numeric) if key starts with '#', else --arg (string).
log_json() {
  local level="$1" message="$2"
  shift 2
  local args=(--arg level "$level" --arg service "ch-migrate" --arg message "$message")
  local filter='{level:$level, ts:(now|todate), service:$service, message:$message}'
  while [ "$#" -gt 0 ]; do
    local key="$1" val="$2"
    shift 2
    case "$key" in
      \#*)
        key="${key#\#}"
        args+=(--argjson "$key" "$val")
        ;;
      *)
        args+=(--arg "$key" "$val")
        ;;
    esac
    filter="${filter} + {\"$key\": \$$key}"
  done
  local line
  line="$(jq -cn "${args[@]}" "$filter")"
  if [ "$level" = "error" ]; then
    printf '%s\n' "$line" >&2
  else
    printf '%s\n' "$line"
  fi
}

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATIONS_DIR="$ROOT_DIR/packages/db/migrations/clickhouse"
CONTAINER="${CLICKHOUSE_CONTAINER:-clickhouse-dev}"
META_DB="schema_migrations_db"

# Confirm the container is up before doing anything else.
if ! docker exec "$CONTAINER" true 2>/dev/null; then
  log_json error "container '$CONTAINER' is not running (try: make up)" container "$CONTAINER"
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
  log_json info "no migration files found in $MIGRATIONS_DIR"
  exit 0
fi

for file in "${migrations[@]}"; do
  name="$(basename "$file")"
  already_applied="$(echo "SELECT count() FROM schema_migrations FINAL WHERE name = '$name';" | ch_run "$META_DB")"
  if [ "$already_applied" != "0" ]; then
    log_json info "skip $name (already applied)" migration "$name"
    continue
  fi
  log_json info "applying $name" migration "$name"
  apply_rc=0
  apply_err="$(ch_run_file "$CLICKHOUSE_DB" "$file" 2>&1)" || apply_rc=$?
  if [ "$apply_rc" -ne 0 ]; then
    log_json error "migration $name failed" migration "$name" error "$apply_err" "#exit_code" "$apply_rc"
    exit "$apply_rc"
  fi
  echo "INSERT INTO schema_migrations (name) VALUES ('$name');" | ch_run "$META_DB"
done

log_json info "done"
