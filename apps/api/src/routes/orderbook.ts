/**
 * GET /api/orderbook/:venue/:ticker (00.architecture.mvp1.md §3.5).
 *
 * Redis-only, deliberately — §5.6 line 954: "the dashboard's current
 * orderbook reads from Redis, it never takes the FINAL path; ClickHouse is
 * for charts/counts/freshness." There is no route/shape defined anywhere
 * for a ClickHouse-backed read of this same view, so none is invented here
 * (see final report for the resulting clarification request).
 *
 * Unknown venue/ticker naturally 404s because the Redis key does not
 * exist — no hardcoded venue allowlist needed.
 */

import { Hono } from 'hono';
import type { createClient } from 'redis';
import { getOrderbookHash } from '../redis-reader';
import { toOrderbookSnapshot } from '../snapshot';

type RedisClient = ReturnType<typeof createClient>;

export function createOrderbookRoute(redis: RedisClient): Hono {
    const route = new Hono();

    route.get('/:venue/:ticker', async (c) => {
        const { venue, ticker } = c.req.param();
        const hash = await getOrderbookHash(redis, venue, ticker);
        const snapshot = toOrderbookSnapshot(hash, Date.now());

        if (!snapshot) {
            return c.json(
                { error: 'orderbook not found', venue, ticker },
                404
            );
        }

        return c.json(snapshot);
    });

    return route;
}
