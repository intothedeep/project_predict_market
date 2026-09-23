/**
 * `stale_threshold_ms` derivation (00.architecture.mvp1.md §3.5.2, U18).
 *
 * The server decides the threshold and publishes it in the response — the
 * client only knows an age, never the writer's cadence, so the boundary
 * that produces `stale_ms` is the only one that can also say what counts
 * as stale.
 *
 *     stale_threshold_ms = max(3 * observed normal update interval, 5000)
 *
 * - 3x: survives one missed update cycle without flipping to stale, but
 *   still catches a dead writer quickly.
 * - 5000ms floor: keeps the badge from flickering on jitter once the
 *   interval gets short.
 *
 * `NORMAL_UPDATE_INTERVAL_MS` is measured against the running mock stack
 * (U18): polling `/api/orderbook/kalshi/...` and timing `seq` transitions
 * gives ~400ms per ticker (mocks/pred-orderbook.mock.jsonl replays 3 lines
 * per ticker, 6 lines total, MOCK_REPLAY_INTERVAL_MS=200ms between ticks —
 * 2 tickers alternate every tick, so each ticker advances every other
 * tick: 400ms). This is well under the 5000ms floor, so the floor decides
 * the current value, not the 3x term. Re-derive this constant if the
 * writer's cadence changes (e.g. MOCK_REPLAY_INTERVAL_MS, or a real feed
 * with different pacing) — do not just edit the number below without
 * re-measuring.
 */
const NORMAL_UPDATE_INTERVAL_MS = 400;

export const STALE_THRESHOLD_MS = Math.max(
    3 * NORMAL_UPDATE_INTERVAL_MS,
    5000
);
