/**
 * Binance Trade Stream Parser
 * ============================
 * Extracts and publishes trade messages from @trade stream.
 * Fields mapped to CryptoTrade proto schema (see packages/schema/src/proto/crypto.proto).
 */

import { cryptoTradeKey } from '@repo/common';
import { routePublish } from '@repo/db';
import { KAFKA_TOPICS } from '@repo/kalshi-core';

const VENUE = 'binance';

/**
 * Parses a Binance trade message and publishes to crypto.trades topic.
 * Expects data object with fields: s (symbol), t (tradeId), p (price), q (qty),
 * m (buyerMaker), T (trade time, ms — venue's own timestamp, §3.7 rule 5).
 */
export function parseTrade(data: any): void {
    if (!data || !data.s) return;

    const eventTimeMs = typeof data.T === 'number' ? data.T : Date.now();
    // trade_id is optional on the wire — deterministic composite fallback
    // when the venue omits it (§4.4 "키 헬퍼의 '빈 성분 제거'는 버그다").
    const key = cryptoTradeKey(VENUE, data.s, data.t ?? `${data.T}|${data.p}|${data.q}`);

    routePublish(KAFKA_TOPICS.crypto.TRADES, key, {
        venue: VENUE,
        symbol: data.s,
        price: data.p,
        qty: data.q,
        tradeId: data.t,
        buyerMaker: data.m,
        event_time_ms: eventTimeMs,
        idempotencyKey: key,
    });
}
