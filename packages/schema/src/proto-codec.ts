/**
 * Proto Codec — Encoder and Decoder Maps
 * =======================================
 * Centralises Kafka proto binary encode/decode in @repo/schema so producers
 * (via @repo/db router) and consumers don't need a direct @bufbuild/protobuf
 * dependency.
 *
 * PROTO_ENCODERS: topic → (data: Record<string,unknown>) → Uint8Array
 *   Called by routePublish when KAFKA_ENCODING=proto.
 *   `data` is the raw payload (no _ts/_key yet).
 *
 * PROTO_DECODERS: topic → (bytes: Uint8Array) → Record<string,unknown>
 *   Called by the consumer when the message header encoding=proto.
 *   Returns an object with _ts added (from timeMs) for writer compatibility.
 */

import { create, toBinary, fromBinary } from '@bufbuild/protobuf';

import {
    PredMarketTickSchema,
    PredTradeSchema,
    PredOrderbookSchema,
} from './generated/ts/pred_pb';
import { CryptoTradeSchema, CryptoTickSchema } from './generated/ts/crypto_pb';

// ─── helpers ──────────────────────────────────────────────────────────────────

function toMs(ts: unknown): bigint {
    if (typeof ts === 'string') return BigInt(new Date(ts).getTime());
    if (typeof ts === 'number') return BigInt(ts);
    return BigInt(Date.now());
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

/** Wrap decoded proto object as Record, adding _ts from timeMs. */
function decoded(msg: unknown): Record<string, unknown> {
    const r = msg as Record<string, unknown>;
    const rawMs = r['timeMs'] as bigint | undefined;
    const ts =
        rawMs !== undefined
            ? new Date(Number(rawMs)).toISOString()
            : new Date().toISOString();
    return { ...r, _ts: ts };
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

// ─── Encoders (producer → Kafka binary) ───────────────────────────────────────

export const PROTO_ENCODERS: Record<
    string,
    (data: Record<string, unknown>) => Uint8Array
> = {
    'pred.market.tick.ws': (d) =>
        toBinary(
            PredMarketTickSchema,
            create(PredMarketTickSchema, {
                timeMs: toMs(d._ts),
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
        toBinary(
            PredTradeSchema,
            create(PredTradeSchema, {
                timeMs: toMs(d._ts),
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
        toBinary(
            PredOrderbookSchema,
            create(PredOrderbookSchema, {
                timeMs: toMs(d._ts),
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
        toBinary(
            PredOrderbookSchema,
            create(PredOrderbookSchema, {
                timeMs: toMs(d._ts),
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
        toBinary(
            CryptoTradeSchema,
            create(CryptoTradeSchema, {
                timeMs: toMs(d._ts),
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
        toBinary(
            CryptoTickSchema,
            create(CryptoTickSchema, {
                timeMs: toMs(d._ts),
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

// ─── Decoders (Kafka binary → consumer Record) ────────────────────────────────

export const PROTO_DECODERS: Record<
    string,
    (bytes: Uint8Array) => Record<string, unknown>
> = {
    'pred.market.tick.ws': (b) => decoded(fromBinary(PredMarketTickSchema, b)),
    'pred.trade.ws': (b) => decoded(fromBinary(PredTradeSchema, b)),
    'pred.orderbook.ws': (b) =>
        decodedOrderbook(fromBinary(PredOrderbookSchema, b)),
    'pred.orderbook_delta.ws': (b) =>
        decodedOrderbook(fromBinary(PredOrderbookSchema, b)),
    'crypto.trades': (b) => decoded(fromBinary(CryptoTradeSchema, b)),
    'crypto.ticks': (b) => decoded(fromBinary(CryptoTickSchema, b)),
};
