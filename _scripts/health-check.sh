#!/usr/bin/env bash
# _scripts/health-check.sh — re-asserts MVP1's claimed invariants against the
# RUNNING stack (00.architecture.mvp1.md §10.2(3)). Not a test suite: no
# runner, no *.test.*, observes the live system rather than code behavior
# (rules/core.md — tests are suspended repo-wide).
#
# Four assertions, each MVP1's own claim about itself:
#   1. writer + api processes are alive (via Makefile pidfiles, `make start`)
#   2. zero Kafka sockets on the host (MVP1 explicitly excludes real Kafka)
#   3. zero jq-failing lines across the fixed-destination logs (§10.1's gate,
#      re-run against the fixed logs §10.2(1) put in place)
#   4. the writer's last log line is recent (no silent stall)
#
# Output: one JSON line per assertion (log_json, same shape as
# _scripts/ch-migrate.sh -> packages/common/src/logger.ts) plus a summary
# line. Exit 0 iff all four pass, non-zero otherwise.
set -euo pipefail

if ! command -v jq >/dev/null 2>&1; then
  printf '{"level":"error","ts":"%s","service":"health-check","message":"jq is required but not found in PATH"}\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$ROOT_DIR/logs"
STALE_THRESHOLD_S="${HEALTH_STALE_THRESHOLD_S:-15}"

# Same log_json helper as ch-migrate.sh (U24 precedent) — copied, not
# imported: bash has no module system worth the indirection for one function,
# and ch-migrate.sh is not touched here (karpathy-guidelines: no refactor of
# adjacent working code).
log_json() {
  local level="$1" message="$2"
  shift 2
  local args=(--arg level "$level" --arg service "health-check" --arg message "$message")
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

failures=0

# ── 1. processes alive ──────────────────────────────────────────────────────
check_process() {
  local name="$1" pidfile="$2"
  if [ ! -f "$pidfile" ]; then
    log_json error "process check failed: no pidfile (not started via make start)" check "process:$name" pidfile "$pidfile"
    failures=$((failures + 1))
    return
  fi
  local pid
  pid="$(cat "$pidfile")"
  if kill -0 "$pid" 2>/dev/null; then
    log_json info "process alive" check "process:$name" "#pid" "$pid"
  else
    log_json error "process check failed: pid not alive" check "process:$name" "#pid" "$pid" pidfile "$pidfile"
    failures=$((failures + 1))
  fi
}
check_process "writer" "$LOG_DIR/writer.pid"
check_process "api" "$LOG_DIR/api.pid"

# ── 2. zero Kafka sockets ───────────────────────────────────────────────────
# MVP1 excludes real Kafka entirely (00.architecture.mvp1.md §1, §10) — any
# established connection to a Kafka-shaped port (9092) is a scope violation.
# Host-wide, not scoped to writer/api pids, so this actually catches a
# violation rather than only ever passing by construction.
kafka_sockets="$(lsof -nP -iTCP:9092 -sTCP:ESTABLISHED 2>/dev/null | tail -n +2 | wc -l | tr -d ' ' || true)"
if [ "$kafka_sockets" -eq 0 ]; then
  log_json info "no Kafka sockets" check "kafka-sockets" "#count" "$kafka_sockets"
else
  log_json error "Kafka sockets found — MVP1 excludes real Kafka" check "kafka-sockets" "#count" "$kafka_sockets"
  failures=$((failures + 1))
fi

# ── 3. zero jq-failing lines in the fixed-destination logs ─────────────────
# Re-runs §10.1's gate against the fixed home §10.2(1) gave the logs. A line
# must be a JSON object carrying logger.ts's actual fields (level, ts,
# service, message) — jq -e so a failing line trips the exit code, not just
# a printed false (§10.1's own stated reasoning for -e over `jq .`).
# One jq process for the whole file, not one per line (`fromjson?` inside a
# jq expression, not a shell loop respawning jq per line) — a per-line loop
# measured ~450x slower on a 23.6k-line file (63s vs 0.14s) and this check's
# entire point is being cheap enough to re-run.
check_log() {
  local name="$1" file="$2"
  if [ ! -f "$file" ]; then
    log_json error "log check failed: file does not exist" check "log:$name" file "$file"
    failures=$((failures + 1))
    return
  fi
  local counts total bad
  counts="$(jq -nR '
    [inputs | select(length>0)] as $lines |
    { total: ($lines | length),
      bad: ($lines | map(select(
              (try (fromjson | (type=="object" and has("level") and has("ts") and has("service") and has("message"))) catch false)
              | not
            )) | length) }
  ' "$file")"
  total="$(jq -r '.total' <<<"$counts")"
  bad="$(jq -r '.bad' <<<"$counts")"
  if [ "$total" -eq 0 ]; then
    log_json error "log check failed: zero lines (0/0 is not a pass, §10.1)" check "log:$name" file "$file"
    failures=$((failures + 1))
  elif [ "$bad" -eq 0 ]; then
    log_json info "all lines are structured" check "log:$name" "#total" "$total" "#bad" "$bad"
  else
    log_json error "log check failed: non-jq-conforming lines present" check "log:$name" "#total" "$total" "#bad" "$bad"
    failures=$((failures + 1))
  fi
}
check_log "writer" "$LOG_DIR/writer.jsonl"
check_log "api" "$LOG_DIR/api.jsonl"

# ── 4. last update recent ───────────────────────────────────────────────────
# Signal is the writer's last "snapshot applied" log line's ts (write time),
# not the Redis hash's time_ms — the mock is a fixed anchor (commit 6e62abe)
# replayed under the §4.4 LWW guard, so once a pass's time_ms is written the
# guard rejects same-or-older re-sends and the hash stops advancing between
# passes; that is expected replay behavior, not staleness. The log line's own
# ts is appended on every tick regardless of applied/rejected, so it tracks
# "is the writer still doing work" directly.
# -R + fromjson? (not the bare object filter used above): a non-JSON line
# here must not crash this check (that failure already belongs to check 3)
# — fromjson? turns a parse failure into `null`, which select() drops.
last_ts="$(tail -n 50 "$LOG_DIR/writer.jsonl" 2>/dev/null | jq -R 'fromjson? | select(.message=="snapshot applied") | .ts' -r | tail -1 || true)"
if [ -z "${last_ts:-}" ]; then
  log_json error "recency check failed: no 'snapshot applied' line found" check "recency"
  failures=$((failures + 1))
else
  last_epoch="$(jq -rn --arg ts "$last_ts" '$ts | (split(".")[0] + "Z" | fromdateiso8601)')"
  now_epoch="$(date -u +%s)"
  age_s=$((now_epoch - last_epoch))
  if [ "$age_s" -le "$STALE_THRESHOLD_S" ]; then
    log_json info "writer log is recent" check "recency" "#age_s" "$age_s" "#threshold_s" "$STALE_THRESHOLD_S" last_ts "$last_ts"
  else
    log_json error "recency check failed: writer log is stale" check "recency" "#age_s" "$age_s" "#threshold_s" "$STALE_THRESHOLD_S" last_ts "$last_ts"
    failures=$((failures + 1))
  fi
fi

# ── summary ──────────────────────────────────────────────────────────────────
if [ "$failures" -eq 0 ]; then
  log_json info "health check passed" "#failures" "$failures"
  exit 0
else
  log_json error "health check failed" "#failures" "$failures"
  exit 1
fi
