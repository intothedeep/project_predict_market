/**
 * orderbook-writer
 * ================
 * Consumes `pred.orderbook.ws` full-book snapshots via a MessageSource
 * (§4.5) and applies them to Redis statelessly (§4.2 option A) — no
 * VenueOrderbookAdapter here, that boundary is the producer's (U6).
 *
 * MVP1: MOCK_SOURCE=1 selects mockSource, replaying /mocks/*.jsonl.
 * kafkaSource does not exist yet (MVP3) — anything other than MOCK_SOURCE=1
 * fails fast at startup rather than idling with nothing flowing (§4.5, mock
 * must never be the default path).
 *
 * Run: MOCK_SOURCE=1 pnpm --filter @repo/orderbook-writer dev
 */

import { createClient } from 'redis';
import { log, registerShutdown } from '@repo/common';
import { createMockSource } from './mock-source';
import { applySnapshot } from './redis-writer';
import type { MessageSource } from './message-source';
import {
    HEARTBEAT_INTERVAL_MS,
    HEARTBEAT_TTL_SECONDS,
    MOCK_ORDERBOOK_FILE,
    MOCK_REPLAY_INTERVAL_MS,
    MOCK_SOURCE_ENABLED,
    REDIS_URL,
} from './env';

const SERVICE = 'orderbook-writer';
const TOPIC = 'pred.orderbook.ws';
const HEARTBEAT_KEY = 'writer:heartbeat';

function selectSource(): MessageSource {
    if (MOCK_SOURCE_ENABLED) {
        log('info', SERVICE, 'selected mockSource', {
            file: MOCK_ORDERBOOK_FILE,
            intervalMs: MOCK_REPLAY_INTERVAL_MS,
        });
        return createMockSource(MOCK_ORDERBOOK_FILE, MOCK_REPLAY_INTERVAL_MS);
    }
    // kafkaSource is MVP3 (§4.5/§6) — refuse to idle silently.
    throw new Error(
        'no MessageSource available: kafkaSource is not implemented until MVP3 (00.architecture.mvp1.md §4.5). Set MOCK_SOURCE=1 to run against mock data.'
    );
}

async function main(): Promise<void> {
    const source = selectSource();

    const redis = createClient({ url: REDIS_URL });
    redis.on('error', (err) =>
        log('error', SERVICE, 'redis client error', { err })
    );
    await redis.connect();
    log('info', SERVICE, 'redis connected', { url: REDIS_URL });

    const touchHeartbeat = (): void => {
        redis
            .set(HEARTBEAT_KEY, String(Date.now()), {
                EX: HEARTBEAT_TTL_SECONDS,
            })
            .catch((err) =>
                log('warn', SERVICE, 'heartbeat write failed', { err })
            );
    };
    touchHeartbeat();
    const heartbeatTimer = setInterval(touchHeartbeat, HEARTBEAT_INTERVAL_MS);
    heartbeatTimer.unref();

    await source.subscribe(TOPIC, (snapshot) => {
        applySnapshot(redis, snapshot)
            .then((result) => {
                log('info', SERVICE, 'snapshot applied', {
                    venue: snapshot.venue,
                    ticker: snapshot.ticker,
                    timeMs: snapshot.timeMs.toString(),
                    seq: snapshot.seq?.toString(),
                    result,
                });
            })
            .catch((err) =>
                log('error', SERVICE, 'apply snapshot failed', {
                    err,
                    venue: snapshot.venue,
                    ticker: snapshot.ticker,
                })
            );
    });

    log('info', SERVICE, 'orderbook-writer started', { topic: TOPIC });

    registerShutdown({
        name: SERVICE,
        stop: async () => {
            clearInterval(heartbeatTimer);
            await source.close();
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
