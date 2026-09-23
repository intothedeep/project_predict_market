/**
 * The only place `snapshot.feed` is read (grep-checkable) — freshness stays
 * on the same rule for mock and real (§3.5/§3.6); this badge is the sole
 * place the distinction shows up.
 */

interface FeedBadgeProps {
    feed: 'mock' | 'live';
}

export function FeedBadge({ feed }: FeedBadgeProps) {
    const color =
        feed === 'mock' ? 'bg-signal-mock' : 'bg-signal-live';
    return (
        <span
            className={`inline-block px-2 py-0.5 text-xs uppercase text-primary-foreground ${color}`}
        >
            {feed}
        </span>
    );
}
