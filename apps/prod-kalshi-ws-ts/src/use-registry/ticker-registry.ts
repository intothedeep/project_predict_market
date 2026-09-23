// App-local registry (00.architecture.mvp1.md §7.1.1, U16 ruling ②).
// U6 replaced this with @repo/kalshi-core's registry module, which changed
// behavior beyond §7.1's scope: it lost per-entry TTL eviction, loosened
// the status filter from a whitelist to `!== 'finalized'`, and turned a
// factory instance into a module singleton. This restores the original
// shape; only the data source changed (ClickHouse view -> Kalshi REST, via
// ./init-registry.ts's fetcher).

export interface TickerEntry {
    ticker: string;
    series: string;
    status: string;
    lastSeenMs: number;
}

export interface MarketInput {
    ticker: string;
    series: string;
    status: string;
}

const ENTRY_TTL_MS = 10 * 60 * 1_000; // 10 minutes

// The old whitelist (`['active', 'initialized', 'inactive']`) was the
// dropped ClickHouse view's own status vocabulary, not Kalshi's. The
// registry's data source is now Kalshi REST directly, whose `status` field
// (passed through by kalshi-core's parseMarket, unchanged) uses Kalshi's own
// enum. The REST fetcher already requests `status: 'open'` (§7.1, confirmed
// U6), so 'open' is the only value expected here; the whitelist stays as a
// second, independent gate rather than trusting the REST filter alone.
const ACTIVE_STATUSES = ['open'];

export function createTickerRegistry(): {
    getActiveTickers: () => string[];
    updateFromMarkets: (markets: MarketInput[]) => void;
} {
    const entries = new Map<string, TickerEntry>();

    return {
        getActiveTickers: () => {
            const now = Date.now();
            const active: string[] = [];

            for (const [ticker, entry] of entries.entries()) {
                if (now - entry.lastSeenMs <= ENTRY_TTL_MS) {
                    if (ACTIVE_STATUSES.includes(entry.status)) {
                        active.push(ticker);
                    }
                } else {
                    entries.delete(ticker);
                }
            }

            return active;
        },
        updateFromMarkets: (markets) => {
            const now = Date.now();

            for (const market of markets) {
                entries.set(market.ticker, {
                    ticker: market.ticker,
                    series: market.series,
                    status: market.status,
                    lastSeenMs: now,
                });
            }

            // Evict stale entries.
            for (const [ticker, entry] of entries.entries()) {
                if (now - entry.lastSeenMs > ENTRY_TTL_MS) {
                    entries.delete(ticker);
                }
            }
        },
    };
}
