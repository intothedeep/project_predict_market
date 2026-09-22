/**
 * Coinbase Trade Parser
 * =====================
 * Pure function to parse match/last_match messages and publish to crypto.trades topic.
 * Fields mapped to CryptoTrade proto schema (see packages/schema/src/proto/crypto.proto).
 */

import { cryptoTradeKey } from '@repo/common';
import { routePublish } from '@repo/db';
import { KAFKA_TOPICS } from '@repo/kalshi-core';

const VENUE = 'coinbase';

// Coinbase's `time` field is an ISO 8601 event timestamp (§3.7 rule 5).
function toEventTimeMs(time: unknown): number {
    if (typeof time === 'string' && time.trim()) {
        const parsed = Date.parse(time);
        if (Number.isFinite(parsed)) return parsed;
    }
    return Date.now();
}

export function parseTrade(data: any): void {
    const product = data.product_id ?? '';
    const eventTimeMs = toEventTimeMs(data.time);
    // trade_id is optional on the wire — deterministic composite fallback
    // when the venue omits it (§4.4 "키 헬퍼의 '빈 성분 제거'는 버그다").
    const tradeId = data.trade_id ?? `${data.time}|${data.price}|${data.size}`;
    const key = cryptoTradeKey(VENUE, product, tradeId);

    routePublish(KAFKA_TOPICS.crypto.TRADES, key, {
        venue: VENUE,
        symbol: product,
        price: data.price,
        qty: data.size,
        side: data.side,
        tradeId: data.trade_id,
        event_time_ms: eventTimeMs,
        idempotencyKey: key,
    });
}
