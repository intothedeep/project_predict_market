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
 * Threshold is not specified anywhere in the architecture (grepped — only
 * the field's existence is locked, not a cutoff). Measured against a live
 * healthy writer (`curl /api/orderbook/kalshi/...` every 1-3s): `stale_ms`
 * oscillates around 4.0-4.3s, not the ~1.2s the pass-span math alone would
 * suggest — the mock-source anchor is a one-time `floor(diffMs /
 * passSpanMs)` at writer startup (§4.5.1), so it holds a stable few-second
 * baseline offset rather than drifting. 10s gives margin above that
 * observed baseline without hiding real staleness — pending architect
 * confirmation, not a blocker.
 */
export const STALE_THRESHOLD_MS = 10000;

export function isFresh(liveStaleMs: number): boolean {
    return liveStaleMs < STALE_THRESHOLD_MS;
}
