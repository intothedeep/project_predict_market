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

## 9. Previous projects

Two earlier projects collected weather, market, and crypto data. This repo rebuilds them in smaller steps.

**Saved files and documents hold only a small part of what was collected. The May to July 2026 volume is not recorded in either repo.**

| Item | project_betting_kalshi | project-weather-bot |
| --- | --- | --- |
| Focus | Weather and crypto collectors. Temperature models from weather features and Kalshi labels | Paper trading from weather forecasts and Polymarket prices |
| Market | Kalshi. Polymarket was planned only | Polymarket |
| Cities | 60 in the config | 51 locations in the code. 20 cities in the saved files |
| Commits | 186 | 58 |
| Commit period | 2026-04-02 to 2026-09-22 | 2026-04-26 to 2026-09-21 |
| Recorded data | No data files. Documents record 582 settled markets, 22,268 hourly candles, 4,098 National Oceanic and Atmospheric Administration (NOAA) rows | 140 JSON files, 2.9 MB, from 2026-04-23 to 2026-04-27 |

| Item | The owner reports | Repo evidence |
| --- | --- | --- |
| Period | Both projects collected weather data from May to July 2026 | No file in either repo records a collection start, stop, uptime, or total row count for May to July. The `project-weather-bot` local run logs end on 2026-05-18. A later document shows live changes on 2026-05-23. Its fixes went to a separate host, so the local logs do not prove a stop |
| Cities | Together they covered 50 to 60 cities. Their city lists partly overlap | `project_betting_kalshi` config: 60 cities (20 flagged for Kalshi, 51 flagged for Polymarket), 62 airport stations. `project-weather-bot` code: 51 locations. All 51 appear in its logs from 2026-05-15 to 2026-05-18 |
| Volume | The May to July volume is larger than the counts in the repos | The repos do not record that volume. A retention rule (time to live) of 7 or 30 days was written for some raw `project_betting_kalshi` tables. Its status was "apply pending". Whether it was applied is not recorded. If applied, those raw rows are gone |
| Exact counts | They may sit in the owner's private ClickHouse databases | No one queried them for this section |

### 9.1 project_betting_kalshi

The owner rebuilt the project because the first try built a large system at once. This repo therefore builds one MVP phase at a time.

#### Project size

Counted from the old repo tree on 2026-11-02.

| Item | Count |
| --- | --- |
| Commits | 186 (2026-04-02 to 2026-09-22) |
| Tracked files | 893 |
| Apps | 9 |
| Packages | 9 |
| ClickHouse migration files | 44 |
| Kafka topics | 39 in code, 40 in the topic script |

#### Measured data snapshot

| Data | Count | Period | Note |
| --- | --- | --- | --- |
| Kalshi KXHIGHNY settled markets | 582 | 2025-12-26 to 2026-04-01 | 6 markets a day |
| Kalshi KXHIGHNY hourly candles | 22,268 | 2025-12-24 to 2026-04-01 | 38.3 candles per market. Covers all 582 markets |
| NOAA Climate Data Online (CDO) New York daily maximum temperature | 4,098 rows | 2015 to 2026-04-02 | |

#### Collectors

Intervals are the configured values at the last commit. Earlier values changed, and no per-date history exists.

"Ran" means the owner's checkbox or the deploy history says it ran. Other rows record no run.

Weather (`prod-weather-ts`)

| Source | Data | Interval | Locations | Status |
| --- | --- | --- | --- | --- |
| National Weather Service (NWS) observation | temperature, humidity, wind, pressure, precipitation, conditions | 5 minutes | 20 stations | Ran |
| NWS alert | type, severity, area, headline, event | 5 minutes | 16 states | Ran |
| NWS hourly forecast | temperature, humidity, wind, precipitation probability, conditions, 168 periods | 1 hour | 20 US | Ran |
| Meteorological Aerodrome Report (METAR) | temperature, station id | 15 minutes (code default) | 62 stations, 60 cities | Ran |
| Open-Meteo current | temperature, humidity, precipitation, wind, pressure, cloud, weather code | 15 minutes | 60 | Ran |
| Open-Meteo 15-minute forecast | temperature, precipitation, 4 slots per poll | 15 minutes | 60 | Ran |
| Open-Meteo European Centre for Medium-Range Weather Forecasts (ECMWF) daily | daily maximum and minimum, 7 days | 6 hours | 60 | Ran |
| Open-Meteo Global Forecast System (GFS) daily | daily maximum and minimum, 3 days | 6 hours | 20 US | Ran |
| Open-Meteo High-Resolution Rapid Refresh (HRRR) | temperature, humidity, wind, 18 hours | 1 hour | 20 US | Code exists. HTTP 400 until a 2026-05-18 fix. Later success not recorded |
| OpenWeatherMap | temperature, humidity, pressure, wind, cloud, rain, conditions | 2 hours | 60 | Ran |
| Visual Crossing | temperature, humidity, pressure, wind, cloud, rain, conditions | 2 hours | 60 | Ran |
| Tomorrow.io | temperature, humidity, wind, pressure, cloud, precipitation intensity, weather code | 4 hours | 2 (New York, Chicago) | Code exists. No run recorded |
| NOAA CDO | daily maximum and minimum temperature. The schema also holds average temperature, precipitation, snow, and wind | One-time backfill | New York in the measured snapshot | Stored: 4,098 rows |

Kalshi

| Source | Data | Interval | Scope | Status |
| --- | --- | --- | --- | --- |
| Representational State Transfer (REST) markets | ticker, title, status, bid and ask, last price, volume, open interest, strikes, times, result | 15 minutes | 47 entries (46 unique): 7 crypto + 40 climate | Ran |
| REST series | title, category, frequency, fees, settlement source | 12 hours | Not traced | Ran |
| REST market history | ticker, title, status, bid and ask, last price, volume, open interest, strikes, times, result | Daily, 25-hour lookback | Not traced | Ran |
| REST candles | open, high, low, close, mean, bid and ask, volume, open interest | Daily job, 1-minute candles | Not traced | Code exists. Deployment open |
| REST orderbook and trades | price levels, trade price, count, side | Disabled in code (commented out) | None | Code exists |
| WebSocket ticker | bid, ask, last, volume, open interest, sizes | Stream | 147 series entries | Code exists. Run not verified |
| WebSocket trade | trade id, price, count, taker side | Stream | 147 series entries | Code exists. Run not verified |
| WebSocket orderbook delta | bids, asks, seq, type | Stream | 147 series entries | Code exists. Run not verified |

Spot crypto

| Source | Data | Interval | Scope | Status |
| --- | --- | --- | --- | --- |
| Binance | trades (price, quantity, id, buyer-maker), ticks (last, 24-hour high, low, volume) | Stream | 4: BTC, ETH, SOL, XRP | Code exists. Pipeline "silently broken end-to-end" until a 2026-07-02 fix. Fix not verified |
| Coinbase | trades (price, quantity, side, id), ticks (last, best bid, best ask, 24-hour volume, high, low) | Stream | 4 | Code exists. Pipeline "silently broken end-to-end" until a 2026-07-02 fix. Fix not verified |

Polymarket in this repo: planned only.

#### Used

NOAA features plus Kalshi settled-market labels trained temperature models.

The table shows the Brier score. Lower is better.

| Model | Run 2026-04-02 (435 settled markets) | Run 2026-04-07 (475 settled markets, 3,265 train rows, 817 test rows) |
| --- | --- | --- |
| Baseline | 0.2506 | 0.2405 |
| Random forest | 0.2101 | 0.2033 |
| LightGBM | 0.2099 | 0.203 |
| XGBoost | 0.2099 | 0.2029 |

#### Numbers not to rely on

- Later 38-feature runs showed Brier 0.043. The owner flagged them as probable data leakage, so they are not reportable.
- A backtest simulation showed Kelly +997% return on investment. It used 500 synthetic episodes, not collected data.
- Live betting stayed disabled. No real-data backtest or paper-trading result was recorded.

### 9.2 project-weather-bot

#### Origin and size

It derives from an MIT-licensed bot. The license text reads `Copyright (c) 2026 alteregoeth-ai`.

All trading was paper trading. The live broker is a stub. No real-money trade is recorded.

| Item | Count |
| --- | --- |
| Commits | 58 (2026-04-26 to 2026-09-21) |
| Tracked files | 372 |
| Python files | 113 |
| Test files | 12 |
| Paper-trading configs | 5 |
| ClickHouse tables | 13 |
| ClickHouse views | 2 |

#### Saved in files (2026-04-23 to 2026-04-27)

These counts cover only the saved files. The owner reports a larger volume from May to July 2026. The repos do not record that volume.

| Data | Count | Note |
| --- | --- | --- |
| Files | 140 JSON files, 2.9 MB | 20 cities |
| Forecast snapshots | 6,461 | D+0 2,303, D+1 2,303, D+2 1,855 |
| Market snapshots | 6,461 | median gap 61 minutes |
| ECMWF values | 6,172 | |
| GFS-seamless values, stored under the key `hrrr` | 1,931 | 6 Fahrenheit-market cities |
| METAR values | 2,282 | D+0 only |
| Bucket outcome rows | 1,540 | latest list per market |

#### Collectors

| Source | Data | Interval | Destination | Status |
| --- | --- | --- | --- | --- |
| Open-Meteo ECMWF | daily maximum and minimum | Scan about hourly. Cached 30 minutes for D+0, 60 minutes later | `forecast_snapshots` | Stored in April files. 7,791 forecast rows on 2026-05-07 |
| Open-Meteo GFS-seamless | daily maximum and minimum | Scan about hourly. Cached 30 minutes for D+0, 60 minutes later | `forecast_snapshots` | Stored in April files. 7,791 forecast rows on 2026-05-07. 11 US cities from May |
| METAR | current observed temperature, not a daily maximum | Scan about hourly. Cached 25 minutes | `forecast_snapshots` | Stored in April files. 7,791 forecast rows on 2026-05-07 |
| Polymarket Gamma, latest state | question, top bucket, price, volume, end date | Replaced on update | `markets` | 100 rows on 2026-05-07 |
| Polymarket Gamma, all buckets | bucket range, price, volume | 1 hour. 5 minutes for events with open positions. Rows kept 90 days | `bucket_price_history` | Ran, rows not recorded |
| Visual Crossing | actual daily maximum for the station | At market resolution, plus a backfill job | `markets` | 1 row on 2026-05-07 |
| Decisions | action and skip reason | Each scan | `events_decisions` | Ran, rows not recorded |
| Polymarket central limit order book (CLOB) | none | None | None | Not collected. Gamma `bid` and `ask` in scans are the YES and NO prices, not an order book. They sum to 1 in all 1,540 saved rows |

#### Used

Forecasts plus Gamma prices fed these steps. The values come from the code.

- Forecast choice: US cities use the `hrrr` value if present, otherwise ECMWF.
- Entry gates: volume at least 500, expected value at least the config minimum, Kelly size at least $0.50, spread at most 0.03, ask at most 0.45.
- Probability: a normal cumulative distribution function with per-city sigma, or point-mass p=1.0.
- Exits: 20% position stop, 5% budget stop, take-profit 0.85 and 0.75.

#### Measured paper result (2026-04-23 to 2026-04-27, one run)

- 99 positions: 93 closed, 6 open. 21 wins, 69 losses, 3 flat.
- Closed profit and loss: -$249.70 on $1,860 cost, return on investment -13.4%.
- Exits: stop loss 44 (-$218.38), forecast changed 44 (-$113.55), trailing stop 3 ($0), resolved 2 (+$82.23).
- Limits: upstream point-mass logic, every position $20, only 2 trades settled. Too small to judge the strategy.

#### Numbers not to rely on

- The saved balance in `data/state.json` disagrees with the saved positions. Do not report either balance.
- Three trade-count bugs were fixed on 2026-05-02. Older counts keep the gaps.
- Results after 2026-05-05 exist only in ClickHouse.
