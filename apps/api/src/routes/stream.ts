/**
 * GET /api/stream — SSE push of orderbook updates (§8 Q3: SSE, no browser
 * WebSocket). Polls `ob:index` + each hash on an interval (no Redis
 * keyspace notifications — that's a server config change, out of U9's
 * scope) and re-broadcasts every known ticker's current OrderbookSnapshot
 * each tick (not diffed) — the mock replay's LWW guard (§4.4) makes
 * time_ms stop advancing once the file loop passes its own peak, so a
 * change-only stream goes silent after one pass; broadcasting every tick
 * keeps `stale_ms` visibly live in the stream and keeps this the same
 * shape apps/web reuses from the REST route.
 */

import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import type { createClient } from 'redis';
import { getOrderbookHash, listOrderbookIndex } from '../redis-reader';
import { toOrderbookSnapshot } from '../snapshot';
import { SSE_POLL_INTERVAL_MS } from '../env';

type RedisClient = ReturnType<typeof createClient>;

export function createStreamRoute(redis: RedisClient): Hono {
    const route = new Hono();

    route.get('/', (c) => {
        return streamSSE(c, async (stream) => {
            let aborted = false;
            stream.onAbort(() => {
                aborted = true;
            });

            while (!aborted) {
                const members = await listOrderbookIndex(redis);
                for (const member of members) {
                    const sep = member.indexOf(':');
                    const venue = member.slice(0, sep);
                    const ticker = member.slice(sep + 1);
                    const hash = await getOrderbookHash(redis, venue, ticker);
                    const snapshot = toOrderbookSnapshot(hash, Date.now());
                    if (!snapshot) continue;

                    await stream.writeSSE({
                        event: 'orderbook',
                        data: JSON.stringify(snapshot),
                    });
                }
                await stream.sleep(SSE_POLL_INTERVAL_MS);
            }
        });
    });

    return route;
}
