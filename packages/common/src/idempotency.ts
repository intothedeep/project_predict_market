// Key functions have fixed arity — every position is always filled. An empty
// or missing component must fail loudly, not silently shorten the key (that
// silently folds distinct rows onto one idempotency key — see 00.architecture
// .mvp1.md §4.4, "키 헬퍼의 '빈 성분 제거'는 버그다"). If a component may
// legitimately be absent (e.g. a venue omitting a native trade id), the
// caller must supply a deterministic composite fallback, not an empty value.
function part(value: unknown, index: number, total: number): string {
    const s = String(value ?? '').trim();
    if (s === '') {
        throw new Error(
            `idempotency key component ${index + 1}/${total} is empty or missing (raw value: ${JSON.stringify(value)})`
        );
    }
    return s;
}

function key(parts: Array<unknown>): string {
    return parts.map((v, i) => part(v, i, parts.length)).join('|');
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

// §4.4 (2): a venue that omits its native trade id (proto: optional string
// trade_id) must not pass an empty nativeId — that throws in key(). Instead
// the caller builds this deterministic composite, promoting the pattern
// prod-crypto-binance-ts already used ad hoc (`data.t ?? `${T}|${p}|${q}``)
// to a shared contract for predTradeKey/cryptoTradeKey callers.
export function compositeTradeId(timeMs: number, price: string, qty: string): string {
    return key([timeMs, price, qty]);
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
    return key(['crypto', venue, 'trade', symbol, nativeId]);
}

// Same timeMs+seq scheme as predTickKey — see comment there.
export function cryptoTickKey(
    venue: string,
    symbol: string,
    timeMs: number,
    seq: number
): string {
    return key(['crypto', venue, 'tick', symbol, timeMs, seq]);
}
