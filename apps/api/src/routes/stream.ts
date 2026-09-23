/**
 * GET /api/stream — SSE push of orderbook updates (§8 Q3: SSE, no browser
 * WebSocket). Polls `ob:index` + each hash on an interval (no Redis
 * keyspace notifications — that's a server config change, out of scope) and
 * emits an event only when a ticker's `time_ms` actually changed since the
 * last poll (change-detecting, per-connection).
 *
 * U9 shipped an unconditional 500ms re-broadcast instead, to paper over the
 * mock replayer looping without rebasing (Redis froze after pass 1, so a
 * change-only stream went silent). U17 (§4.5.1) fixed the replayer itself —
 * time_ms now genuinely advances every pass — so the re-broadcast is no
 * longer needed and is removed: it kept the stream *looking* alive over
 * frozen data, which is the opposite of the freshness the EXIT criterion
 * demonstrates.
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

            // Per-connection: last time_ms seen for each "{venue}:{ticker}"
            // member, so a fresh connection sends initial state for
            // everything and later polls send only what actually changed.
            const lastSeenTimeMs = new Map<string, string>();

            while (!aborted) {
                const members = await listOrderbookIndex(redis);
                for (const member of members) {
                    const sep = member.indexOf(':');
                    const venue = member.slice(0, sep);
                    const ticker = member.slice(sep + 1);
                    const hash = await getOrderbookHash(redis, venue, ticker);
                    const snapshot = toOrderbookSnapshot(hash, Date.now());
                    if (!snapshot) continue;

                    const timeMsKey = hash.time_ms;
                    if (lastSeenTimeMs.get(member) === timeMsKey) continue;
                    lastSeenTimeMs.set(member, timeMsKey);

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
