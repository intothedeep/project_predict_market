import { useEffect, useMemo, useState } from 'react';
import { OrderbookPanel } from './components/OrderbookPanel';
import { useOrderbookStream } from './useOrderbookStream';

const TICK_MS = 500;

export function App() {
    const { entries, connectionState } = useOrderbookStream();
    const [nowMs, setNowMs] = useState(() => Date.now());

    // Drives FreshnessBadge's live-clocked age (freshness.ts) even when no
    // new SSE event arrives — a frozen server-computed stale_ms could not
    // show the writer-killed EXIT demo on its own.
    useEffect(() => {
        const id = setInterval(() => setNowMs(Date.now()), TICK_MS);
        return () => clearInterval(id);
    }, []);

    const venues = useMemo(() => {
        const set = new Set<string>();
        for (const { snapshot } of entries.values()) set.add(snapshot.venue);
        return Array.from(set).sort();
    }, [entries]);

    const [venueFilter, setVenueFilter] = useState<string>('all');

    const visibleEntries = useMemo(() => {
        return Array.from(entries.values())
            .filter(
                (e) => venueFilter === 'all' || e.snapshot.venue === venueFilter
            )
            .sort((a, b) => {
                if (a.snapshot.venue !== b.snapshot.venue) {
                    return a.snapshot.venue.localeCompare(b.snapshot.venue);
                }
                return a.snapshot.ticker.localeCompare(b.snapshot.ticker);
            });
    }, [entries, venueFilter]);

    return (
        <div className="min-h-screen p-4 flex flex-col gap-4">
            <header className="flex items-center justify-between gap-4 border-b border-border pb-3">
                <h1 className="text-sm uppercase tracking-wide">
                    Collection Dashboard
                </h1>
                <div className="flex items-center gap-3">
                    <select
                        className="border border-border bg-background text-xs px-2 py-1"
                        value={venueFilter}
                        onChange={(e) => setVenueFilter(e.target.value)}
                    >
                        <option value="all">all venues</option>
                        {venues.map((v) => (
                            <option key={v} value={v}>
                                {v}
                            </option>
                        ))}
                    </select>
                    <ConnectionBadge state={connectionState} />
                </div>
            </header>

            {visibleEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    waiting for orderbook data…
                </p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {visibleEntries.map(({ snapshot, receivedAt }) => (
                        <OrderbookPanel
                            key={`${snapshot.venue}:${snapshot.ticker}`}
                            snapshot={snapshot}
                            receivedAt={receivedAt}
                            nowMs={nowMs}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function ConnectionBadge({
    state,
}: {
    state: 'connecting' | 'open' | 'reconnecting';
}) {
    const isDown = state !== 'open';
    const color = isDown ? 'bg-signal-disconnected' : 'bg-signal-live';
    const label = state === 'open' ? 'stream live' : state;
    return (
        <span
            className={`inline-block px-2 py-0.5 text-xs uppercase text-primary-foreground ${color}`}
        >
            {label}
        </span>
    );
}
