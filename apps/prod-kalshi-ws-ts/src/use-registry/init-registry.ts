// Registry redesign (00.architecture.mvp1.md §7.1, §7.1.1): the old registry
// read its ticker list from a ClickHouse view (`kalshi_market_api_mv_active`)
// fed by the dropped `prod-kalshi-api-ts` app — a producer -> ClickHouse
// dependency that violated the layering. This calls Kalshi's REST market-list
// endpoint directly via @repo/kalshi-core's getMarketBatch, feeding the
// app-local registry (./ticker-registry.ts). §7.1.1 (U16 ②) restored that
// registry as a DI'd factory instance instead of a module singleton.

import { MarketApi, GetMarketsStatusEnum } from 'kalshi-typescript';
import {
    createKalshiConfig,
    getMarketBatch,
    parseMarket,
} from '@repo/kalshi-core';
import {
    KALSHI_API_KEY_ID,
    KALSHI_API_URL,
    KALSHI_PEM_PATH,
    KALSHI_MARKETS_REFRESH_MS,
    DRY_RUN,
} from '@repo/env';
import { log } from '@repo/common';
import { createTickerRegistry, type MarketInput } from './ticker-registry';

export interface MarketBatchPage {
    markets?: unknown[];
    cursor?: string;
}

export type MarketBatchFetcher = (params: {
    seriesTicker: string;
    cursor?: string;
}) => Promise<MarketBatchPage | null>;

function createMarketBatchFetcher(): MarketBatchFetcher {
    const config = createKalshiConfig({
        apiKeyId: KALSHI_API_KEY_ID ?? '',
        privateKeyPath: KALSHI_PEM_PATH,
        baseUrl: KALSHI_API_URL,
    });
    const api = new MarketApi(config);

    return async ({ seriesTicker, cursor }) => {
        // status: 'open' — the REST equivalent of the old
        // kalshi_market_api_mv_active view's "active" filter. Without it,
        // settled/closed markets in the series would also register.
        const res = await getMarketBatch(api, {
            seriesTicker,
            cursor,
            status: GetMarketsStatusEnum.Open,
        });
        if (!res) return null;
        return { markets: res.markets, cursor: res.cursor };
    };
}

async function fetchAllMarkets(
    fetcher: MarketBatchFetcher,
    seriesTickers: string[]
): Promise<MarketInput[]> {
    const markets: MarketInput[] = [];

    for (const series of seriesTickers) {
        let cursor: string | undefined;
        while (true) {
            const data = await fetcher({ seriesTicker: series, cursor });
            if (!data?.markets?.length) break;
            for (const raw of data.markets) {
                const meta = parseMarket(raw, series);
                if (meta) {
                    markets.push({
                        ticker: meta.ticker,
                        series: meta.series,
                        status: meta.status ?? 'unknown',
                    });
                }
            }
            cursor = data.cursor;
            if (!cursor) break;
        }
    }

    return markets;
}

export async function initRegistry(
    registry: ReturnType<typeof createTickerRegistry>,
    seriesFilter: readonly string[]
): Promise<void> {
    const fetcher = createMarketBatchFetcher();
    const markets = await fetchAllMarkets(fetcher, [...seriesFilter]);

    if (!DRY_RUN) {
        registry.updateFromMarkets(markets);
    } else {
        log(
            'info',
            'init-registry',
            `[DRY_RUN] would update ${markets.length} markets`
        );
    }

    const tickers = registry.getActiveTickers();
    log(
        'info',
        'init-registry',
        `registry initialized via REST: ${tickers.length} active tickers`
    );
}

export function startRegistryRefresh(
    registry: ReturnType<typeof createTickerRegistry>,
    onRefresh: (tickers: string[]) => void,
    seriesFilter: readonly string[]
): { stop: () => void } {
    let refreshTimer: ReturnType<typeof setInterval> | null = null;

    async function refresh(): Promise<void> {
        try {
            await initRegistry(registry, seriesFilter);
            onRefresh(registry.getActiveTickers());
        } catch (error) {
            log(
                'error',
                'registry-refresh',
                `refresh failed: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    refreshTimer = setInterval(() => {
        refresh();
    }, KALSHI_MARKETS_REFRESH_MS);

    return {
        stop: () => {
            if (refreshTimer) {
                clearInterval(refreshTimer);
                refreshTimer = null;
            }
        },
    };
}
