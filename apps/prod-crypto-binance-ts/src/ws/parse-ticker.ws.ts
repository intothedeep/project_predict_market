/**
 * Binance Mini-Ticker Stream Parser
 * ==================================
 * Extracts and publishes mini-ticker messages from @miniTicker stream.
 * Fields mapped to CryptoTick proto schema (see packages/schema/src/proto/crypto.proto).
 */

import { cryptoTickKey } from '@repo/common';
import { routePublish } from '@repo/db';
import { KAFKA_TOPICS } from '@repo/kalshi-core';

const VENUE = 'binance';

// Disambiguates ticks landing in the same millisecond (see cryptoTickKey).
let tickSeq = 0;

/**
 * Parses a Binance mini-ticker message and publishes to crypto.ticks topic.
 * Expects data object with fields: s (symbol), c (close/lastPrice), h (high24h),
 * l (low24h), q (quoteVol/volume24h), E (event time, ms — venue's own
 * timestamp, §3.7 rule 5).
 */
export function parseTicker(data: any): void {
    if (!data || !data.s) return;

    const eventTimeMs = typeof data.E === 'number' ? data.E : Date.now();
    const key = cryptoTickKey(VENUE, data.s, eventTimeMs, tickSeq++);

    routePublish(KAFKA_TOPICS.crypto.TICKS, key, {
        venue: VENUE,
        symbol: data.s,
        lastPrice: data.c,
        high24h: data.h,
        low24h: data.l,
        volume24h: data.q,
        event_time_ms: eventTimeMs,
        idempotencyKey: key,
    });
}
