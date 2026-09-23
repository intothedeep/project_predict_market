/**
 * OrderbookSnapshot (00.architecture.mvp1.md §3.5) — re-exported from
 * `@repo/schema`'s `view/`, the SSOT for this type (§3.5.1, U18). Both
 * `apps/api` and `apps/web` import it from there, so a field added on one
 * side is a type error on the other instead of a silent runtime drift —
 * see the U18 report for the deliberate-breakage proof.
 */

export type { OrderbookSnapshot, OrderbookLevel } from '@repo/schema';
