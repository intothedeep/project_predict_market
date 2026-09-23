// Venue-neutral orderbook reconstruction (00.architecture.mvp1.md §4.0/§4.1).
// Reads BookEvent only — no exchange-dialect field/channel literals here;
// those stay isolated inside the adapter
// (../adapters/kalshi-orderbook.adapter.ts). Reconstruction stays in the
// producer because seq-gap recovery needs reconnect(), which only the
// producer holding the WS socket can call (§4.1).

import { log, orderbookKey } from '@repo/common';
import { routePublish } from '@repo/db';
import { KAFKA_TOPICS } from '@repo/kalshi-core';
import type {
    BookEvent,
    PriceLevel,
    VenueOrderbookAdapter,
} from '../adapters/venue-orderbook-adapter';

interface BookState {
    // price -> qty, both as wire strings (§3.5 — price/qty stay strings end
    // to end).
    bids: Map<string, string>;
    asks: Map<string, string>;
    // Last venue-supplied sequence seen, for gap detection only (§4.0.1).
    // Undefined when the venue has never supplied one for this ticker.
    lastVenueSeq?: number;
}

const BOOK_TTL_MS = 10 * 60 * 1_000; // 10 minutes
const TTL_CHECK_INTERVAL_MS = 60 * 1_000; // 60 seconds

function isZero(qty: string): boolean {
    return qty === '0' || Number(qty) === 0;
}

function applyLevels(
    side: Map<string, string>,
    levels: PriceLevel[],
    isSnapshot: boolean
): void {
    if (isSnapshot) side.clear();
    for (const { price, qty } of levels) {
        if (isZero(qty)) {
            side.delete(price);
        } else {
            side.set(price, qty);
        }
    }
}

function toWireLevels(side: Map<string, string>): PriceLevel[] {
    return Array.from(side.entries()).map(([price, qty]) => ({ price, qty }));
}

export function createOrderbookReconstructor(adapter: VenueOrderbookAdapter): {
    handle: (raw: Record<string, unknown>, reconnect: () => void) => void;
    stop: () => void;
} {
    const books = new Map<string, { state: BookState; lastUpdateMs: number }>();
    // emitSeq: a per-(venue, ticker) monotonic counter the reconstructor
    // always assigns itself (§4.0.1) — this is row identity for
    // orderbookKey, ONLY. It is never used for gap detection: it is
    // contiguous by construction (we assign it), so comparing it to itself
    // could never observe a gap. Keyed by ticker only: one reconstructor
    // instance already exists per venue (this file), so ticker alone is
    // unambiguous within it.
    const emitSeqCounters = new Map<string, number>();
    // Tracks which tickers have already produced the one-time "no venueSeq"
    // warning below, so a long-running subscription doesn't repeat it per
    // message (§4.0.1: once per (venue, ticker), at first sight).
    const warnedNoVenueSeq = new Set<string>();
    let ttlTimer: ReturnType<typeof setInterval> | null = null;

    ttlTimer = setInterval(() => {
        const now = Date.now();
        for (const [ticker, entry] of books.entries()) {
            if (now - entry.lastUpdateMs > BOOK_TTL_MS) {
                books.delete(ticker);
                emitSeqCounters.delete(ticker);
                warnedNoVenueSeq.delete(ticker);
            }
        }
    }, TTL_CHECK_INTERVAL_MS);

    function getOrCreateBook(ticker: string): BookState {
        let entry = books.get(ticker);
        if (!entry) {
            entry = {
                state: { bids: new Map(), asks: new Map() },
                lastUpdateMs: Date.now(),
            };
            books.set(ticker, entry);
        }
        entry.lastUpdateMs = Date.now();
        return entry.state;
    }

    function nextEmitSeq(ticker: string): number {
        const n = (emitSeqCounters.get(ticker) ?? 0) + 1;
        emitSeqCounters.set(ticker, n);
        return n;
    }

    // §4.0.1 — a venue with no sequence has no gap detection and MUST
    // declare a fallback in the adapter's gapPolicy (MVP3 scope, not built
    // here). Until then this warns once per ticker so the absence of
    // protection is visible instead of silently passing.
    function warnIfNoGapDetection(ticker: string): void {
        if (warnedNoVenueSeq.has(ticker)) return;
        warnedNoVenueSeq.add(ticker);
        log(
            'warn',
            'orderbook-reconstructor',
            `${adapter.venue}:${ticker} has no venueSeq — gap detection is disabled for this ticker (§4.0.1)`
        );
    }

    function publishRawEvent(event: BookEvent, seq: number): void {
        const idempotencyKey = orderbookKey(adapter.venue, event.ticker, seq);
        routePublish(KAFKA_TOPICS.ws.ORDERBOOK_DELTA_WS, idempotencyKey, {
            venue: adapter.venue,
            ticker: event.ticker,
            bids: event.bids,
            asks: event.asks,
            seq,
            type: event.kind,
            event_time_ms: event.timeMs,
            idempotencyKey,
        });
    }

    function publishFullBook(
        ticker: string,
        book: BookState,
        seq: number,
        timeMs: number
    ): void {
        const idempotencyKey = orderbookKey(adapter.venue, ticker, seq);
        routePublish(KAFKA_TOPICS.ws.ORDERBOOK_WS, idempotencyKey, {
            venue: adapter.venue,
            ticker,
            bids: toWireLevels(book.bids),
            asks: toWireLevels(book.asks),
            seq,
            event_time_ms: timeMs,
            idempotencyKey,
        });
    }

    return {
        handle: (raw: Record<string, unknown>, reconnect: () => void) => {
            const event = adapter.toBookEvent(raw);
            if (!event) return;

            const book = getOrCreateBook(event.ticker);

            if (event.venueSeq == null) {
                warnIfNoGapDetection(event.ticker);
            }

            if (event.kind === 'snapshot') {
                applyLevels(book.bids, event.bids, true);
                applyLevels(book.asks, event.asks, true);
                book.lastVenueSeq = event.venueSeq ?? undefined;
                const emitSeq = nextEmitSeq(event.ticker);

                publishRawEvent(event, emitSeq);
                publishFullBook(event.ticker, book, emitSeq, event.timeMs);
                return;
            }

            // delta — gap detection (①) uses venueSeq exclusively; row
            // identity (②) uses emitSeq exclusively. They are never mixed
            // (§4.0.1).
            if (event.venueSeq != null) {
                const currentVenueSeq = book.lastVenueSeq ?? 0;
                if (event.venueSeq > currentVenueSeq + 1) {
                    log(
                        'warn',
                        'orderbook-reconstructor',
                        `sequence gap detected for ${adapter.venue}:${event.ticker}: expected ${currentVenueSeq + 1}, got ${event.venueSeq}`
                    );
                    reconnect();
                    return;
                }
                book.lastVenueSeq = event.venueSeq;
            }

            const emitSeq = nextEmitSeq(event.ticker);
            applyLevels(book.bids, event.bids, false);
            applyLevels(book.asks, event.asks, false);

            publishRawEvent(event, emitSeq);
            publishFullBook(event.ticker, book, emitSeq, event.timeMs);
        },
        stop: () => {
            if (ttlTimer) {
                clearInterval(ttlTimer);
                ttlTimer = null;
            }
            books.clear();
            emitSeqCounters.clear();
            warnedNoVenueSeq.clear();
        },
    };
}
