/**
 * Freshness — pure computation, no I/O (rules/development/code.md: domain
 * logic performs no side effects).
 *
 * §3.5 computes `stale_ms` server-side "now - time_ms" at the moment a
 * snapshot is built. But /api/stream only emits on change (U17) — once the
 * writer dies, no more events arrive, so the LAST `stale_ms` we received is
 * frozen at whatever it was at emit time forever. Re-deriving age purely
 * from the server's `stale_ms` field would make the EXIT demo's "kill the
 * writer, watch it go stale" undemonstrable (the number would just stop
 * moving, not grow).
 *
 * Fix: anchor `receivedAt` (browser clock) to the moment each snapshot
 * arrived, and add elapsed browser time to the server's `stale_ms` at
 * render time. This stays server-derived (no client/server clock skew is
 * introduced — `stale_ms` itself is never recomputed from `time_ms` here)
 * and is monotonic between events.
 */

import type { OrderbookSnapshot } from './types';

/** Same freshness rule for mock and real (§3.5/§3.6) — never reads `feed`. */
export function computeLiveStaleMs(
    snapshot: OrderbookSnapshot,
    receivedAt: number,
    nowMs: number
): number {
    return snapshot.stale_ms + Math.max(0, nowMs - receivedAt);
}

/**
 * §3.5.2 (U18): the threshold is server-decided and arrives on the
 * snapshot itself (`stale_threshold_ms`) — only the server knows the
 * writer's cadence the threshold derives from. The client no longer owns
 * a hardcoded cutoff; it just compares against what the server sent.
 */
export function isFresh(liveStaleMs: number, staleThresholdMs: number): boolean {
    return liveStaleMs < staleThresholdMs;
}
