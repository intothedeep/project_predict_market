/**
 * mockSource — replays a `.jsonl` mock file as if it were the
 * `pred.orderbook.ws` topic (§4.5). Each line is byte-for-byte the same as
 * what a producer would put on the wire (§3.6), so decoding it is exactly
 * @repo/schema's PROTO_DECODERS — no mock-specific parsing.
 *
 * Loops the file indefinitely at `intervalMs` so the writer keeps running
 * (heartbeat stays fresh) past a single pass, matching "replay like
 * real-time" (§4.5).
 *
 * §4.5.1 (U17): a non-rebasing loop re-sends the SAME snapshot for the same
 * ticker on every pass, which the §4.4 LWW guard correctly rejects as stale
 * — Redis freezes after pass 1. The fix is not to loosen the guard; it is to
 * make each pass represent genuinely new events. Pass n advances both
 * `time_ms` and `seq` together by `n * passSpanMs` / `n * seqSpan`, so the
 * relative spacing within the file is preserved and `orderbookKey` (which is
 * `seq`-keyed, §4.4) produces a fresh value every pass. Advancing `time_ms`
 * alone would re-emit the same `idempotency_key` under a different
 * `time_ms` — the one dedup hole §5.4 names — so both move together, never
 * one without the other.
 */

import { readFileSync } from 'node:fs';
import { PROTO_DECODERS } from '@repo/schema';
import { log, orderbookKey } from '@repo/common';
import type { DecodedOrderbook, MessageSource } from './message-source';

const TOPIC = 'pred.orderbook.ws';
const SERVICE = 'orderbook-writer';
const encoder = new TextEncoder();

function readLines(filePath: string): string[] {
    const lines = readFileSync(filePath, 'utf-8')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    if (lines.length === 0) {
        throw new Error(`mockSource: file has no lines: ${filePath}`);
    }
    return lines;
}

/**
 * Decode every line once at load (not per tick) so the pass-offset math
 * below has the file's raw time_ms/seq range up front.
 */
function decodeAll(filePath: string, lines: string[]): DecodedOrderbook[] {
    const decode = PROTO_DECODERS[TOPIC];
    return lines.map((line) => {
        const decoded = decode(encoder.encode(line)) as unknown as DecodedOrderbook;
        if (decoded.seq === undefined) {
            throw new Error(
                `mockSource: ${TOPIC} line missing seq, required for pass offsets (§4.5.1): ${filePath}: ${line}`
            );
        }
        return decoded;
    });
}

export function createMockSource(
    filePath: string,
    intervalMs: number
): MessageSource {
    const lines = readLines(filePath);
    const baseMessages = decodeAll(filePath, lines);

    const timeValues = baseMessages.map((m) => m.timeMs);
    const seqValues = baseMessages.map((m) => m.seq as bigint);
    const minTimeMs = timeValues.reduce((a, b) => (b < a ? b : a));
    const maxTimeMs = timeValues.reduce((a, b) => (b > a ? b : a));
    const minSeq = seqValues.reduce((a, b) => (b < a ? b : a));
    const maxSeq = seqValues.reduce((a, b) => (b > a ? b : a));

    // Rate-aligned span: one pass takes `lines.length * intervalMs` of
    // wall-clock replay time, so simulated time advances at the same rate
    // real time does — otherwise stale_ms would drift upward pass over pass.
    const passSpanMs = BigInt(lines.length) * BigInt(intervalMs);
    const inFileSpanMs = maxTimeMs - minTimeMs;
    if (passSpanMs <= inFileSpanMs) {
        throw new Error(
            `mockSource: passSpanMs (${passSpanMs}) must exceed the file's own time_ms span (${inFileSpanMs}) or pass n+1 would not be strictly newer than pass n for ${filePath} — increase MOCK_REPLAY_INTERVAL_MS or shorten the file`
        );
    }
    const seqSpan = maxSeq - minSeq + 1n;

    // Anchor the starting pass so replay begins close to "now" instead of
    // wherever the file's own generation-time timestamps happen to sit
    // (§4.5.1 + §3.6 anchor). Using maxTimeMs (not minTimeMs) keeps every
    // emitted time_ms <= now, so stale_ms starts small and non-negative.
    const nowMs = BigInt(Date.now());
    const diffMs = nowMs - maxTimeMs;
    const n0 = diffMs > 0n ? diffMs / passSpanMs : 0n;

    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    return {
        async subscribe(topic, onMessage) {
            if (topic !== TOPIC) {
                throw new Error(
                    `mockSource only serves ${TOPIC}, got: ${topic}`
                );
            }

            // Absolute-timeline scheduling (fixes the drift a re-armed
            // setTimeout(tick, intervalMs) accumulates from per-tick
            // processing latency — U18's +138ms/min). `origin` is the fixed
            // anchor; tick `index`'s due time is always `origin +
            // index * intervalMs`, so each setTimeout delay is computed
            // against wall clock, not chained after the previous tick's
            // work.
            //
            // Catch-up policy: if the event loop falls behind by a full
            // interval or more, `index` jumps forward to the interval that
            // is due *now* rather than firing the missed ticks back-to-back.
            // A burst would only emit already-past time_ms values, which the
            // §4.4 LWW guard would reject anyway — bursting buys nothing and
            // costs a synchronous pile-up. `index` only ever moves forward
            // (never re-set backward), so seq/time_ms stay monotonic and
            // orderbookKey stays fresh per emission.
            const origin = Date.now();
            let index = 0;

            const tick = (): void => {
                if (stopped) return;

                const expectedIndex = Math.floor(
                    (Date.now() - origin) / intervalMs
                );
                if (expectedIndex > index) index = expectedIndex;

                const i = index % lines.length;
                const passNumber = n0 + BigInt(Math.floor(index / lines.length));
                index += 1;

                try {
                    const base = baseMessages[i];
                    const timeMs = base.timeMs + passNumber * passSpanMs;
                    const seq = (base.seq as bigint) + passNumber * seqSpan;
                    const idempotencyKey = orderbookKey(
                        base.venue,
                        base.ticker,
                        seq.toString()
                    );
                    onMessage({ ...base, timeMs, seq, idempotencyKey });
                } catch (err) {
                    log('error', SERVICE, 'mock line replay failed', {
                        err,
                        line: lines[i],
                    });
                }

                const nextDueMs = origin + index * intervalMs;
                const delay = Math.max(0, nextDueMs - Date.now());
                timer = setTimeout(tick, delay);
            };
            tick();
        },
        async close() {
            stopped = true;
            if (timer) clearTimeout(timer);
        },
    };
}
