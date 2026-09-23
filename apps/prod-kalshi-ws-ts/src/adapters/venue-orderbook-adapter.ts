// Venue-neutral orderbook event boundary (00.architecture.mvp1.md §4.0/§4.1).
// The reconstructor (../use-ws/orderbook-reconstructor.ts) depends only on
// this shape — no exchange dialect (message field names, channel strings)
// may leak past an adapter's toBookEvent(). A second venue (Polymarket, MVP3)
// becomes a new adapter here, not a change to the reconstructor.

export interface PriceLevel {
    price: string;
    qty: string;
}

export interface BookEvent {
    kind: 'snapshot' | 'delta';
    ticker: string;
    // The venue's own sequence number, or null when it provides none
    // (§8 Q4). Gap detection ONLY (§4.0.1) — the adapter must report the
    // venue's truth as-is, never fabricate a value here. Row identity
    // (orderbookKey) is a separate field the reconstructor assigns itself;
    // see emitSeq in orderbook-reconstructor.ts. Splitting the two matters
    // because a synthesized counter is contiguous by construction, so using
    // it for gap detection makes `seq > currentSeq + 1` permanently false —
    // the check would silently never fire.
    venueSeq: number | null;
    timeMs: number;
    bids: PriceLevel[];
    asks: PriceLevel[];
}

export interface VenueOrderbookAdapter {
    readonly venue: string;
    toBookEvent(raw: Record<string, unknown>): BookEvent | null;
}
