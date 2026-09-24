/**
 * Redis writer — applies a decoded PredOrderbook snapshot to the §4.4 shape:
 *
 *   ob:{venue}:{ticker}   HASH  { venue, ticker, time_ms, seq, bids, asks }  TTL 600s
 *   ob:index              SET   "{venue}:{ticker}" members, no TTL
 *
 * Ordering is not guaranteed (§5), so writes go through a Lua
 * compare-and-set keyed on time_ms (not seq — seq can reset on venue
 * reconnect, §8 Q4): a snapshot older than or equal to what is already
 * stored is dropped instead of overwriting a newer one. HSET + EXPIRE + SADD
 * happen atomically in the same script so a rejected write touches nothing.
 */

import type { createClient } from 'redis';
import type { DecodedOrderbook } from './message-source';

type RedisClient = ReturnType<typeof createClient>;
import { ORDERBOOK_TTL_SECONDS } from './env';

// KEYS[1] = ob:{venue}:{ticker}, KEYS[2] = ob:index
// ARGV[1] = ttlSeconds, ARGV[2] = newTimeMs, ARGV[3] = index member
// ARGV[4..] = field, value, field, value, ... (even count)
const LWW_GUARD_SCRIPT = `
local key = KEYS[1]
local indexKey = KEYS[2]
local ttl = tonumber(ARGV[1])
local newTimeMs = tonumber(ARGV[2])
local indexMember = ARGV[3]

local existing = redis.call('HGET', key, 'time_ms')
if existing and tonumber(existing) >= newTimeMs then
  return 0
end

for i = 4, #ARGV, 2 do
  redis.call('HSET', key, ARGV[i], ARGV[i + 1])
end
redis.call('EXPIRE', key, ttl)
redis.call('SADD', indexKey, indexMember)
return 1
`;

export type ApplyResult = 'applied' | 'rejected';

/**
 * Wire contract (§4.0): PredOrderbook.seq is always populated by the
 * producer (U6 synthesizes it when the venue gives none). The writer trusts
 * that but does not itself synthesize — a missing seq here means the
 * contract was violated upstream, and that must fail loudly rather than
 * write a broken hash.
 */
export async function applySnapshot(
    client: RedisClient,
    snapshot: DecodedOrderbook
): Promise<ApplyResult> {
    if (snapshot.seq === undefined) {
        throw new Error(
            `PredOrderbook.seq is missing on the wire for ${snapshot.venue}:${snapshot.ticker} — producer must always populate it (00.architecture.mvp1.md §4.0)`
        );
    }

    const key = `ob:${snapshot.venue}:${snapshot.ticker}`;
    const indexMember = `${snapshot.venue}:${snapshot.ticker}`;
    const fields: Array<[string, string]> = [
        ['venue', snapshot.venue],
        ['ticker', snapshot.ticker],
        ['time_ms', snapshot.timeMs.toString()],
        ['seq', snapshot.seq.toString()],
        ['bids', JSON.stringify(snapshot.bids)],
        ['asks', JSON.stringify(snapshot.asks)],
    ];

    const result = await client.eval(LWW_GUARD_SCRIPT, {
        keys: [key, 'ob:index'],
        arguments: [
            String(ORDERBOOK_TTL_SECONDS),
            snapshot.timeMs.toString(),
            indexMember,
            ...fields.flat(),
        ],
    });

    return result === 1 ? 'applied' : 'rejected';
}
