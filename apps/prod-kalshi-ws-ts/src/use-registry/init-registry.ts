// Registry redesign (00.architecture.mvp1.md §7.1): the old registry read
// its ticker list from a ClickHouse view (`kalshi_market_api_mv_active`)
// fed by the dropped `prod-kalshi-api-ts` app — a producer -> ClickHouse
// dependency that violated the layering. This calls Kalshi's REST market-list
// endpoint directly via @repo/kalshi-core's getMarketBatch, feeding its
// registry module (initRegistry/getActiveTickers), which already assumes a
// REST-shaped MarketBatchFetcher.

import { MarketApi, GetMarketsStatusEnum } from 'kalshi-typescript';
import {
    createKalshiConfig,
    getMarketBatch,
    initRegistry as coreInitRegistry,
    getActiveTickers,
    type MarketBatchFetcher,
} from '@repo/kalshi-core';
import {
    KALSHI_API_KEY_ID,
    KALSHI_API_URL,
    KALSHI_PEM_PATH,
    KALSHI_MARKETS_REFRESH_MS,
    DRY_RUN,
} from '@repo/env';
import { log } from '@repo/common';

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

export async function initRegistry(seriesFilter: readonly string[]): Promise<void> {
    const fetcher = createMarketBatchFetcher();
    await coreInitRegistry(fetcher, [...seriesFilter]);

    const tickers = getActiveTickers();
    if (DRY_RUN) {
        log(
            'info',
            'init-registry',
            `[DRY_RUN] registry initialized via REST: ${tickers.length} active tickers`
        );
    } else {
        log(
            'info',
            'init-registry',
            `registry initialized via REST: ${tickers.length} active tickers`
        );
    }
}

export function startRegistryRefresh(
    onRefresh: (tickers: string[]) => void,
    seriesFilter: readonly string[]
): { stop: () => void } {
    let refreshTimer: ReturnType<typeof setInterval> | null = null;

    async function refresh(): Promise<void> {
        try {
            await initRegistry(seriesFilter);
            onRefresh(getActiveTickers());
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
