import { toNumber } from '@repo/common';
import type { WsOrderbookDelta } from '../types';
import { parseLevels } from './get-orderbook.parsing';

export function parseWsOrderbookDelta(raw: Record<string, unknown>): WsOrderbookDelta | null {
    const type = raw.type;
    if (type !== 'orderbook_snapshot' && type !== 'orderbook_delta') return null;
    const ticker =
        typeof raw.market_ticker === 'string'
            ? raw.market_ticker
            : typeof raw.ticker === 'string'
              ? raw.ticker
              : null;
    if (!ticker) return null;
    return {
        type,
        ticker,
        seq: toNumber(raw.seq),
        bids: parseLevels(raw.bids),
        asks: parseLevels(raw.asks),
    };
}
