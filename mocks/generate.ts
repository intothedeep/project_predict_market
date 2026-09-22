// mocks/generate.ts — U7 mock dataset generator.
//
// Produces the mocks/*.jsonl files AND mocks/seed-clickhouse.sql from ONE in-memory
// record set, so the two artifacts cannot drift (00.architecture.mvp1.md §3.6).
//
// Every .jsonl line is emitted by the REAL PROTO_ENCODERS map (packages/schema),
// not hand-written — that is the only way to guarantee byte-identity with what a
// producer would put on the Kafka wire (§3.6, task U7 instructions). Idempotency
// keys come from the real key functions in packages/common/src/idempotency.ts
// (§4.4 SSOT format table).
//
// Run: pnpm dlx tsx mocks/generate.ts   (from repo root)
// This script is NOT part of the build — it is a one-shot generator for the
// checked-in mocks/*.jsonl + seed-clickhouse.sql artifacts. No package.json wiring.

import { writeFileSync } from 'node:fs';
import { PROTO_ENCODERS, PROTO_DECODERS } from '../packages/schema/src/proto-codec';
import {
    predTickKey,
    predTradeKey,
    orderbookKey,
    cryptoTickKey,
    cryptoTradeKey,
} from '../packages/common/src/idempotency';

// ─── fixed mock identifiers (§3.6 table — verbatim, do not prettify) ─────────

const KALSHI_TICKER = 'MOCK_KXBTCD-26SEP22-B112000';
const POLY_TICKER =
    'MOCK_POLY_71321045679252212594626385532706912750332728571942532289631379312455583992563';
const BINANCE_SYMBOL = 'MOCK_BTCUSDT';
const COINBASE_SYMBOL = 'MOCK_BTC-USD';

// Deterministic base time (doc's own §3.7 example value) — never Date.now(),
// so byte-identity and re-runs are reproducible.
const BASE_TS = 1758500000123;

type Row = { topic: string; table: string; data: Record<string, unknown> };
const rows: Row[] = [];

// ─── pred_market_tick_ws ──────────────────────────────────────────────────
for (const [venue, ticker] of [
    ['kalshi', KALSHI_TICKER],
    ['polymarket', POLY_TICKER],
] as const) {
    const timeMs = BASE_TS;
    rows.push({
        topic: 'pred.market.tick.ws',
        table: 'pred_market_tick_ws',
        data: {
            event_time_ms: timeMs,
            ticker,
            venue,
            yesBid: '11',
            yesAsk: '13',
            noBid: '87',
            noAsk: '89',
            lastPrice: '12',
            volume: '1000',
            openInterest: '5000',
            yesBidSize: '100',
            yesAskSize: '150',
            idempotencyKey: predTickKey(venue, ticker, timeMs, 1),
        },
    });
}

// ─── pred_trade_ws ─────────────────────────────────────────────────────────
for (const [venue, ticker, tradeId] of [
    ['kalshi', KALSHI_TICKER, 'MOCK_TRADE_1'],
    ['polymarket', POLY_TICKER, 'MOCK_TRADE_2'],
] as const) {
    const timeMs = BASE_TS + 100;
    rows.push({
        topic: 'pred.trade.ws',
        table: 'pred_trade_ws',
        data: {
            event_time_ms: timeMs,
            ticker,
            venue,
            tradeId,
            yesPrice: '11',
            noPrice: '89',
            count: '10',
            takerSide: 'yes',
            ingestPath: 'live_ws',
            idempotencyKey: predTradeKey(venue, ticker, tradeId),
        },
    });
}

// ─── pred_orderbook_ws (full book) — 3 snapshots per venue, interleaved,
//     visibly changing top-of-book so replay (U8/U10) shows movement ─────────
const predBookLevels = [
    { bid: '11', ask: '13' },
    { bid: '12', ask: '14' },
    { bid: '13', ask: '15' },
];
for (let i = 0; i < 3; i++) {
    for (const [venue, ticker] of [
        ['kalshi', KALSHI_TICKER],
        ['polymarket', POLY_TICKER],
    ] as const) {
        const timeMs = BASE_TS + 200 + i * 500;
        const seq = i + 1;
        const { bid, ask } = predBookLevels[i];
        rows.push({
            topic: 'pred.orderbook.ws',
            table: 'pred_orderbook_ws',
            data: {
                event_time_ms: timeMs,
                ticker,
                venue,
                bids: [{ price: bid, qty: '1200' }],
                asks: [{ price: ask, qty: '900' }],
                seq,
                idempotencyKey: orderbookKey(venue, ticker, seq),
            },
        });
    }
}

// ─── pred_orderbook_delta_ws — 1 delta per venue (type: 'delta') ────────────
for (const [venue, ticker] of [
    ['kalshi', KALSHI_TICKER],
    ['polymarket', POLY_TICKER],
] as const) {
    const timeMs = BASE_TS + 1800;
    const seq = 4;
    rows.push({
        topic: 'pred.orderbook_delta.ws',
        table: 'pred_orderbook_delta_ws',
        data: {
            event_time_ms: timeMs,
            ticker,
            venue,
            bids: [{ price: '14', qty: '500' }],
            asks: [],
            seq,
            type: 'delta',
            idempotencyKey: orderbookKey(venue, ticker, seq),
        },
    });
}

// ─── crypto_ticks ────────────────────────────────────────────────────────
for (const [venue, symbol] of [
    ['binance', BINANCE_SYMBOL],
    ['coinbase', COINBASE_SYMBOL],
] as const) {
    const timeMs = BASE_TS + 300;
    rows.push({
        topic: 'crypto.ticks',
        table: 'crypto_ticks',
        data: {
            event_time_ms: timeMs,
            venue,
            symbol,
            lastPrice: '111111.11',
            bestBid: '111100.00',
            bestAsk: '111120.00',
            volume24h: '1234.5678',
            high24h: '112000.00',
            low24h: '110000.00',
            idempotencyKey: cryptoTickKey(venue, symbol, timeMs, 1),
        },
    });
}

// ─── crypto_trades ───────────────────────────────────────────────────────
for (const [venue, symbol, tradeId] of [
    ['binance', BINANCE_SYMBOL, 'MOCK_BI_TRADE_1'],
    ['coinbase', COINBASE_SYMBOL, 'MOCK_CB_TRADE_1'],
] as const) {
    const timeMs = BASE_TS + 400;
    rows.push({
        topic: 'crypto.trades',
        table: 'crypto_trades',
        data: {
            event_time_ms: timeMs,
            venue,
            symbol,
            price: '111111.11',
            qty: '0.005',
            tradeId,
            side: 'buy',
            buyerMaker: false,
            idempotencyKey: cryptoTradeKey(venue, symbol, tradeId),
        },
    });
}

// ─── encode via the REAL producer-side encoder map ─────────────────────────

const TOPIC_TO_FILE: Record<string, string> = {
    'pred.market.tick.ws': 'pred-tick.mock.jsonl',
    'pred.trade.ws': 'pred-trade.mock.jsonl',
    'pred.orderbook.ws': 'pred-orderbook.mock.jsonl',
    'pred.orderbook_delta.ws': 'pred-orderbook-delta.mock.jsonl',
    'crypto.ticks': 'crypto-tick.mock.jsonl',
    'crypto.trades': 'crypto-trade.mock.jsonl',
};

const linesByFile = new Map<string, string[]>();
const decodedRows: Array<{ table: string; json: Record<string, unknown> }> = [];

let roundTripChecked = 0;
for (const row of rows) {
    const bytes = PROTO_ENCODERS[row.topic](row.data);
    const line = Buffer.from(bytes).toString('utf8');

    // round-trip proof: decode(line) → re-encode → must equal original bytes
    const decoded = PROTO_DECODERS[row.topic](bytes);
    const reEncoded = PROTO_ENCODERS[row.topic](decoded);
    if (!Buffer.from(reEncoded).equals(Buffer.from(bytes))) {
        throw new Error(`round-trip mismatch for topic ${row.topic}: ${line}`);
    }
    roundTripChecked++;

    const file = TOPIC_TO_FILE[row.topic];
    if (!linesByFile.has(file)) linesByFile.set(file, []);
    linesByFile.get(file)!.push(line);

    decodedRows.push({ table: row.table, json: JSON.parse(line) });
}

for (const [file, lines] of linesByFile) {
    writeFileSync(`mocks/${file}`, lines.join('\n') + '\n', 'utf8');
    console.log(`wrote mocks/${file} (${lines.length} lines)`);
}
console.log(`round-trip decode→re-encode verified for ${roundTripChecked}/${rows.length} lines`);

// ─── seed-clickhouse.sql — direct INSERT, no Kafka, derived from same rows ──

function sqlStr(v: unknown): string {
    if (v === null || v === undefined) return 'NULL';
    return `'${String(v).replace(/'/g, "\\'")}'`;
}
function sqlLevels(v: unknown): string {
    const arr = v as Array<{ price: string; qty: string }>;
    if (!arr || arr.length === 0) return '[]';
    return `[${arr.map((l) => `('${l.price}','${l.qty}')`).join(',')}]`;
}

const sqlLines: string[] = [
    '-- seed-clickhouse.sql — U7 mock dataset. Direct INSERT, no Kafka involved.',
    '-- Generated by mocks/generate.ts from the SAME in-memory records that produce',
    '-- the .jsonl files (00.architecture.mvp1.md §3.6) — jsonl and this file cannot drift.',
    '-- All rows carry a MOCK_ ticker/symbol prefix (never confusable with real output).',
    '',
];

for (const { table, json } of decodedRows) {
    const timeMs = json['time_ms'];
    const timeExpr = `toDateTime64(${timeMs} / 1000, 3)`;
    let cols: string[];
    let vals: string[];

    switch (table) {
        case 'pred_market_tick_ws':
            cols = [
                'time', 'venue', 'ticker', 'yes_bid', 'yes_ask', 'no_bid', 'no_ask',
                'last_price', 'volume', 'open_interest', 'yes_bid_size', 'yes_ask_size',
                'idempotency_key',
            ];
            vals = [
                timeExpr, sqlStr(json.venue), sqlStr(json.ticker), sqlStr(json.yes_bid),
                sqlStr(json.yes_ask), sqlStr(json.no_bid), sqlStr(json.no_ask),
                sqlStr(json.last_price), sqlStr(json.volume), sqlStr(json.open_interest),
                sqlStr(json.yes_bid_size), sqlStr(json.yes_ask_size), sqlStr(json.idempotency_key),
            ];
            break;
        case 'pred_trade_ws':
            cols = [
                'time', 'venue', 'ticker', 'trade_id', 'yes_price', 'no_price', 'count',
                'taker_side', 'ingest_path', 'idempotency_key',
            ];
            vals = [
                timeExpr, sqlStr(json.venue), sqlStr(json.ticker), sqlStr(json.trade_id),
                sqlStr(json.yes_price), sqlStr(json.no_price), sqlStr(json.count),
                sqlStr(json.taker_side), sqlStr(json.ingest_path), sqlStr(json.idempotency_key),
            ];
            break;
        case 'pred_orderbook_ws':
        case 'pred_orderbook_delta_ws':
            cols = [
                'time', 'venue', 'ticker', 'bids', 'asks', 'seq', 'type', 'idempotency_key',
            ];
            vals = [
                timeExpr, sqlStr(json.venue), sqlStr(json.ticker),
                sqlLevels(json.bids), sqlLevels(json.asks),
                json.seq == null ? 'NULL' : String(json.seq),
                sqlStr(json.type), sqlStr(json.idempotency_key),
            ];
            break;
        case 'crypto_ticks':
            cols = [
                'time', 'venue', 'symbol', 'last_price', 'best_bid', 'best_ask',
                'volume_24h', 'high_24h', 'low_24h', 'idempotency_key',
            ];
            vals = [
                timeExpr, sqlStr(json.venue), sqlStr(json.symbol), sqlStr(json.last_price),
                sqlStr(json.best_bid), sqlStr(json.best_ask), sqlStr(json.volume_24h),
                sqlStr(json.high_24h), sqlStr(json.low_24h), sqlStr(json.idempotency_key),
            ];
            break;
        case 'crypto_trades':
            cols = [
                'time', 'venue', 'symbol', 'price', 'qty', 'trade_id', 'side',
                'buyer_maker', 'idempotency_key',
            ];
            vals = [
                timeExpr, sqlStr(json.venue), sqlStr(json.symbol), sqlStr(json.price),
                sqlStr(json.qty), sqlStr(json.trade_id), sqlStr(json.side),
                json.buyer_maker == null ? 'NULL' : String(json.buyer_maker),
                sqlStr(json.idempotency_key),
            ];
            break;
        default:
            throw new Error(`unknown table ${table}`);
    }

    sqlLines.push(
        `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${vals.join(', ')});`
    );
}

writeFileSync('mocks/seed-clickhouse.sql', sqlLines.join('\n') + '\n', 'utf8');
console.log(`wrote mocks/seed-clickhouse.sql (${decodedRows.length} INSERTs)`);
