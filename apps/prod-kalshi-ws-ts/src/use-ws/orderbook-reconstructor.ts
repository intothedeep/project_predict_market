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
    lastSeq?: number;
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
    // Synthesizes a per-(venue, ticker) monotonic counter when the venue
    // gives no seq, so the wire's PredOrderbook.seq is always populated
    // (§4.4 "키 헬퍼의 '빈 성분 제거'는 버그다" — orderbookKey must never
    // receive a missing seq component). Keyed by ticker only: one
    // reconstructor instance already exists per venue (this file), so
    // ticker alone is unambiguous within it.
    const syntheticSeq = new Map<string, number>();
    let ttlTimer: ReturnType<typeof setInterval> | null = null;

    ttlTimer = setInterval(() => {
        const now = Date.now();
        for (const [ticker, entry] of books.entries()) {
            if (now - entry.lastUpdateMs > BOOK_TTL_MS) {
                books.delete(ticker);
                syntheticSeq.delete(ticker);
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

    function nextSyntheticSeq(ticker: string): number {
        const n = (syntheticSeq.get(ticker) ?? 0) + 1;
        syntheticSeq.set(ticker, n);
        return n;
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

            if (event.kind === 'snapshot') {
                applyLevels(book.bids, event.bids, true);
                applyLevels(book.asks, event.asks, true);
                const seq = event.seq ?? nextSyntheticSeq(event.ticker);
                book.lastSeq = seq;

                publishRawEvent(event, seq);
                publishFullBook(event.ticker, book, seq, event.timeMs);
                return;
            }

            // delta
            const currentSeq = book.lastSeq ?? 0;
            let seq: number;

            if (event.seq != null) {
                seq = event.seq;
                if (seq > currentSeq + 1) {
                    log(
                        'warn',
                        'orderbook-reconstructor',
                        `sequence gap detected for ${adapter.venue}:${event.ticker}: expected ${currentSeq + 1}, got ${seq}`
                    );
                    reconnect();
                    return;
                }
            } else {
                seq = nextSyntheticSeq(event.ticker);
            }

            book.lastSeq = seq;
            applyLevels(book.bids, event.bids, false);
            applyLevels(book.asks, event.asks, false);

            publishRawEvent(event, seq);
            publishFullBook(event.ticker, book, seq, event.timeMs);
        },
        stop: () => {
            if (ttlTimer) {
                clearInterval(ttlTimer);
                ttlTimer = null;
            }
            books.clear();
            syntheticSeq.clear();
        },
    };
}
