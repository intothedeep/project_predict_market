/**
 * OrderbookSnapshot (00.architecture.mvp1.md §3.5) mirrored from
 * apps/api/src/snapshot.ts. Duplicated, not imported: `@repo/api` has no
 * `exports` field and an app-to-app dependency in the DAG isn't in the
 * architecture (apps -> packages -> libs, no app-to-app edges, per
 * rules/development/code.md). See final report for this as an architect
 * question rather than a silent reconciliation.
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
