// Kalshi's orderbook_snapshot/orderbook_delta WS dialect, isolated behind
// VenueOrderbookAdapter (00.architecture.mvp1.md §4.0). This is the ONLY
// file in prod-kalshi-ws-ts allowed to reference `msg.channel`,
// `orderbook_snapshot`, `orderbook_delta` — the reconstructor stays
// venue-neutral.

import type {
    BookEvent,
    PriceLevel,
    VenueOrderbookAdapter,
} from './venue-orderbook-adapter';
import { RECEIPT_TIME_UNTIL_U12 } from '../use-ws/receipt-time';

function toPriceLevels(levels: unknown): PriceLevel[] {
    if (!Array.isArray(levels)) return [];
    return levels.flatMap((entry) => {
        if (!Array.isArray(entry) || entry.length < 2) return [];
        const [price, qty] = entry;
        if (price == null || qty == null) return [];
        return [{ price: String(price), qty: String(qty) }];
    });
}

export function createKalshiOrderbookAdapter(): VenueOrderbookAdapter {
    return {
        venue: 'kalshi',
        toBookEvent(raw: Record<string, unknown>): BookEvent | null {
            const channel = raw.channel as string | undefined;
            const kind =
                channel === 'orderbook_snapshot'
                    ? 'snapshot'
                    : channel === 'orderbook_delta'
                      ? 'delta'
                      : null;
            if (!kind) return null;

            const ticker = String(raw.market_ticker ?? raw.ticker ?? '');
            if (!ticker) return null;

            const seqRaw = raw.sequence_number;
            const venueSeq = typeof seqRaw === 'number' ? seqRaw : null;

            return {
                kind,
                ticker,
                venueSeq,
                // See ../use-ws/receipt-time.ts — §3.7 rule 5 exception,
                // U16 ①. Whole Kalshi venue is on receipt time until U12.
                timeMs: RECEIPT_TIME_UNTIL_U12(),
                bids: toPriceLevels(raw.bids),
                asks: toPriceLevels(raw.asks),
            };
        },
    };
}
