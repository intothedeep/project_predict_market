/**
 * Redis reads for the §4.4 orderbook shape. Infra layer — no shaping here,
 * see snapshot.ts for the pure OrderbookSnapshot assembly.
 */

import type { createClient } from 'redis';
import type { RawOrderbookHash } from './snapshot';

type RedisClient = ReturnType<typeof createClient>;

export function orderbookHashKey(venue: string, ticker: string): string {
    return `ob:${venue}:${ticker}`;
}

export async function getOrderbookHash(
    client: RedisClient,
    venue: string,
    ticker: string
): Promise<RawOrderbookHash> {
    return client.hGetAll(orderbookHashKey(venue, ticker));
}

/** `ob:index` SET members, each "{venue}:{ticker}" (§4.4). */
export async function listOrderbookIndex(
    client: RedisClient
): Promise<string[]> {
    return client.sMembers('ob:index');
}
