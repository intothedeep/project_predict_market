/**
 * Proto Codec — Encoder and Decoder Maps
 * =======================================
 * Centralises Kafka wire encode/decode in @repo/schema so producers (via
 * @repo/db router) and consumers don't need a direct @bufbuild/protobuf
 * dependency.
 *
 * Wire format is JSON, not proto binary (00.architecture.mvp1.md §3.0/§3.7,
 * owner directive 2026-09-22 — kept until the data pipeline is proven, for
 * console-consumer debuggability). `.proto` stays the shape SSOT; only the
 * codec boundary's serialization changed: `toJsonString`/`fromJsonString`
 * instead of `toBinary`/`fromBinary`. Reverting to binary is a one-line swap
 * back, not a schema migration.
 *
 * `useProtoFieldName: true` is load-bearing (§3.7 rule 1): ClickHouse columns
 * are snake_case, protobuf-JSON defaults to lowerCamelCase. Dropping this
 * option does not error — columns silently take defaults.
 *
 * Every declared field is always on the wire, never omitted (owner directive,
 * 2026-09-22 — a console-consumer reader must not have to consult the schema
 * to tell "field absent" from "field zero"). `alwaysEmitImplicit` does NOT
 * cover this for `optional` fields — verified empirically (see U3b report):
 * an unset `optional string` stays fully omitted with alwaysEmitImplicit on,
 * because that option only affects implicit-presence (non-optional) fields
 * at their zero value, not explicit-presence fields with no value at all.
 * So `toJsonBytes` normalizes the encoded object afterward: any of the
 * schema's declared field names missing from the JSON output is filled with
 * `null`. `fromJsonString` already treats an explicit `null` on a singular
 * field as "unset" (verified: round-trips back to `undefined`, presence
 * preserved) — so this is lossless.
 *
 * PROTO_ENCODERS: topic → (data: Record<string,unknown>) → Uint8Array (UTF-8 JSON bytes)
 *   `data` takes two encoder-input-only keys that never reach the wire as such:
 *   `event_time_ms` (the venue's event time, §3.7 rule 5 — becomes `time_ms`
 *   on the wire) and `_key` (becomes `idempotency_key`).
 *
 * PROTO_DECODERS: topic → (bytes: Uint8Array) → Record<string,unknown>
 *   Returns an object with event_time_ms added (from timeMs) for writer compatibility.
 */

import { create, toJson, fromJsonString } from '@bufbuild/protobuf';
import type { DescMessage, JsonObject } from '@bufbuild/protobuf';

import {
    PredMarketTickSchema,
    PredTradeSchema,
    PredOrderbookSchema,
} from './generated/ts/pred_pb';
import { CryptoTradeSchema, CryptoTickSchema } from './generated/ts/crypto_pb';

// ─── helpers ──────────────────────────────────────────────────────────────────

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

/**
 * Serialize a proto message to JSON wire bytes (§3.7 rule 1 — snake_case
 * field names) with every declared field present — unset `optional` fields
 * are filled with explicit `null` rather than omitted (owner directive,
 * 2026-09-22).
 */
function toJsonBytes<Desc extends DescMessage>(
    schema: Desc,
    msg: Parameters<typeof toJson<Desc>>[1]
): Uint8Array {
    const obj = toJson(schema, msg, {
        useProtoFieldName: true,
        alwaysEmitImplicit: true,
    }) as JsonObject;
    for (const field of schema.fields) {
        if (!(field.name in obj)) obj[field.name] = null;
    }
    return textEncoder.encode(JSON.stringify(obj));
}

/** Parse JSON wire bytes back into a proto message. */
function fromJsonBytes<Desc extends Parameters<typeof fromJsonString>[0]>(
    schema: Desc,
    bytes: Uint8Array
): ReturnType<typeof fromJsonString<Desc>> {
    return fromJsonString(schema, textDecoder.decode(bytes));
}

// event_time_ms must be the venue's event time (§3.7 rule 5). Silently
// substituting publish time here re-opens that hole: a producer restart that
// fails to supply event_time_ms would re-create the same event under a
// different time_ms, which never folds under ReplacingMergeTree — permanent
// duplicates with no error anywhere (§5.4). Fail fast instead, same
// principle as the idempotency key helper's empty-component check
// (packages/common/src/idempotency.ts).
function toMs(ts: unknown): bigint {
    if (ts === undefined || ts === null) {
        throw new Error(
            `event_time_ms is missing (raw value: ${JSON.stringify(ts)}) — the venue's event timestamp must be supplied by the caller; publish time is not a substitute`
        );
    }
    if (typeof ts === 'bigint') {
        if (ts <= 0n) {
            throw new Error(
                `event_time_ms is not a valid epoch millisecond (raw value: ${ts})`
            );
        }
        return ts;
    }
    let ms: number;
    if (typeof ts === 'string') {
        ms = new Date(ts).getTime();
    } else if (typeof ts === 'number') {
        ms = ts;
    } else {
        throw new Error(
            `event_time_ms has unsupported type ${typeof ts} (raw value: ${JSON.stringify(ts)})`
        );
    }
    if (!Number.isFinite(ms) || ms <= 0) {
        throw new Error(
            `event_time_ms did not resolve to a valid epoch millisecond (raw value: ${JSON.stringify(ts)}, resolved: ${ms})`
        );
    }
    return BigInt(Math.trunc(ms));
}

function str(v: unknown): string {
    return typeof v === 'string' ? v : String(v ?? '');
}

function optStr(v: unknown): string | undefined {
    return v != null ? String(v) : undefined;
}

function optBool(v: unknown): boolean | undefined {
    return v != null ? Boolean(v) : undefined;
}

function priceLevels(levels: unknown): Array<{ price: string; qty: string }> {
    if (!Array.isArray(levels)) return [];
    return levels.flatMap((level) => {
        if (
            level !== null &&
            typeof level === 'object' &&
            !Array.isArray(level)
        ) {
            const l = level as Record<string, unknown>;
            const price = l.price;
            const qty = l.qty ?? l.size;
            if (price == null || qty == null) return [];
            return [{ price: String(price), qty: String(qty) }];
        }
        if (!Array.isArray(level) || level.length < 2) return [];
        const price = level[0];
        const qty = level[1];
        if (price == null || qty == null) return [];
        return [{ price: String(price), qty: String(qty) }];
    });
}

/** Wrap decoded proto object as Record, adding event_time_ms from timeMs. */
function decoded(msg: unknown): Record<string, unknown> {
    const r = msg as Record<string, unknown>;
    const rawMs = r['timeMs'] as bigint | undefined;
    const ts =
        rawMs !== undefined
            ? new Date(Number(rawMs)).toISOString()
            : new Date().toISOString();
    return { ...r, event_time_ms: ts };
}

function decodedOrderbook(msg: unknown): Record<string, unknown> {
    const record = decoded(msg);

    const toLevels = (levels: unknown): Array<[string, string]> => {
        if (!Array.isArray(levels)) return [];
        return levels.flatMap((level) => {
            const value = level as { price?: string; qty?: string };
            if (value.price == null || value.qty == null) return [];
            return [[value.price, value.qty]];
        });
    };

    return {
        ...record,
        bids: toLevels(record.bids),
        asks: toLevels(record.asks),
    };
}

// ─── Encoders (producer → Kafka JSON wire bytes) ─────────────────────────────

export const PROTO_ENCODERS: Record<
    string,
    (data: Record<string, unknown>) => Uint8Array
> = {
    'pred.market.tick.ws': (d) =>
        toJsonBytes(
            PredMarketTickSchema,
            create(PredMarketTickSchema, {
                timeMs: toMs(d.event_time_ms),
                ticker: str(d.ticker),
                yesBid: optStr(d.yesBid),
                yesAsk: optStr(d.yesAsk),
                noBid: optStr(d.noBid),
                noAsk: optStr(d.noAsk),
                lastPrice: optStr(d.lastPrice),
                volume: optStr(d.volume),
                openInterest: optStr(d.openInterest),
                yesBidSize: optStr(d.yesBidSize),
                yesAskSize: optStr(d.yesAskSize),
                idempotencyKey: str(
                    d.idempotencyKey ?? d.idempotency_key ?? d._key
                ),
                venue: str(d.venue),
            })
        ),

    'pred.trade.ws': (d) =>
        toJsonBytes(
            PredTradeSchema,
            create(PredTradeSchema, {
                timeMs: toMs(d.event_time_ms),
                ticker: str(d.ticker),
                tradeId: optStr(d.tradeId),
                yesPrice: optStr(d.yesPrice),
                noPrice: optStr(d.noPrice),
                count: optStr(d.count),
                takerSide: optStr(d.takerSide),
                ingestPath: optStr(d.ingestPath ?? d.ingest_path),
                idempotencyKey: str(
                    d.idempotencyKey ?? d.idempotency_key ?? d._key
                ),
                venue: str(d.venue),
            })
        ),

    'pred.orderbook.ws': (d) =>
        toJsonBytes(
            PredOrderbookSchema,
            create(PredOrderbookSchema, {
                timeMs: toMs(d.event_time_ms),
                ticker: str(d.ticker),
                bids: priceLevels(d.bids),
                asks: priceLevels(d.asks),
                seq: d.seq != null ? BigInt(d.seq as number) : undefined,
                idempotencyKey: str(
                    d.idempotencyKey ?? d.idempotency_key ?? d._key
                ),
                venue: str(d.venue),
            })
        ),

    'pred.orderbook_delta.ws': (d) =>
        toJsonBytes(
            PredOrderbookSchema,
            create(PredOrderbookSchema, {
                timeMs: toMs(d.event_time_ms),
                ticker: str(d.ticker),
                bids: priceLevels(d.bids),
                asks: priceLevels(d.asks),
                seq: d.seq != null ? BigInt(d.seq as number) : undefined,
                type: optStr(d.type),
                idempotencyKey: str(
                    d.idempotencyKey ?? d.idempotency_key ?? d._key
                ),
                venue: str(d.venue),
            })
        ),

    'crypto.trades': (d) =>
        toJsonBytes(
            CryptoTradeSchema,
            create(CryptoTradeSchema, {
                timeMs: toMs(d.event_time_ms),
                venue: str(d.venue),
                symbol: str(d.symbol),
                price: str(d.price),
                qty: str(d.qty),
                tradeId: optStr(d.tradeId),
                side: optStr(d.side),
                buyerMaker: optBool(d.buyerMaker),
                idempotencyKey: str(
                    d.idempotencyKey ?? d.idempotency_key ?? d._key
                ),
            })
        ),

    'crypto.ticks': (d) =>
        toJsonBytes(
            CryptoTickSchema,
            create(CryptoTickSchema, {
                timeMs: toMs(d.event_time_ms),
                venue: str(d.venue),
                symbol: str(d.symbol),
                lastPrice: optStr(d.lastPrice),
                bestBid: optStr(d.bestBid),
                bestAsk: optStr(d.bestAsk),
                volume24h: optStr(d.volume24h),
                high24h: optStr(d.high24h),
                low24h: optStr(d.low24h),
                idempotencyKey: str(
                    d.idempotencyKey ?? d.idempotency_key ?? d._key
                ),
            })
        ),
};

// ─── Decoders (Kafka JSON wire bytes → consumer Record) ──────────────────────

export const PROTO_DECODERS: Record<
    string,
    (bytes: Uint8Array) => Record<string, unknown>
> = {
    'pred.market.tick.ws': (b) => decoded(fromJsonBytes(PredMarketTickSchema, b)),
    'pred.trade.ws': (b) => decoded(fromJsonBytes(PredTradeSchema, b)),
    'pred.orderbook.ws': (b) =>
        decodedOrderbook(fromJsonBytes(PredOrderbookSchema, b)),
    'pred.orderbook_delta.ws': (b) =>
        decodedOrderbook(fromJsonBytes(PredOrderbookSchema, b)),
    'crypto.trades': (b) => decoded(fromJsonBytes(CryptoTradeSchema, b)),
    'crypto.ticks': (b) => decoded(fromJsonBytes(CryptoTickSchema, b)),
};
