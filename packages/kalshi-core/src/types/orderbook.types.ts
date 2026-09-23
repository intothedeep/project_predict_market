export type TOrderbookLevelTuple = [string, string];

/**
 * Kalshi WS parsing type — not the §3.5 view model. Renamed from
 * `TOrderbookSnapshot` (U18, 00.architecture.mvp1.md §3.5.1): one name, two
 * meanings, the same failure `venue`/`ingest_path`/`feed` split addressed.
 * Stays venue-named inside the adapter per §4.0; this is not a `Pred*`
 * (that governs wire/table contracts, this is one venue's dialect type).
 */
export interface KalshiWsOrderbook {
    ticker: string;
    bids: TOrderbookLevelTuple[];
    asks: TOrderbookLevelTuple[];
}

export interface WsOrderbookDelta {
    type: 'orderbook_snapshot' | 'orderbook_delta';
    ticker: string;
    seq?: number;
    bids?: TOrderbookLevelTuple[];
    asks?: TOrderbookLevelTuple[];
}
