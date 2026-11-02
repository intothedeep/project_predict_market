# project_market_predict

**A BTC data pipeline. Phase MVP1 (mock only) passed its exit check on 2026-09-24. Phase MVP2 is still closed.**

MVP means minimum viable product. MVP1, MVP2 and MVP3 name the three build phases.

Reference date: 2026-11-01 (last line of `STATUS.md`)

## 1. Why we build this

- The pipeline collects BTC data from four venues.
- Kalshi and Polymarket are prediction markets.
- Binance and Coinbase are spot markets.
- It collects, stores, and shows the data on one schema.
- A schema is the agreed shape of the data.
- The schema flows in this order: proto, codec, ClickHouse data definition language (DDL).
- MVP1 proves one thing. The round trip `web → api → Redis/ClickHouse` runs with 0 lines of real pipeline code.
- The screen draws the order book of two venues. So the schema and the flow are correct.

Note: `PLAN.md` has no mission block yet. The text above comes from the Intent section of `PLAN.md`.

## 2. Structure

```text
 [MVP2~3]                                        [MVP1: replaced by mock]
 3 producers (real WebSocket) ──► Kafka (remote Oracle)   mocks/*.jsonl ──┐
 kalshi / binance / coinbase      │                              │
                                  ▼  (MVP3)                      ▼
                          orderbook-writer  ◄── MOCK_SOURCE=1 (mockSource)
                                  │
                ┌─────────────────┴──────────────────┐
                ▼                                    ▼
          Redis (current state)              ClickHouse (history)
          ob:{venue}:{ticker}                6 tables, ReplacingMergeTree
                │                                    │
                └──────────────► api :3001 (Hono) ◄──┘  (ClickHouse reads not wired)
                                    │ SSE
                                    ▼
                              web :5173 (Vite + React)
```

| Part | MVP1 | Later |
| --- | --- | --- |
| Mock replay → orderbook-writer → Redis | Runs | Replaced by kafkaSource in MVP3 |
| api → web (Server-Sent Events, SSE) | Runs | Kept |
| ClickHouse | Seed and migrations only | Kafka engine added in MVP2 |
| Kafka connections | 0 | From MVP2 |
| 3 producers (apps that read a venue WebSocket and send it to Kafka) | Build only, not started | Binance (MVP2), Kalshi (MVP3) |

## 3. Apps and packages

| Name | Role | Main packages | Phase that runs it |
| --- | --- | --- | --- |
| `apps/orderbook-writer` | Loads snapshots into the Redis current state | redis, zod | MVP1 (mock) |
| `apps/api` | Order book Representational State Transfer (REST) and Server-Sent Events (SSE) | hono, redis, zod | MVP1 |
| `apps/web` | One-screen collection dashboard | react, vite | MVP1 |
| `apps/prod-crypto-binance-ts` | Binance BTC ticks and trades | ws | MVP2 |
| `apps/prod-kalshi-ws-ts` | Kalshi WebSocket collection | kalshi-typescript, ws | MVP3 |
| `apps/prod-crypto-coinbase-ts` | Coinbase ticks and trades | ws | Undecided |
| `packages/schema` | Every schema layer: proto, codec, view | @bufbuild/protobuf | All phases |
| `packages/db` | ClickHouse migrations and routing | common, schema | All phases |
| `packages/common` | logger, idempotency key, shutdown, kafka | @clickhouse/client, kafka-javascript | All phases |
| `packages/kalshi-core` | Kalshi client and parsing | kalshi-typescript | MVP3 |
| `packages/env` | Environment variable validation | zod, dotenv | All phases |

The monorepo uses a pnpm workspace and turbo. A monorepo keeps apps and packages in one repository. It does not use npm or yarn. The language is TypeScript.

## 4. MVP path

```text
  MVP1 shape  ──►  MVP2 one real slice  ──►  MVP3 core migrated
  mock only        1 real Binance path       Kalshi order book goes real
  [done, PASS]     [closed, not started]     [waits for gates U12~U14]
```

Rule: do not open a task of the next phase before the exit criteria of the previous phase close.

| Phase | Goal | End-to-end cycle | Exit criteria | Status |
| --- | --- | --- | --- | --- |
| MVP1 | Prove the schema, the flow, and the tables with mock | `docker compose up`, `ch-migrate`, seed, `MOCK_SOURCE=1` writer, api, web | One browser screen updates the kalshi and polymarket mock order books. Killing the writer shows a stale (freshness) mark. 0 Kafka connections. Every stdout line of one startup passes `jq .` | Done (PASS 2026-09-24) |
| MVP2 | One real Binance BTC pipeline | Start the real binance producer, then Kafka, then ClickHouse | The binance symbol in `crypto_ticks FINAL` has 2 rows: `MOCK_BTCUSDT`, `BTCUSDT`. 0 changed lines in `proto/` and `001_data_tables.sql`. Mock rows and real rows coexist by the `MOCK_` prefix | Not started (tasks M1~M4, U11 `[ ]`) |
| MVP3 | Make the Kalshi order book path real | The writer loads real tickers through `kafkaSource` | Row count of `pred_orderbook_ws` == `uniqExact(idempotency_key)`. Retire only the mock of the migrated path | Not started (gates U12~U14 `[ ]`) |

The main MVP3 tasks are undecided. They are: replace the writer, add the other 4 kafka engines, start `prod-kalshi-ws-ts` for real, and add the Polymarket producer. Add them to `PLAN.md` after the gates close.

## 5. Current status

Reference date: 2026-11-01. No task state changed after 2026-09-25.

- Current phase: MVP1 is closed and the cleanup is done. The owner keeps MVP2 closed.
- Long run: 3 hours 18 minutes, 54,107 writer log lines. 0 rejected lines and 0 error lines. The 4 assertions of `make health` pass.

| Group | Task IDs |
| --- | --- |
| Done (20 main MVP1 tasks) | U1~U10, U3b, U5b, U5c, U7, U7b, U15~U19 |
| Done (9 follow-up cleanup tasks) | U20~U27, U7c, U24 |
| Open: MVP2 | M1, M2, M3, M4, U11 |
| Open: MVP3 gates | U12, U13, U14 |

- Next: when the owner opens MVP2, start with M1.
- Blocker Q4: does the Kalshi `seq` reset on every reconnect? Do not start U13 before the U12 capture.
- U12 needs `KALSHI_API_KEY_ID` and `KALSHI_PRIVATE_KEY_PATH`.
- M3 and U14 must connect to the remote Kafka (Oracle).
- Waiting for the owner: `main.bbl` is already tracked. The owner decides whether to untrack it.
- The book `book_market_predict_trading/` is a separate domain. Chapter 04 (waits for U12) and chapter 06 are skeletons on purpose.

Mismatch between documents: none. The first line of `STATUS.md` says "18 tasks in total". That is an old record. It does not count the later growth to 20 tasks. The 20 in `PLAN.md` is the current value.

## 6. Quick start (local demo, mock data)

Full guide: [tips/mvp1-local-check.tips.html](./tips/mvp1-local-check.tips.html)

1. Step 0, first time only: prepare the Docker runtime, `.env`, and dependencies.

   ```bash
   colima start --cpu 4 --memory 6
   cp infra/env.example .env    # fill in CLICKHOUSE_PASSWORD (required)
   pnpm install
   ```

2. `make up`: start the ClickHouse and Redis containers.
3. `make migrate`: create the tables.
4. `make start`: start the mock writer and the api. Logs go to `./logs/*.jsonl`.
5. `pnpm --filter @repo/web dev`: run it in a new terminal. Open `http://localhost:5173`.
6. `make health`: check the 4 assertions. If all pass, the exit code is 0.
7. `make stop`: stop the writer and the api.
8. `make down`: take the containers down.

**Warning: do not use `make down -v`.** It deletes the volumes and the ClickHouse data. The owner decides on a reset.

You need jq (`make migrate`, `make health`).

## 7. Repository layout

```text
apps/       api, orderbook-writer, web, 3 prod-* producers
packages/   schema, db, common, kalshi-core, env
mocks/      mock data only (6 *.mock.jsonl files, seed-clickhouse.sql)
infra/      docker-compose.dev.yml (clickhouse + redis), clickhouse/custom.xml
_scripts/   ch-migrate.sh, health-check.sh (kafka-lag.sh is not written yet: U11)
logs/       fixed log destination (gitignore)
tips/       local check guide page
book_market_predict_trading/   LaTeX study book (separate domain)
PLAN.md  STATUS.md  DECISIONS.md  00.architecture.mvp1.md
```

## 8. Document links

| Document | Content |
| --- | --- |
| [PLAN.md](./PLAN.md) | Phases, tasks, acceptance criteria |
| [STATUS.md](./STATUS.md) | Progress log |
| [DECISIONS.md](./DECISIONS.md) | Decision log |
| [00.architecture.mvp1.md](./00.architecture.mvp1.md) | Original design |
| [tips/](./tips/README.md) | Local check guide |
