import type {
    MarketApi,
    BatchGetMarketCandlesticksResponse,
    MarketCandlesticksResponse,
} from 'kalshi-typescript';
import { log } from '@repo/common';

// Kalshi caps total candlesticks per /markets/candlesticks request at 10_000.
// candles_per_ticker = window_seconds / 60 / period_interval_min
// max_tickers = floor(10_000 / candles_per_ticker), with a small safety margin.
const KALSHI_MAX_CANDLES_PER_REQUEST = 10_000;
const SAFETY_MARGIN = 0.95; // use 95% of the cap to avoid edge cases
const CHUNK_SLEEP_MS = 50; // gap between chunked requests to ease rate-limit pressure

function computeChunkSize(
    startTs: number,
    endTs: number,
    periodIntervalMin: number
): number {
    const windowSeconds = Math.max(1, endTs - startTs);
    const candlesPerTicker = Math.max(
        1,
        Math.ceil(windowSeconds / 60 / periodIntervalMin)
    );
    const cap = Math.floor(
        (KALSHI_MAX_CANDLES_PER_REQUEST * SAFETY_MARGIN) / candlesPerTicker
    );
    return Math.max(1, cap);
}

export interface GetCandlestickBatchParams {
    startTs: number;
    endTs: number;
    periodInterval: number;
    includeLatestBeforeStart?: boolean;
}

export async function getCandlestickBatch(
    api: MarketApi,
    tickers: string[],
    params: GetCandlestickBatchParams
): Promise<BatchGetMarketCandlesticksResponse | null> {
    const merged: BatchGetMarketCandlesticksResponse = { markets: [] };

    const chunkSize = computeChunkSize(
        params.startTs,
        params.endTs,
        params.periodInterval
    );
    log(
        'info',
        'kalshi.candlestick.api',
        `chunkSize=${chunkSize} (window=${params.endTs - params.startTs}s, periodMin=${params.periodInterval})`
    );

    let page = 0;
    for (let i = 0; i < tickers.length; i += chunkSize) {
        if (i > 0 && CHUNK_SLEEP_MS > 0) {
            await new Promise((r) => setTimeout(r, CHUNK_SLEEP_MS));
        }
        const chunk = tickers.slice(i, i + chunkSize);
        try {
            const res = await api.batchGetMarketCandlesticks(
                chunk.join(','),
                params.startTs,
                params.endTs,
                params.periodInterval,
                params.includeLatestBeforeStart
            );
            page += 1;
            if (res.data?.markets) {
                merged.markets.push(...res.data.markets);
            }
        } catch (error) {
            const ax = error as { response?: { status?: number; data?: unknown }; config?: { url?: string; params?: unknown } };
            log(
                'error',
                'kalshi.candlestick.api',
                `batch::failed (page: ${page}) status=${ax.response?.status} url=${ax.config?.url} params=${JSON.stringify(ax.config?.params)} body=${JSON.stringify(ax.response?.data)}`
            );
        } finally {
            if (page % 10 == 0) {
                log(
                    'info',
                    'kalshi.candlestick.api',
                    `final::${chunk[0]} (page: ${page})`
                );
            }
        }
    }

    log(
        'info',
        'kalshi.candlestick.api',
        `getCandlestickBatch::ok (total: ${merged.markets.length} markets)`
    );
    return merged;
}

/**
 * Streaming variant of getCandlestickBatch.
 *
 * Yields each chunk's markets as soon as the API responds, instead of
 * accumulating all chunks into a single response. Memory peak per call is
 * one chunk's worth of candles (chunkSize tickers x candles_per_ticker)
 * rather than tickers.length x candles_per_ticker.
 *
 * Use this for large fan-outs (daily backfill, multi-thousand tickers).
 * Keep the non-streaming `getCandlestickBatch` for small calls (preview,
 * single ad-hoc fetch) where the simpler return type is preferable.
 *
 * Caller pattern:
 *   for await (const markets of getCandlestickBatchStream(api, tickers, params)) {
 *     for (const m of markets) { ... process and publish ... }
 *   }
 */
export async function* getCandlestickBatchStream(
    api: MarketApi,
    tickers: string[],
    params: GetCandlestickBatchParams
): AsyncGenerator<MarketCandlesticksResponse[], void, void> {
    const chunkSize = computeChunkSize(
        params.startTs,
        params.endTs,
        params.periodInterval
    );
    log(
        'info',
        'kalshi.candlestick.api',
        `stream::chunkSize=${chunkSize} (window=${params.endTs - params.startTs}s, periodMin=${params.periodInterval})`
    );

    let page = 0;
    let totalMarkets = 0;
    for (let i = 0; i < tickers.length; i += chunkSize) {
        if (i > 0 && CHUNK_SLEEP_MS > 0) {
            await new Promise((r) => setTimeout(r, CHUNK_SLEEP_MS));
        }
        const chunk = tickers.slice(i, i + chunkSize);
        try {
            const res = await api.batchGetMarketCandlesticks(
                chunk.join(','),
                params.startTs,
                params.endTs,
                params.periodInterval,
                params.includeLatestBeforeStart
            );
            page += 1;
            const markets = res.data?.markets ?? [];
            totalMarkets += markets.length;
            if (markets.length > 0) {
                yield markets;
            }
        } catch (error) {
            const ax = error as {
                response?: { status?: number; data?: unknown };
                config?: { url?: string };
            };
            log(
                'error',
                'kalshi.candlestick.api',
                `stream::batch::failed (page: ${page}) status=${ax.response?.status} body=${JSON.stringify(ax.response?.data)}`
            );
        } finally {
            if (page > 0 && page % 10 === 0) {
                log(
                    'info',
                    'kalshi.candlestick.api',
                    `stream::progress (page: ${page}, head: ${chunk[0]})`
                );
            }
        }
    }

    log(
        'info',
        'kalshi.candlestick.api',
        `stream::done (total: ${totalMarkets} markets across ${page} pages)`
    );
}
