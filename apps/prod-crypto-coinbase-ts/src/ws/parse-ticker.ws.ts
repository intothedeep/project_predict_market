/**
 * Coinbase Ticker Parser
 * ======================
 * Pure function to parse ticker messages and publish to crypto.ticks topic.
 * Fields mapped to CryptoTick proto schema (see packages/schema/src/proto/crypto.proto).
 */

import { cryptoTickKey } from '@repo/common';
import { routePublish } from '@repo/db';
import { KAFKA_TOPICS } from '@repo/kalshi-core';

const VENUE = 'coinbase';

// Disambiguates ticks landing in the same millisecond (see cryptoTickKey).
let tickSeq = 0;

// Coinbase's `time` field is an ISO 8601 event timestamp (§3.7 rule 5).
function toEventTimeMs(time: unknown): number {
    if (typeof time === 'string' && time.trim()) {
        const parsed = Date.parse(time);
        if (Number.isFinite(parsed)) return parsed;
    }
    return Date.now();
}

export function parseTicker(data: any): void {
    const product = data.product_id ?? '';
    const eventTimeMs = toEventTimeMs(data.time);
    const key = cryptoTickKey(VENUE, product, eventTimeMs, tickSeq++);

    routePublish(KAFKA_TOPICS.crypto.TICKS, key, {
        venue: VENUE,
        symbol: product,
        lastPrice: data.price,
        bestBid: data.best_bid,
        bestAsk: data.best_ask,
        volume24h: data.volume_24h,
        high24h: data.high_24h,
        low24h: data.low_24h,
        event_time_ms: eventTimeMs,
        idempotencyKey: key,
    });
}
