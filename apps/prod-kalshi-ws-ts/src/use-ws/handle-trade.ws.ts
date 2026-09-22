import { predTradeKey } from '@repo/common';
import { routePublish } from '@repo/db';
import { KAFKA_TOPICS } from '@repo/kalshi-core';
import { parseWsTrade } from '@repo/kalshi-core';

const VENUE = 'kalshi';

// created_time is Kalshi's event timestamp for a trade — may be an ISO
// string or an epoch (s or ms). Falls back to receive time only when the
// venue omits it (§3.7 rule 5).
function toEventTimeMs(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value > 1_000_000_000_000 ? value : value * 1_000;
    }
    if (typeof value === 'string' && value.trim()) {
        const parsed = Date.parse(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return Date.now();
}

export function handleTrade(msg: Record<string, unknown>): void {
    const trade = parseWsTrade(msg);
    if (!trade) return;

    const timeMs = toEventTimeMs(trade.createdTime);

    // trade_id is optional on the wire (proto: optional string trade_id).
    // A venue that omits it must get a deterministic composite fallback
    // (§4.4 "키 헬퍼의 '빈 성분 제거'는 버그다") — matches the contract
    // prod-crypto-binance-ts already implements ad hoc.
    const nativeId = trade.tradeId ?? `${timeMs}|${trade.yesPrice}|${trade.noPrice}|${trade.count}`;
    const key = predTradeKey(VENUE, trade.ticker, nativeId);

    routePublish(KAFKA_TOPICS.ws.TRADE_WS, key, {
        venue: VENUE,
        ticker: trade.ticker,
        tradeId: trade.tradeId,
        yesPrice: trade.yesPrice,
        noPrice: trade.noPrice,
        count: trade.count,
        takerSide: trade.takerSide,
        ingestPath: 'live_ws',
        event_time_ms: timeMs,
        idempotencyKey: key,
    });
}
