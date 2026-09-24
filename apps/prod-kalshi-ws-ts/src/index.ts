import { log, registerShutdown, startHeartbeatFile } from '@repo/common';
import { initProducer, disconnectProducer } from '@repo/common/kafka';
import {
    KALSHI_WS_URL,
    KALSHI_WS_MARKET_CHUNK_SIZE,
    DRY_RUN,
    KALSHI_API_KEY_ID,
    KALSHI_PEM_PATH,
    KALSHI_SERIES_CATEGORY,
} from '@repo/env';

import { getSeriesByCategory } from '@repo/kalshi-core';
import { createConnectionPool } from './use-ws/connection-pool';
import { subscribePublic } from './use-ws/subscribe-public.ws';
import { handleMarketTick } from './use-ws/handle-market-tick.ws';
import { handleTrade } from './use-ws/handle-trade.ws';
import { createOrderbookDeltaHandler } from './use-ws/handle-orderbook-delta.ws';
import { initRegistry, startRegistryRefresh } from './use-registry/init-registry';
import { createTickerRegistry } from './use-registry/ticker-registry';

// MVP1 trim (00.architecture.mvp1.md §7): private channel handlers
// (fill/market_position/market_lifecycle/event_lifecycle/multivariate_*/
// communications/order_group_update/user_orders) and the private WS pool
// are NOT ported — private channels are out of scope for BTC data
// collection. Only the public channel (ticker/trade/orderbook_delta) runs.

const LOG_PREFIX = 'kalshi-ws';
const WS_URL = KALSHI_WS_URL;
const SHARD_SIZE = KALSHI_WS_MARKET_CHUNK_SIZE;

function chunk<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
}

async function start(): Promise<void> {
    if (!DRY_RUN) {
        await initProducer();
    }

    log('info', LOG_PREFIX, `KALSHI_API_KEY_ID=${KALSHI_API_KEY_ID}`);
    log('info', LOG_PREFIX, `KALSHI_PEM_PATH=${KALSHI_PEM_PATH}`);

    // Series filter based on KALSHI_SERIES_CATEGORY: 'all' | 'crypto' | 'hot'
    // (the weather domain is excluded entirely — §1, §7 env fix).
    const seriesFilter = getSeriesByCategory(KALSHI_SERIES_CATEGORY);
    log('info', LOG_PREFIX, `seriesFilter (${KALSHI_SERIES_CATEGORY}) = ${seriesFilter.length} series`);

    // Registry init via direct Kalshi REST call (§7.1) — no analytics-store
    // read dependency, no dropped-app market-list topic. Factory instance,
    // not a module singleton (§7.1.1, U16 ②).
    const registry = createTickerRegistry();
    await initRegistry(registry, seriesFilter);
    log('info', LOG_PREFIX, `registry initialized (category=${KALSHI_SERIES_CATEGORY}, ${seriesFilter.length} series)`);

    const obHandler = createOrderbookDeltaHandler(() => {
        // Reconnect is triggered by pool internals
        log('info', LOG_PREFIX, 'orderbook reconnect requested');
    });

    let publicPool: ReturnType<typeof createConnectionPool> | null = null;

    function createPublicPool(
        tickers: string[]
    ): ReturnType<typeof createConnectionPool> | null {
        if (tickers.length === 0) {
            log('warn', LOG_PREFIX, 'no active tickers');
            return null;
        }

        const chunks = chunk(tickers, SHARD_SIZE);
        let poolIndex = 0;

        // For simplicity, create one pool with all tickers
        // In production, you might shard into multiple pools
        // No auth headers on this pool (§7.2, U16 ③) — least privilege is
        // the default, and nothing here has needed credentials. CAVEAT: the
        // old (pre-U16) code signed `GET /trade-api/ws/v2` — the connection
        // path itself — which hints Kalshi may require auth to *connect*,
        // with "public/private" naming the channel rather than the
        // connection. If so, this removal is wrong and the old code was
        // accidentally right. Not resolved by reading code; U12 settles it —
        // a connection failure there is the evidence that reverses this.
        // createKalshiSigner/makeWsHeaders are not deleted (kalshi-core/src/
        // auth, ./connect.ws.ts) so re-adding headers is a one-line revert.
        const pool = createConnectionPool({
            name: `${LOG_PREFIX}-public-${poolIndex}`,
            url: WS_URL,
            onOpen: (ws) => {
                subscribePublic(ws, tickers, 1);
                log(
                    'info',
                    `${LOG_PREFIX}-PUBLIC`,
                    `subscribed to ${tickers.length} tickers`
                );
            },
            onMessage: (
                msg: Record<string, unknown>,
                reconnect: () => void
            ) => {
                const channel = msg.channel as string | undefined;

                switch (channel) {
                    case 'ticker':
                        handleMarketTick(msg);
                        break;
                    case 'trade':
                        handleTrade(msg);
                        break;
                    case 'orderbook_delta':
                    case 'orderbook_snapshot':
                        obHandler.handle(msg);
                        break;
                }
            },
        });

        return pool;
    }

    let currentTickers = registry.getActiveTickers();
    publicPool = createPublicPool(currentTickers);

    const registryRefresh = startRegistryRefresh(
        registry,
        (newTickers) => {
            const tickersChanged =
                currentTickers.length !== newTickers.length ||
                !currentTickers.every((t) => newTickers.includes(t));

            if (tickersChanged) {
                log(
                    'info',
                    LOG_PREFIX,
                    `ticker set changed: ${currentTickers.length} -> ${newTickers.length}`
                );
                currentTickers = newTickers;

                if (publicPool) {
                    publicPool.stop();
                }
                publicPool = createPublicPool(currentTickers);
            }
        },
        seriesFilter
    );

    log('info', LOG_PREFIX, 'kalshi-ws producer started');

    const heartbeat = startHeartbeatFile();

    // Graceful shutdown — stop callback reads publicPool at signal time
    // (it is reassigned on registry refresh). In DRY_RUN no producers
    // exist, so disconnectProducer resolves instantly.
    registerShutdown({
        name: LOG_PREFIX,
        stop: async () => {
            registryRefresh.stop();
            publicPool?.stop();
            obHandler.stop();
            heartbeat.stop();
            await disconnectProducer();
        },
    });
}

start().catch((error) => {
    log(
        'error',
        LOG_PREFIX,
        `startup failed: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
});
