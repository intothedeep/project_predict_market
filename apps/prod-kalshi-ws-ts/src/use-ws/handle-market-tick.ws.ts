import { predTickKey } from '@repo/common';
import { routePublish } from '@repo/db';
import { KAFKA_TOPICS } from '@repo/kalshi-core';

const VENUE = 'kalshi';

// Disambiguates ticks landing in the same millisecond (see predTickKey).
let tickSeq = 0;

function toNumber(value: unknown): number | undefined {
    if (value == null || value === '') return undefined;
    const num = Number(value);
    return Number.isFinite(num) ? num : undefined;
}

export function handleMarketTick(msg: Record<string, unknown>): void {
    const ticker = String(msg.ticker ?? msg.market_ticker ?? '');
    if (!ticker) return;

    // Kalshi's ticker WS channel carries no confirmed event-timestamp field
    // in this codebase (unlike trade's created_time) — falls back to receive
    // time, consistently for this message type only (§3.7 rule 5).
    const timeMs = Date.now();
    const key = predTickKey(VENUE, ticker, timeMs, tickSeq++);

    routePublish(KAFKA_TOPICS.ws.MARKET_TICK_WS, key, {
        venue: VENUE,
        ticker,
        yesBid: toNumber(msg.yes_bid),
        yesAsk: toNumber(msg.yes_ask),
        noBid: toNumber(msg.no_bid),
        noAsk: toNumber(msg.no_ask),
        lastPrice: toNumber(msg.last_price),
        volume: toNumber(msg.volume),
        openInterest: toNumber(msg.open_interest),
        yesBidSize: toNumber(msg.yes_bid_size),
        yesAskSize: toNumber(msg.yes_ask_size),
        event_time_ms: timeMs,
        idempotencyKey: key,
    });
}
