/**
 * apps/api — Hono API serving OrderbookSnapshot (§3.5) from Redis, plus SSE
 * updates (§8 Q3). Reads Redis only — see routes/orderbook.ts for why
 * ClickHouse is not wired into this route.
 *
 * Run: pnpm --filter @repo/api dev
 */

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { createClient } from 'redis';
import { log, registerShutdown } from '@repo/common';
import { createOrderbookRoute } from './routes/orderbook';
import { createStreamRoute } from './routes/stream';
import { API_PORT, REDIS_URL } from './env';

const SERVICE = 'api';

async function main(): Promise<void> {
    const redis = createClient({ url: REDIS_URL });
    redis.on('error', (err) =>
        log('error', SERVICE, 'redis client error', { err })
    );
    await redis.connect();
    log('info', SERVICE, 'redis connected', { url: REDIS_URL });

    const app = new Hono();
    app.route('/api/orderbook', createOrderbookRoute(redis));
    app.route('/api/stream', createStreamRoute(redis));

    const server = serve({ fetch: app.fetch, port: API_PORT }, (info) => {
        log('info', SERVICE, 'api started', { port: info.port });
    });

    registerShutdown({
        name: SERVICE,
        stop: async () => {
            await new Promise<void>((resolve) => server.close(() => resolve()));
            await redis.quit();
        },
    });
}

main().catch((err) => {
    log('error', SERVICE, 'fatal startup error', {
        err: err instanceof Error ? err.message : String(err),
    });
    process.exit(1);
});
