-- 001_data_tables.sql — MVP1 data tables (mock-fed only, no Kafka).
--
-- Six ReplacingMergeTree tables from 00.architecture.mvp1.md §3.4. These are the
-- storage form of the schema contract: proto (packages/schema/src/proto/*.proto)
-- → codec (proto-codec.ts) → this DDL. Columns mirror proto fields by NAME
-- (ClickHouse JSONEachRow binds by name, not number — see §3.1/§3.7), except `time`,
-- which derives from proto's `time_ms` via `toDateTime64(time_ms / 1000, 3)` — that
-- conversion is applied by the Kafka-fed materialized views in 002_kafka_engines.sql
-- (MVP2); MVP1 seeds this column directly (mocks/seed-clickhouse.sql, task U7).
--
-- price/qty/other feed values stay String end-to-end — parsed at read time, never
-- typed as numeric here (precision preservation, see proto file headers).
--
-- Do NOT add `ENGINE = Kafka` tables or materialized views here. That is
-- 002_kafka_engines.sql (MVP2, task M2) — a Kafka-engine table connects to the
-- Oracle broker the instant it is CREATEd, which breaks MVP1's "zero Kafka
-- connections" invariant at DDL time (§3.4, §6).
--
-- venue leads every ORDER BY (low cardinality, matches existing crypto_* pattern,
-- and folds venue into the dedup identity so same-ticker-different-venue rows
-- never collide) — §3.4 points 1-5.

-- ─── pred_market_tick_ws ────────────────────────────────────────────────────
-- Proto: kalshi_schema.PredMarketTick | Topic (MVP3): pred.market.tick.ws
CREATE TABLE IF NOT EXISTS pred_market_tick_ws (
    time            DateTime64(3),
    venue           String,
    ticker          String,
    yes_bid         Nullable(String),
    yes_ask         Nullable(String),
    no_bid          Nullable(String),
    no_ask          Nullable(String),
    last_price      Nullable(String),
    volume          Nullable(String),
    open_interest   Nullable(String),
    yes_bid_size    Nullable(String),
    yes_ask_size    Nullable(String),
    idempotency_key String,
    ingested_at     DateTime64(3) DEFAULT now64(3)
) ENGINE = ReplacingMergeTree(ingested_at)
PARTITION BY toYYYYMM(time)
ORDER BY (venue, ticker, time, idempotency_key);

-- ─── pred_trade_ws ──────────────────────────────────────────────────────────
-- Proto: kalshi_schema.PredTrade | Topic (MVP3): pred.trade.ws
CREATE TABLE IF NOT EXISTS pred_trade_ws (
    time            DateTime64(3),
    venue           String,
    ticker          String,
    trade_id        Nullable(String),
    yes_price       Nullable(String),
    no_price        Nullable(String),
    count           Nullable(String),
    taker_side      Nullable(String),
    ingest_path     Nullable(String),
    idempotency_key String,
    ingested_at     DateTime64(3) DEFAULT now64(3)
) ENGINE = ReplacingMergeTree(ingested_at)
PARTITION BY toYYYYMM(time)
ORDER BY (venue, ticker, time, idempotency_key);

-- ─── pred_orderbook_ws (full book) ──────────────────────────────────────────
-- Proto: kalshi_schema.PredOrderbook | Topic (MVP3): pred.orderbook.ws
CREATE TABLE IF NOT EXISTS pred_orderbook_ws (
    time            DateTime64(3),
    venue           String,
    ticker          String,
    bids            Array(Tuple(price String, qty String)),
    asks            Array(Tuple(price String, qty String)),
    seq             Nullable(Int64),
    type            Nullable(String),
    idempotency_key String,
    ingested_at     DateTime64(3) DEFAULT now64(3)
) ENGINE = ReplacingMergeTree(ingested_at)
PARTITION BY toYYYYMM(time)
ORDER BY (venue, ticker, time, idempotency_key);

-- ─── pred_orderbook_delta_ws (delta, audit/replay) ──────────────────────────
-- Proto: kalshi_schema.PredOrderbook | Topic (MVP3): pred.orderbook_delta.ws
CREATE TABLE IF NOT EXISTS pred_orderbook_delta_ws (
    time            DateTime64(3),
    venue           String,
    ticker          String,
    bids            Array(Tuple(price String, qty String)),
    asks            Array(Tuple(price String, qty String)),
    seq             Nullable(Int64),
    type            Nullable(String),
    idempotency_key String,
    ingested_at     DateTime64(3) DEFAULT now64(3)
) ENGINE = ReplacingMergeTree(ingested_at)
PARTITION BY toYYYYMM(time)
ORDER BY (venue, ticker, time, idempotency_key);

-- ─── crypto_ticks ───────────────────────────────────────────────────────────
-- Proto: kalshi_schema.CryptoTick | Topic: crypto.ticks (unchanged, venue-neutral)
CREATE TABLE IF NOT EXISTS crypto_ticks (
    time            DateTime64(3),
    venue           String,
    symbol          String,
    last_price      Nullable(String),
    best_bid        Nullable(String),
    best_ask        Nullable(String),
    volume_24h      Nullable(String),
    high_24h        Nullable(String),
    low_24h         Nullable(String),
    idempotency_key String,
    ingested_at     DateTime64(3) DEFAULT now64(3)
) ENGINE = ReplacingMergeTree(ingested_at)
PARTITION BY toYYYYMM(time)
ORDER BY (venue, symbol, time, idempotency_key);

-- ─── crypto_trades ──────────────────────────────────────────────────────────
-- Proto: kalshi_schema.CryptoTrade | Topic: crypto.trades (unchanged, venue-neutral)
CREATE TABLE IF NOT EXISTS crypto_trades (
    time            DateTime64(3),
    venue           String,
    symbol          String,
    price           String,
    qty             String,
    trade_id        Nullable(String),
    side            Nullable(String),
    buyer_maker     Nullable(Bool),
    idempotency_key String,
    ingested_at     DateTime64(3) DEFAULT now64(3)
) ENGINE = ReplacingMergeTree(ingested_at)
PARTITION BY toYYYYMM(time)
ORDER BY (venue, symbol, time, idempotency_key);
