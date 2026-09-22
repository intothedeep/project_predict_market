import type { TradeMeta } from '../types';

function normalizeTrade(t: Record<string, unknown>): TradeMeta {
    return {
        tradeId: typeof t.trade_id === 'string' ? t.trade_id : undefined,
        ticker: typeof t.ticker === 'string' ? t.ticker : undefined,
        yesPrice: t.yes_price_dollars != null ? String(t.yes_price_dollars) : undefined,
        noPrice: t.no_price_dollars != null ? String(t.no_price_dollars) : undefined,
        count: t.count_fp != null ? String(t.count_fp) : undefined,
        takerSide: typeof t.taker_side === 'string' ? t.taker_side : undefined,
        createdTime: typeof t.created_time === 'string' ? t.created_time : undefined,
    };
}

export function parseTrades(raw: unknown): TradeMeta[] {
    if (raw == null || typeof raw !== 'object') return [];
    const wrapper = raw as Record<string, unknown>;
    const list = Array.isArray(wrapper.trades)
        ? wrapper.trades
        : Array.isArray(raw)
          ? (raw as unknown[])
          : [];
    return list
        .filter((t): t is Record<string, unknown> => t != null && typeof t === 'object')
        .map(normalizeTrade);
}
