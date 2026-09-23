import type { TOrderbookLevelTuple, KalshiWsOrderbook } from '../types';

export function parseLevels(raw: unknown): TOrderbookLevelTuple[] {
    if (!Array.isArray(raw)) return [];
    const result: TOrderbookLevelTuple[] = [];
    for (const level of raw) {
        if (!Array.isArray(level)) continue;
        if (level[0] == null || level[1] == null) continue;
        const priceNum = Number(level[0]);
        const sizeNum = Number(level[1]);
        if (!Number.isFinite(priceNum) || !Number.isFinite(sizeNum)) continue;
        result.push([String(level[0]), String(level[1])]);
    }
    return result;
}

export function parseOrderbook(raw: unknown, ticker: string): KalshiWsOrderbook | null {
    if (raw == null || typeof raw !== 'object') return null;
    const wrapper = raw as Record<string, unknown>;
    const ob_fp = wrapper.orderbook_fp as Record<string, unknown> | undefined;
    if (!ob_fp) return null;
    return {
        ticker,
        bids: parseLevels(ob_fp.yes_dollars),
        asks: parseLevels(ob_fp.no_dollars),
    };
}
