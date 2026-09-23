import { computeLiveStaleMs } from '../freshness';
import type { OrderbookSnapshot } from '../types';
import { FeedBadge } from './FeedBadge';
import { FreshnessBadge } from './FreshnessBadge';
import { OrderbookTable } from './OrderbookTable';

interface OrderbookPanelProps {
    snapshot: OrderbookSnapshot;
    receivedAt: number;
    nowMs: number;
}

export function OrderbookPanel({
    snapshot,
    receivedAt,
    nowMs,
}: OrderbookPanelProps) {
    const liveStaleMs = computeLiveStaleMs(snapshot, receivedAt, nowMs);

    return (
        <div className="border border-border p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
                <span className="text-xs uppercase text-muted-foreground">
                    {snapshot.venue}
                </span>
                <FeedBadge feed={snapshot.feed} />
            </div>
            {/* 77-digit Polymarket CLOB token id lives here, not in a table
                column — break-all wraps it at character boundaries so it
                can never widen the price/qty grid below. */}
            <div className="break-all text-sm">{snapshot.ticker}</div>
            <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                    seq {snapshot.seq}
                </span>
                <FreshnessBadge
                    liveStaleMs={liveStaleMs}
                    staleThresholdMs={snapshot.stale_threshold_ms}
                />
            </div>
            <OrderbookTable bids={snapshot.bids} asks={snapshot.asks} />
        </div>
    );
}
