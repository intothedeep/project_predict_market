import { isFresh } from '../freshness';

interface FreshnessBadgeProps {
    liveStaleMs: number;
    staleThresholdMs: number;
}

/** Always renders the numeric age next to the badge — the threshold never hides the raw number. */
export function FreshnessBadge({ liveStaleMs, staleThresholdMs }: FreshnessBadgeProps) {
    const fresh = isFresh(liveStaleMs, staleThresholdMs);
    const color = fresh ? 'bg-signal-fresh' : 'bg-signal-stale';
    const label = fresh ? 'fresh' : 'stale';
    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs uppercase text-primary-foreground ${color}`}
        >
            {label} {Math.round(liveStaleMs)}ms
        </span>
    );
}
