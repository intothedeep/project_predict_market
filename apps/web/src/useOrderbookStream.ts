/**
 * SSE consumption — the side-effect boundary (rules/development/code.md).
 * Talks to GET /api/stream (§8 Q3, change-detecting per U17) via the Vite
 * dev proxy so the browser stays same-origin.
 *
 * Two independent signals, deliberately not conflated:
 *   - `connectionState`: is the SSE connection itself up? (API dead -> a
 *     deliberate-breakage signal, independent of any one ticker's data.)
 *   - per-snapshot age (freshness.ts): is a given ticker's data still
 *     recent? (writer dead -> stale while the connection stays open.)
 * Data is never cleared on disconnect — showing the last known snapshot
 * while flagging the connection as down is the honest degradation; wiping
 * the screen would hide that data instead of admitting it's unconfirmed.
 */

import { useEffect, useRef, useState } from 'react';
import type { OrderbookSnapshot } from './types';

export type ConnectionState = 'connecting' | 'open' | 'reconnecting';

interface StreamEntry {
    snapshot: OrderbookSnapshot;
    receivedAt: number;
}

export type StreamEntries = Map<string, StreamEntry>;

function entryKey(snapshot: OrderbookSnapshot): string {
    return `${snapshot.venue}:${snapshot.ticker}`;
}

export function useOrderbookStream(): {
    entries: StreamEntries;
    connectionState: ConnectionState;
} {
    const [entries, setEntries] = useState<StreamEntries>(new Map());
    const [connectionState, setConnectionState] =
        useState<ConnectionState>('connecting');
    const entriesRef = useRef<StreamEntries>(new Map());

    useEffect(() => {
        const source = new EventSource('/api/stream');

        source.onopen = () => setConnectionState('open');
        // EventSource auto-reconnects on error; readyState flips back to
        // CONNECTING while it retries, which we surface as 'reconnecting'.
        source.onerror = () => setConnectionState('reconnecting');

        source.addEventListener('orderbook', (event) => {
            const snapshot = JSON.parse(
                (event as MessageEvent<string>).data
            ) as OrderbookSnapshot;
            const next = new Map(entriesRef.current);
            next.set(entryKey(snapshot), { snapshot, receivedAt: Date.now() });
            entriesRef.current = next;
            setEntries(next);
        });

        return () => source.close();
    }, []);

    return { entries, connectionState };
}
