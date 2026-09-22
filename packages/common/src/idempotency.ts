function part(value: unknown): string {
    return String(value ?? '').trim();
}

function key(parts: Array<unknown>): string {
    return parts.map(part).filter(Boolean).join('|');
}

const SOURCE_ABBR: Record<string, string> = {
    binance: 'bi',
    coinbase: 'co',
    kraken: 'kr',
    bybit: 'by',
    live_ws: 'ws',
    live_rest: 'rs',
};

export function sourceAbbr(source: string): string {
    return SOURCE_ABBR[source] ?? source.slice(0, 2).toLowerCase();
}

// timeMs = producer receive time captured once per message; seq = per-process
// monotonic counter disambiguating same-ms ticks. The key is embedded in the
// payload, so redelivery of the SAME message keeps the same key (dedups)
// while distinct ticks never share one.
export function predTickKey(
    venue: string,
    ticker: string,
    timeMs: number,
    seq: number
): string {
    return key(['pred', venue, 'tick', ticker, timeMs, seq]);
}

export function predTradeKey(
    venue: string,
    ticker: string,
    nativeId: string | number
): string {
    return key(['pred', venue, 'trade', ticker, nativeId]);
}

// Venue-neutral, no family prefix: the first argument already determines
// both family and venue (§4.4).
export function orderbookKey(
    venue: string,
    ticker: string,
    seq: string | number
): string {
    return key(['ob', venue, ticker, seq]);
}

export function cryptoTradeKey(
    venue: string,
    symbol: string,
    nativeId: string | number
): string {
    return key(['crypto', sourceAbbr(venue), 'trade', symbol, nativeId]);
}

// Same timeMs+seq scheme as predTickKey — see comment there.
export function cryptoTickerKey(
    venue: string,
    symbol: string,
    timeMs: number,
    seq: number
): string {
    return key(['crypto', sourceAbbr(venue), 'tick', symbol, timeMs, seq]);
}
