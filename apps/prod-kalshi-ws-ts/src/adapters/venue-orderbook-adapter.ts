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
    // null when the venue provides no sequence (§8 Q4) — the reconstructor
    // synthesizes a per-(venue, ticker) monotonic counter in that case. The
    // adapter must report the venue's truth as-is, never fabricate a seq.
    seq: number | null;
    timeMs: number;
    bids: PriceLevel[];
    asks: PriceLevel[];
}

export interface VenueOrderbookAdapter {
    readonly venue: string;
    toBookEvent(raw: Record<string, unknown>): BookEvent | null;
}
