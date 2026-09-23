import { parseMarket } from '../parsing';
import type { MarketMeta } from '../types';

export interface TickerEntry {
    ticker: string;
    status: string;
    series?: string;
    closeTime?: number;
    fetchedAt: number;
}

export interface MarketBatchPage {
    markets?: unknown[];
    cursor?: string;
}

export type MarketBatchFetcher = (params: {
    seriesTicker: string;
    cursor?: string;
}) => Promise<MarketBatchPage | null>;

const registry = new Map<string, TickerEntry>();

export async function initRegistry(
    fetcher: MarketBatchFetcher,
    seriesTickers: string[]
): Promise<void> {
    for (const series of seriesTickers) {
        let cursor: string | undefined;
        while (true) {
            const data = await fetcher({ seriesTicker: series, cursor });
            if (!data?.markets?.length) break;
            for (const raw of data.markets) {
                const meta = parseMarket(raw, series);
                if (meta) {
                    registry.set(meta.ticker, {
                        ticker: meta.ticker,
                        series: meta.series,
                        status: meta.status ?? 'unknown',
                        closeTime: meta.closeTime,
                        fetchedAt: Date.now(),
                    });
                }
            }
            cursor = data.cursor;
            if (!cursor) break;
        }
    }
}

export function updateFromMarketBatch(markets: MarketMeta[]): void {
    if (markets.length === 0) return;
    const now = Date.now();
    for (const meta of markets) {
        registry.set(meta.ticker, {
            ticker: meta.ticker,
            series: meta.series,
            status: meta.status ?? 'unknown',
            closeTime: meta.closeTime,
            fetchedAt: now,
        });
    }
    const evictBefore = now - 10 * 60 * 1000;
    for (const [ticker, entry] of registry) {
        if (entry.fetchedAt < evictBefore) registry.delete(ticker);
    }
}

export function getActiveTickers(): string[] {
    const tickers: string[] = [];
    for (const entry of registry.values()) {
        if (entry.status !== 'finalized') tickers.push(entry.ticker);
    }
    return tickers;
}

export function getRegistrySize(): number {
    return registry.size;
}
