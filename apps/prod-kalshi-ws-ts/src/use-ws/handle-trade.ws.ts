import { predTradeKey } from '@repo/common';
import { routePublish } from '@repo/db';
import { KAFKA_TOPICS } from '@repo/kalshi-core';
import { parseWsTrade } from '@repo/kalshi-core';
import { RECEIPT_TIME_UNTIL_U12 } from './receipt-time';

const VENUE = 'kalshi';

export function handleTrade(msg: Record<string, unknown>): void {
    const trade = parseWsTrade(msg);
    if (!trade) return;

    // See ./receipt-time.ts — §3.7 rule 5 exception, U16 ①. Kalshi trade no
    // longer reads `created_time`; the whole venue is on receipt time.
    const timeMs = RECEIPT_TIME_UNTIL_U12();

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
