/**
 * Binance Stream URL Builder
 * ==========================
 * Constructs combined-stream URL with trade and ticker subscriptions.
 * No @depth — Q2 closed: no crypto orderbook collection in MVP1
 * (parse-orderbook.ws.ts has no sink and is not ported, §7).
 */

import { WS_URL } from '../config';

/**
 * Builds a Binance combined-stream URL from a list of coin symbols.
 * Subscribes to @trade and @miniTicker for each coin.
 */
export function buildStreamUrl(coins: string[]): string {
    const streams = coins.flatMap((s) => [`${s}@trade`, `${s}@miniTicker`]);
    return `${WS_URL}?streams=${streams.join('/')}`;
}
