/**
 * OrderbookSnapshot (00.architecture.mvp1.md §3.5) — pure view-model
 * assembly from a raw `ob:{venue}:{ticker}` Redis hash (§4.4 shape).
 *
 * No I/O here (rules/development/code.md — domain logic performs no side
 * effects). `redis-reader.ts` fetches the hash; this module only shapes it.
 */

export interface OrderbookLevel {
    price: string;
    qty: string;
}

export interface OrderbookSnapshot {
    venue: string;
    ticker: string;
    time_ms: number;
    seq: number;
    bids: OrderbookLevel[];
    asks: OrderbookLevel[];
    feed: 'mock' | 'live';
    stale_ms: number;
}

/** Raw `HGETALL ob:{venue}:{ticker}` result — all values are strings. */
export type RawOrderbookHash = Record<string, string>;

const REQUIRED_FIELDS = ['venue', 'ticker', 'time_ms', 'seq', 'bids', 'asks'] as const;

/**
 * §3.5: feed is computed from the ticker's MOCK_ prefix, never a DB/Redis
 * column. Kalshi tickers start with KX/uppercase letters and Polymarket
 * CLOB token ids are decimal digits only, so this is unambiguous for both
 * venues — a real ticker can never start with MOCK_.
 */
function computeFeed(ticker: string): 'mock' | 'live' {
    return ticker.startsWith('MOCK_') ? 'mock' : 'live';
}

/**
 * Returns null if the hash is empty (key does not exist in Redis) or
 * missing any of the §4.4 fields — never a half-filled OrderbookSnapshot.
 */
export function toOrderbookSnapshot(
    hash: RawOrderbookHash,
    nowMs: number
): OrderbookSnapshot | null {
    for (const field of REQUIRED_FIELDS) {
        if (!(field in hash)) return null;
    }

    const timeMs = Number(hash.time_ms);
    const seq = Number(hash.seq);
    if (!Number.isFinite(timeMs) || !Number.isFinite(seq)) return null;

    let bids: OrderbookLevel[];
    let asks: OrderbookLevel[];
    try {
        bids = JSON.parse(hash.bids);
        asks = JSON.parse(hash.asks);
    } catch {
        return null;
    }

    return {
        venue: hash.venue,
        ticker: hash.ticker,
        time_ms: timeMs,
        seq,
        bids,
        asks,
        feed: computeFeed(hash.ticker),
        stale_ms: nowMs - timeMs,
    };
}
