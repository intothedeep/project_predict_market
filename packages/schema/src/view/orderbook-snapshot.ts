/**
 * OrderbookSnapshot (00.architecture.mvp1.md §3.5) — the view model the
 * dashboard renders. This is a `view/` type: it derives from `PredOrderbook`
 * (the wire contract in `../proto` / `../generated`), it is NOT a separate
 * SSOT (§3.5.1, U10/U18).
 *
 * ONE-WAY IMPORT RULE (§3.5.1): `view/` may import the wire layer
 * (`../proto-codec`, `../generated/**`). The wire layer must NEVER import
 * `view/`. This encodes the derivation direction: a type that does not
 * derive from a proto message has no business living in `view/`. There is
 * no lint rule enforcing this mechanically yet (no eslint config exists in
 * this package) — it is enforced by this comment and by review only. See
 * the U18 report for a deliberate-breakage check of this gap.
 *
 * Derivation is mechanical where the generated types allow it without
 * getting noisy:
 *   - `OrderbookLevel` is `PriceLevel` minus `$typeName`/`$unknown` — those
 *     two are protobuf-es's `Message<T>` bookkeeping fields (required on
 *     `PriceLevel`, since it's a generated wire type) that never appear on
 *     the actual JSON response, so a bare `PriceLevel` alias would claim a
 *     field the wire JSON never carries (verified: `tsc` rejects a plain
 *     `{ price, qty }` literal against `PriceLevel` with "Property
 *     '$typeName' is missing" — see U18 report). `Omit`, not `Pick`, so a
 *     new field on `PriceLevel` still propagates automatically.
 *   - `ticker` / `venue` are `Pick<PredOrderbook, ...>` — if the wire
 *     message renames or retypes either field, this type fails to compile
 *     instead of silently drifting.
 * The rest is hand-written because the proto types don't survive the trip
 * unchanged: `time_ms`/`seq` are `bigint` on the wire (proto3 int64) but
 * `number` here (this is a JSON API response, not wire bytes), and `seq` is
 * `optional` on the wire but required once assembled into a snapshot.
 * `feed`, `stale_ms`, `stale_threshold_ms` have no wire counterpart at all
 * (§3.5.2) — they are computed at the API boundary, not derived from proto.
 */

import type { PredOrderbook } from '../generated/ts/pred_pb';
import type { PriceLevel } from '../generated/ts/common_pb';

export type OrderbookLevel = Omit<PriceLevel, '$typeName' | '$unknown'>;

export interface OrderbookSnapshot
    extends Pick<PredOrderbook, 'ticker' | 'venue'> {
    time_ms: number;
    seq: number;
    bids: OrderbookLevel[];
    asks: OrderbookLevel[];
    feed: 'mock' | 'live';
    stale_ms: number;
    stale_threshold_ms: number;
}
