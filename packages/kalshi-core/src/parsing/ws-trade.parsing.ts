import type { WsTrade } from '../types';

export function parseWsTrade(raw: Record<string, unknown>): WsTrade | null {
    const ticker =
        typeof raw.market_ticker === 'string'
            ? raw.market_ticker
            : typeof raw.ticker === 'string'
              ? raw.ticker
              : null;
    if (!ticker) return null;
    return {
        ticker,
        tradeId: raw.trade_id as string | number | undefined,
        yesPrice: raw.yes_price != null ? String(raw.yes_price) : undefined,
        noPrice: raw.no_price != null ? String(raw.no_price) : undefined,
        count: raw.count != null ? String(raw.count) : undefined,
        takerSide: typeof raw.taker_side === 'string' ? raw.taker_side : undefined,
        createdTime: raw.created_time,
    };
}
